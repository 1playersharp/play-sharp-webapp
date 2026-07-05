import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import {
  createPitchScene,
  createPlayerMesh,
  createBallMesh,
  quadBezier,
  makeArcControl,
  animatePlayerStep,
  PITCH,
} from '../../rendering/PitchRenderer';
import useEliteStore from '../../engine/useEliteStore';
import EliteGameShell from '../../ui/EliteGameShell';
import EliteScoreCard from '../../ui/EliteScoreCard';
import EliteIntroCard from '../../ui/EliteIntroCard';
import PRESSING_SCENARIOS from '../../scenarios/pressingScenarios';
import { submitScore } from '@/services/api';
import { toast } from 'sonner';

const COLOR_HOME = 0xdc2626;
const COLOR_AWAY = 0x1c3aa6;
const COLOR_HIGHLIGHT = 0x2ead3c;

// The presser the user is directly controlling ("YOU") gets a clear orange tag.
const COLOR_YOU = 0xff6a00;
const COLOR_YOU_RING = 0xffa733;

// Escape-route arrow colors for the pressed opponent: where the pass would
// go, where the critical/target pass is, and the dribble-out alternative.
const ARROW_PASS_COLOR = 0x38bdf8;
const ARROW_TARGET_PASS_COLOR = 0xfacc15;
const ARROW_DRIBBLE_COLOR = 0xa3e635;

const SUCCESS_POINTS = 15;
const MISTIMED_POINTS = -5;
const MAX_POINTS_PER_ROUND = SUCCESS_POINTS;

// ---------- Standalone THREE helpers (no component state needed) ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToCss(num) {
  return '#' + num.toString(16).padStart(6, '0');
}

// Small floating label (e.g. "YOU", "CB", "DM") that always faces the camera.
function createLabelSprite(text, { bg = 'rgba(8,14,10,0.88)', fg = '#ffffff', accent = '#facc15' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bg;
  roundRect(ctx, 3, 3, canvas.width - 6, canvas.height - 6, 14);
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  roundRect(ctx, 3, 3, canvas.width - 6, canvas.height - 6, 14);
  ctx.stroke();

  ctx.fillStyle = fg;
  ctx.font = '700 40px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text || '', canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.7, 0.85, 1);
  sprite.position.set(0, 2.7, 0);
  sprite.renderOrder = 999;
  return sprite;
}

// Pulsing ground ring used to mark the "YOU" presser.
function createHighlightRing(color) {
  const geo = new THREE.RingGeometry(0.72, 1.0, 32);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.renderOrder = 1;
  return ring;
}

// Flat ground arrow. Direction/length are updated live via
// arrow.setDirection() / arrow.setLength() as the situation changes.
function createGroundArrow(start, end, color) {
  const dir = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const length = Math.max(0.5, dir.length());
  dir.normalize();
  const origin = new THREE.Vector3(start.x, 0.08, start.z);
  const headLength = Math.min(1.3, length * 0.3);
  const headWidth = headLength * 0.65;
  const arrow = new THREE.ArrowHelper(dir, origin, length, color, headLength, headWidth);
  arrow.line.material.transparent = true;
  arrow.line.material.opacity = 0.9;
  arrow.cone.material.transparent = true;
  arrow.cone.material.opacity = 0.95;
  arrow.renderOrder = 998;
  arrow.visible = false;
  return arrow;
}

// Forward-facing unit vector for a mesh, used to point the dribble-escape
// arrow in the direction that opponent is actually facing.
function getForwardDirection(mesh) {
  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyQuaternion(mesh.quaternion);
  dir.y = 0;
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
  return dir.normalize();
}

export default function PressingEliteGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const playerProfile = (location.state && location.state.playerProfile) || {};

  const containerRef = useRef(null);
  const handlesRef = useRef(null);
  const opponentRefs = useRef([]);
  const presserRefs = useRef([]);
  const ballRef = useRef(null);
  const indicatorRef = useRef(null);
  const flashRef = useRef(null);
  const passArrowRef = useRef(null);
  const targetPassArrowRef = useRef(null);
  const dribbleArrowRef = useRef(null);

  const phaseRef = useRef('intro');
  const passIndexRef = useRef(0);
  const passStartTimeRef = useRef(0);
  const passDurationRef = useRef(1000);
  const scenarioRef = useRef(null);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(performance.now());
  const sequenceTimeoutRef = useRef(null);
  const reactionsRef = useRef([]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState('intro');
  const [score, setScore] = useState(0);
  const [pressResult, setPressResult] = useState(null);
  const [finished, setFinished] = useState(null);
  const [flashColor, setFlashColor] = useState(null);
  // Pre-game brief. First-round pass sequence is deferred until the user
  // dismisses the intro.
  const [showIntro, setShowIntro] = useState(true);
  const pendingIntroRef = useRef(true);

  const totalRounds = PRESSING_SCENARIOS.length;

  const setPhaseBoth = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const clearSeqTimeout = () => {
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handles = createPitchScene({
      container,
      cameraPosition: [0, 38, 22],
      cameraTarget: [0, 0, 5],
      fov: 50,
    });
    handlesRef.current = handles;

    const ball = createBallMesh();
    handles.scene.add(ball);
    ballRef.current = ball;

    // Indicator: shrinking ring around target presser (optimal timing window)
    const ringMat = new THREE.MeshBasicMaterial({ color: COLOR_HIGHLIGHT, transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.0, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    ring.visible = false;
    handles.scene.add(ring);
    indicatorRef.current = ring;

    // Escape-route arrows for the opponent currently on the ball: the pass
    // they're about to make, the pass if it's the critical one to press, and
    // a dribble-out alternative. Created once, updated/hidden every frame.
    const passArrow = createGroundArrow(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), ARROW_PASS_COLOR);
    const targetPassArrow = createGroundArrow(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), ARROW_TARGET_PASS_COLOR);
    const dribbleArrow = createGroundArrow(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), ARROW_DRIBBLE_COLOR);
    handles.scene.add(passArrow);
    handles.scene.add(targetPassArrow);
    handles.scene.add(dribbleArrow);
    passArrowRef.current = passArrow;
    targetPassArrowRef.current = targetPassArrow;
    dribbleArrowRef.current = dribbleArrow;

    // Flash full-screen quad attached to camera
    const flashGeo = new THREE.PlaneGeometry(2, 2);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.frustumCulled = false;
    flash.renderOrder = 999;
    handles.camera.add(flash);
    flash.position.set(0, 0, -1);
    handles.scene.add(handles.camera);
    flashRef.current = flash;

    const onResize = () => handles.resize();
    window.addEventListener('resize', onResize);

    // Tapping anywhere on the pitch triggers the press, same action as
    // hitting SPACE — this is the only decision the user makes each round.
    const onSceneClick = () => {
      if (phaseRef.current === 'live') tryPress();
    };
    handles.renderer.domElement.addEventListener('click', onSceneClick);

    loadRound(0);

    const animate = (now) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      opponentRefs.current.forEach((entry) => animatePlayerStep(entry.mesh, false, dt));
      presserRefs.current.forEach((entry) => {
        const moving = entry.celebrating || (entry.moveTo && !entry.atTarget);
        if (entry.moveTo) {
          const m = entry.mesh.position;
          const dx = entry.moveTo[0] - m.x;
          const dz = entry.moveTo[1] - m.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.05) {
            const step = Math.min(dist, 5 * dt);
            m.x += (dx / dist) * step;
            m.z += (dz / dist) * step;
          } else {
            entry.atTarget = true;
          }
        }
        animatePlayerStep(entry.mesh, moving, dt);
        if (entry.celebrating) {
          const arms = entry.mesh.userData.arms;
          if (arms) {
            arms[0].rotation.x = -2.0;
            arms[1].rotation.x = -2.0;
          }
        }
        if (entry.ring) {
          const t = now * 0.004;
          const s = 1 + Math.sin(t) * 0.12;
          entry.ring.scale.set(s, s, 1);
        }
      });

      updateBall(now);
      updateIndicator(now);
      updateEscapeArrows(now);

      if (flashRef.current) {
        const m = flashRef.current.material;
        m.opacity = Math.max(0, m.opacity - dt * 1.4);
      }

      handles.renderer.render(handles.scene, handles.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearSeqTimeout();
      window.removeEventListener('resize', onResize);
      handles.renderer.domElement.removeEventListener('click', onSceneClick);
      [passArrow, targetPassArrow, dribbleArrow].forEach((arrow) => {
        arrow.line.geometry.dispose();
        arrow.line.material.dispose();
        arrow.cone.geometry.dispose();
        arrow.cone.material.dispose();
      });
      handles.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (phaseRef.current === 'live') tryPress();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryPress = () => {
    const scn = scenarioRef.current;
    if (!scn) return;
    const passIdx = passIndexRef.current;
    const elapsed = performance.now() - passStartTimeRef.current;
    const inPass = elapsed >= 0 && elapsed <= passDurationRef.current;
    let result;
    if (passIdx === scn.targetPassIndex && inPass) {
      const optimal = passDurationRef.current / 2;
      const accuracy = 1 - Math.min(1, Math.abs(elapsed - optimal) / (passDurationRef.current / 2));
      const points = SUCCESS_POINTS;
      setScore((s) => s + points);
      reactionsRef.current.push(Math.round(elapsed));
      result = {
        outcome: 'success',
        delta: points,
        accuracy,
      };
      onSuccess();
    } else {
      setScore((s) => Math.max(0, s + MISTIMED_POINTS));
      result = {
        outcome: 'mistimed',
        delta: MISTIMED_POINTS,
      };
      flash(0xf59e0b);
      setPressResult(result);
      setPhaseBoth('feedback');
      clearSeqTimeout();
    }
  };

  const onSuccess = () => {
    flash(0x2ead3c);
    const scn = scenarioRef.current;
    const presser = presserRefs.current[scn.targetPresserIndex];
    const ball = ballRef.current;
    if (presser && ball) {
      presser.moveTo = [ball.position.x, ball.position.z];
      presser.atTarget = false;
      presser.celebrating = false;
      setTimeout(() => {
        presserRefs.current.forEach((p) => { p.celebrating = true; });
      }, 700);
    }
    setPressResult({ outcome: 'success', delta: SUCCESS_POINTS });
    setPhaseBoth('feedback');
    clearSeqTimeout();
  };

  const flash = (color) => {
    if (!flashRef.current) return;
    const m = flashRef.current.material;
    m.color.setHex(color);
    m.opacity = 0.4;
    setFlashColor(color);
  };

  const updateIndicator = (now) => {
    const ring = indicatorRef.current;
    const scn = scenarioRef.current;
    if (!ring || !scn) return;
    const passIdx = passIndexRef.current;
    if (passIdx === scn.targetPassIndex && phaseRef.current === 'live') {
      const t = Math.min(1, Math.max(0, (now - passStartTimeRef.current) / passDurationRef.current));
      const presser = presserRefs.current[scn.targetPresserIndex];
      if (presser) {
        const inner = 0.5 + (1 - t) * 2.2;
        const outer = inner + 0.25;
        ring.geometry.dispose();
        ring.geometry = new THREE.RingGeometry(inner, outer, 48);
        ring.position.set(presser.mesh.position.x, 0.06, presser.mesh.position.z);
        ring.visible = true;
        const pulse = 0.6 + Math.sin(now / 80) * 0.25;
        ring.material.opacity = pulse;
      }
    } else {
      ring.visible = false;
      ring.material.opacity = 0;
    }
  };

  // Shows the pressed opponent's two escape routes: the pass they're
  // lining up (yellow if it's the critical pass to press, blue otherwise)
  // and a dribble-out alternative straight ahead of them.
  const updateEscapeArrows = (now) => {
    const scn = scenarioRef.current;
    const passArrow = passArrowRef.current;
    const targetPassArrow = targetPassArrowRef.current;
    const dribbleArrow = dribbleArrowRef.current;
    if (!scn || !passArrow || !targetPassArrow || !dribbleArrow) return;

    const passIdx = passIndexRef.current;
    const showArrows = phaseRef.current === 'live' && passIdx < scn.passSequence.length;
    if (!showArrows) {
      passArrow.visible = false;
      targetPassArrow.visible = false;
      dribbleArrow.visible = false;
      return;
    }

    const [fromIdx, toIdx] = scn.passSequence[passIdx];
    const from = opponentRefs.current[fromIdx];
    const to = opponentRefs.current[toIdx];
    if (!from || !to) {
      passArrow.visible = false;
      targetPassArrow.visible = false;
      dribbleArrow.visible = false;
      return;
    }

    const isCritical = passIdx === scn.targetPassIndex;
    const activeArrow = isCritical ? targetPassArrow : passArrow;
    const inactiveArrow = isCritical ? passArrow : targetPassArrow;
    inactiveArrow.visible = false;

    const start = from.mesh.position;
    const end = to.mesh.position;
    const dir = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
    const length = Math.max(0.5, dir.length());
    dir.normalize();
    activeArrow.position.set(start.x, 0.08, start.z);
    activeArrow.setDirection(dir);
    const headLength = Math.min(1.3, length * 0.3);
    activeArrow.setLength(length, headLength, headLength * 0.65);
    activeArrow.visible = true;
    if (isCritical) {
      const pulse = 0.7 + Math.sin(now / 90) * 0.25;
      activeArrow.line.material.opacity = pulse;
      activeArrow.cone.material.opacity = pulse;
    } else {
      activeArrow.line.material.opacity = 0.85;
      activeArrow.cone.material.opacity = 0.9;
    }

    const forward = getForwardDirection(from.mesh);
    const dribbleEnd = new THREE.Vector3(start.x, 0, start.z).addScaledVector(forward, 4);
    dribbleArrow.position.set(start.x, 0.08, start.z);
    dribbleArrow.setDirection(forward);
    dribbleArrow.setLength(4, 1.1, 0.75);
    dribbleArrow.visible = true;
  };

  const updateBall = (now) => {
    const scn = scenarioRef.current;
    const ball = ballRef.current;
    if (!ball || !scn) return;
    if (phaseRef.current === 'intro' || phaseRef.current === 'feedback' || phaseRef.current === 'done') return;
    const passIdx = passIndexRef.current;
    if (passIdx >= scn.passSequence.length) return;
    const [fromIdx, toIdx] = scn.passSequence[passIdx];
    const from = opponentRefs.current[fromIdx];
    const to = opponentRefs.current[toIdx];
    if (!from || !to) return;
    const t = Math.min(1, (now - passStartTimeRef.current) / passDurationRef.current);
    const start = new THREE.Vector3(from.mesh.position.x, 0.24, from.mesh.position.z);
    const end = new THREE.Vector3(to.mesh.position.x, 0.24, to.mesh.position.z);
    const control = makeArcControl(start, end, 1.0);
    ball.position.copy(quadBezier(start, control, end, t));
  };

  const clearActors = () => {
    const scene = handlesRef.current?.scene;
    if (!scene) return;
    const drop = (entry) => {
      scene.remove(entry.mesh);
      entry.mesh.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose && m.dispose();
          });
        }
      });
    };
    opponentRefs.current.forEach(drop);
    presserRefs.current.forEach(drop);
    opponentRefs.current = [];
    presserRefs.current = [];
  };

  const loadRound = (idx) => {
    clearActors();
    const scn = PRESSING_SCENARIOS[idx];
    scenarioRef.current = scn;
    if (!scn) return;
    setPressResult(null);
    passDurationRef.current = scn.passDurationMs;

    scn.opponents.forEach((op, i) => {
      const mesh = createPlayerMesh(COLOR_AWAY, { numberLabel: String(i + 1) });
      mesh.position.set(op.pos[0], 0, op.pos[2]);
      mesh.lookAt(0, 0, op.pos[2] - 1);
      handlesRef.current.scene.add(mesh);
      opponentRefs.current.push({ mesh });
    });

    scn.pressers.forEach((pr, i) => {
      const isYou = i === scn.targetPresserIndex;
      const mesh = createPlayerMesh(isYou ? COLOR_YOU : COLOR_HOME, { numberLabel: String(i + 1) });
      mesh.position.set(pr.pos[0], 0, pr.pos[2]);
      mesh.lookAt(0, 0, pr.pos[2] + 1);

      let ring = null;
      if (isYou) {
        ring = createHighlightRing(COLOR_YOU_RING);
        mesh.add(ring);
        mesh.add(createLabelSprite('YOU', { accent: hexToCss(COLOR_YOU_RING) }));
      } else {
        const positionLabel = pr.position || pr.role || pr.label || '';
        if (positionLabel) mesh.add(createLabelSprite(positionLabel));
      }

      handlesRef.current.scene.add(mesh);
      presserRefs.current.push({ mesh, moveTo: null, atTarget: true, celebrating: false, ring });
    });

    const first = scn.passSequence[0];
    const from = opponentRefs.current[first[0]];
    if (from) ballRef.current.position.set(from.mesh.position.x, 0.24, from.mesh.position.z);

    setPhaseBoth('intro');
    if (pendingIntroRef.current) return;
    beginSequence();
  };

  const beginSequence = () => {
    sequenceTimeoutRef.current = setTimeout(() => {
      passIndexRef.current = 0;
      passStartTimeRef.current = performance.now();
      setPhaseBoth('live');
      scheduleNextPass();
    }, 700);
  };

  const dismissIntro = () => {
    if (!pendingIntroRef.current) return;
    pendingIntroRef.current = false;
    setShowIntro(false);
    beginSequence();
  };

  const scheduleNextPass = () => {
    const scn = scenarioRef.current;
    sequenceTimeoutRef.current = setTimeout(() => {
      const nextIdx = passIndexRef.current + 1;
      if (nextIdx >= scn.passSequence.length) {
        // sequence ended without a press
        reactionsRef.current.push(scn.passSequence.length * scn.passDurationMs);
        setPressResult({ outcome: 'missed', delta: 0 });
        setPhaseBoth('feedback');
        return;
      }
      passIndexRef.current = nextIdx;
      passStartTimeRef.current = performance.now();
      scheduleNextPass();
    }, passDurationRef.current + 120);
  };

  const goNext = () => {
    clearSeqTimeout();
    const next = roundIdx + 1;
    if (next >= totalRounds) finalize();
    else {
      setRoundIdx(next);
      loadRound(next);
    }
  };

  const finalize = async () => {
    const arr = reactionsRef.current;
    const avgReaction = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const maxTotal = totalRounds * MAX_POINTS_PER_ROUND;
    const finalScore = Math.min(100, Math.max(0, Math.round((score / maxTotal) * 100)));
    setFinished({ score: finalScore, reactionTime: avgReaction });
    setPhaseBoth('done');

    try {
      useEliteStore.getState().setEliteResult('elite_pressing', { score: finalScore, reactionTime: avgReaction });
    } catch (e) { /* ignore */ }

    if (playerProfile.firstname) {
      try {
        await submitScore({
          firstname: playerProfile.firstname,
          lastname: playerProfile.lastname,
          club: playerProfile.club,
          age: playerProfile.age ?? null,
          position: playerProfile.position,
          gender: playerProfile.gender,
          gameType: 'elite_pressing',
          score: finalScore,
          reactionTime: avgReaction,
        });
        toast.success('Elite Pressing saved');
      } catch (err) {
        toast.error("Couldn't save elite pressing score");
      }
    }
  };

  const back = () => navigate('/demo', { state: { playerProfile } });
  const scn = scenarioRef.current;
  const cursorStyle = phase === 'live' ? 'pointer' : 'default';

  return (
    <EliteGameShell title="Pressing — ELITE 3D" subtitle={`Round ${Math.min(roundIdx + 1, totalRounds)} / ${totalRounds}`} onBack={back}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: cursorStyle }} />

      {phase !== 'done' && (
        <>
          <div style={hudTopLeft}>
            <div style={hudLabel}>SCORE</div>
            <div style={hudValue}>{score}</div>
          </div>
          <div style={hudTopRight}>
            <div style={hudLabel}>ROUND</div>
            <div style={hudValue}>{Math.min(roundIdx + 1, totalRounds)} / {totalRounds}</div>
          </div>

          <div style={promptWrap}>
            <div style={promptTitle}>{scn?.title}</div>
            <div style={promptText}>Watch the pattern. Tap the screen or press <strong>SPACE</strong> when the highlighted teammate is in position to intercept.</div>
            {phase === 'live' && (
              <div style={legendRow}>
                <div style={legendItem}>
                  <span style={{ ...legendDot, background: '#ff8a00' }} />
                  You
                </div>
                <div style={legendItem}>
                  <span style={{ ...legendSwatch, background: '#38bdf8' }} />
                  Pass path
                </div>
                <div style={legendItem}>
                  <span style={{ ...legendSwatch, background: '#facc15' }} />
                  Pass to press
                </div>
                <div style={legendItem}>
                  <span style={{ ...legendSwatch, background: '#a3e635' }} />
                  Dribble escape
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {phase === 'feedback' && pressResult && (
        <div style={feedbackWrap}>
          <div style={{
            ...feedbackCard,
            borderLeft: `4px solid ${pressResult.outcome === 'success' ? '#2ead3c' : '#f59e0b'}`,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: pressResult.outcome === 'success' ? '#2ead3c' : '#f59e0b', marginBottom: 8 }}>
              {pressResult.outcome === 'success'
                ? '✓ PRESS WON'
                : pressResult.outcome === 'mistimed'
                ? '△ TIGHTEN THE TIMING'
                : '△ TRIGGER NEXT TIME'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, lineHeight: 1.6 }}>
              {pressResult.outcome === 'success'
                ? 'Brilliant timing — your teammate intercepts and your team wins possession high up the pitch.'
                : pressResult.outcome === 'mistimed'
                ? 'A shade earlier or later next time — the sweet spot is when the ball is mid-flight and your teammate is stepping across the lane.'
                : 'Look for the shrinking arc — that is the window to trigger the press. Back your teammate to close the passing lane and go.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Round delta: {pressResult.delta >= 0 ? '+' : ''}{pressResult.delta}</div>
              <button onClick={goNext} style={nextBtn}>
                {roundIdx + 1 >= totalRounds ? 'Finish Session ›' : 'Next Round ›'}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && finished && (
        <div style={feedbackWrap}>
          <EliteScoreCard score={finished.score} reactionTime={finished.reactionTime} onBack={back} />
        </div>
      )}

      {showIntro && (
        <EliteIntroCard
          title="Pressing · ELITE"
          accent="#2ead3c"
          objective="Watch the opposition’s passing pattern. Trigger the press exactly when the highlighted teammate can intercept — too early or too late and possession slips."
          controls={[
            { keys: 'Space',   action: 'Trigger the press at the sharp moment' },
            { keys: 'Watch',   action: 'The shrinking green ring shows the intercept window' },
          ]}
          onStart={dismissIntro}
        />
      )}
    </EliteGameShell>
  );
}

const hudTopLeft = {
  position: 'absolute', top: 70, left: 20, color: '#fff',
  background: 'rgba(0,0,0,0.55)', padding: '8px 14px', borderRadius: 6,
  fontFamily: "'JetBrains Mono', monospace",
};
const hudTopRight = { ...hudTopLeft, left: 'auto', right: 20, textAlign: 'right' };
const hudLabel = { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.55)' };
const hudValue = { fontSize: 18, fontWeight: 800 };

const promptWrap = {
  position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.55)', padding: '10px 18px', borderRadius: 6,
  textAlign: 'center', color: '#fff', maxWidth: 560,
  fontFamily: "'JetBrains Mono', monospace",
};
const promptTitle = { fontSize: 11, letterSpacing: 2, color: '#facc15', marginBottom: 4 };
const promptText = { fontSize: 13, lineHeight: 1.5 };

const legendRow = {
  display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8,
  paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)',
};
const legendItem = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.7)',
};
const legendDot = {
  width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
};
const legendSwatch = {
  width: 16, height: 4, borderRadius: 2, display: 'inline-block',
};

const feedbackWrap = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 30, padding: 24,
};
const feedbackCard = {
  maxWidth: 480, width: '100%', background: '#080e0a', padding: '24px 28px',
  border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'JetBrains Mono', monospace",
};
const nextBtn = {
  padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
  color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: 1.4, fontSize: 12,
};