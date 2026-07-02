import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import {
  createPitchScene,
  createPlayerMesh,
  createBallMesh,
  quadBezier,
  makeArcControl,
  lerp,
  easeOutCubic,
  animatePlayerStep,
  PITCH,
} from '../../rendering/PitchRenderer';
import useEliteStore from '../../engine/useEliteStore';
import EliteGameShell from '../../ui/EliteGameShell';
import EliteScoreCard from '../../ui/EliteScoreCard';
import DECISION_SCENARIOS from '../../scenarios/decisionScenarios';
import { submitScore } from '@/services/api';
import { toast } from 'sonner';

const COLOR_HOME = 0xdc2626;
const COLOR_AWAY = 0x1c3aa6;
// The user-controlled carrier is a clear, unmistakable orange.
const COLOR_CARRIER = 0xff6a00;
const COLOR_CARRIER_RING = 0xffa733;

// Colors per decision type, used for both the guide arrows and the
// clickable on-pitch markers.
const ARROW_PASS_COLOR = 0x38bdf8;
const ARROW_SHOT_COLOR = 0xff3b30;
const ARROW_DRIBBLE_COLOR = 0xa3e635;
const ARROW_OTHER_COLOR = 0xd4d4d8;

function getTimeLimit(age) {
  const a = Number(age) || 0;
  if (!a || a < 11) return 5000;
  if (a < 14) return 4000;
  return 3000;
}

function pickOpponentCount(age) {
  const a = Number(age) || 0;
  if (!a || a < 11) return 2;
  if (a < 14) return 3;
  return 4;
}

const ROUND_BASE_POINTS = 10;
const SPEED_BONUS = 5;
const SPEED_BONUS_WINDOW_MS = 1500;

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

// Builds a small floating label (e.g. "CM", "1") that always faces the camera.
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
  ctx.font = '700 42px "JetBrains Mono", monospace';
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

// Pulsing ring placed under a player to highlight them (carrier / pass target).
function createHighlightRing(color) {
  const geo = new THREE.RingGeometry(0.72, 1.0, 32);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.renderOrder = 1;
  return ring;
}

// Flat ground arrow from `start` to `end`. Direction/length can be updated
// live every frame via arrow.setDirection()/arrow.setLength().
function createGroundArrow(start, end, color) {
  const dir = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const length = Math.max(0.5, dir.length());
  dir.normalize();
  const origin = new THREE.Vector3(start.x, 0.08, start.z);
  const headLength = Math.min(1.4, length * 0.3);
  const headWidth = headLength * 0.65;
  const arrow = new THREE.ArrowHelper(dir, origin, length, color, headLength, headWidth);
  arrow.line.material.transparent = true;
  arrow.line.material.opacity = 0.9;
  arrow.line.material.linewidth = 2;
  arrow.cone.material.transparent = true;
  arrow.cone.material.opacity = 0.95;
  arrow.renderOrder = 998;
  return arrow;
}

// A clickable on-pitch target: a glowing ring + an enlarged invisible hit-pad
// (for easy tapping) + a small key-number tag floating above it.
function createOptionMarker(option, color) {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.001 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.05;
  group.add(pad);

  const tag = createLabelSprite(option.key, { bg: 'rgba(0,0,0,0.72)', accent: hexToCss(color) });
  tag.scale.set(1.1, 0.55, 1);
  tag.position.set(0, 1.6, 0);
  group.add(tag);

  group.userData.clickOption = option;
  group.userData.ring = ring;
  group.renderOrder = 996;
  return group;
}

// Small forward-pointing chevron, parented to a player mesh, that lights up
// while that player is running so the direction of the run is visible.
function createRunArrowMesh(color = 0xffffff) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.05);
  shape.lineTo(-0.3, 0.35);
  shape.lineTo(-0.11, 0.35);
  shape.lineTo(-0.11, -0.25);
  shape.lineTo(0.11, -0.25);
  shape.lineTo(0.11, 0.35);
  shape.lineTo(0.3, 0.35);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  // Shape is drawn in local XY; rotating -90deg about X lays it flat on the
  // ground with its tip pointing toward local -Z (the mesh's facing/forward
  // direction after Object3D.lookAt).
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.05, -1.1);
  mesh.visible = false;
  mesh.renderOrder = 997;
  return mesh;
}

export default function DecisionEliteGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const playerProfile = (location.state && location.state.playerProfile) || {};
  const timeLimit = getTimeLimit(playerProfile.age);
  const oppLimit = pickOpponentCount(playerProfile.age);

  const containerRef = useRef(null);
  const handlesRef = useRef(null);
  const carrierRef = useRef(null);
  const teammateRefs = useRef(new Map());
  const opponentRefs = useRef(new Map());
  const ballRef = useRef(null);
  const guideArrowsRef = useRef([]); // [{ arrow, getEnd }]
  const optionMarkersRef = useRef([]); // shot / dribble / other markers
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const phaseRef = useRef('intro');
  const scenarioRef = useRef(null);
  const roundStartRef = useRef(0);
  const phaseTimeoutRef = useRef(null);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(performance.now());

  const ballStateRef = useRef({
    mode: 'idle',
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    control: new THREE.Vector3(),
    startTime: 0,
    duration: 800,
    onDone: null,
    followCarrier: true,
  });

  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState('intro');
  const [score, setScore] = useState(0);
  const [reactions, setReactions] = useState([]);
  const [pickedKey, setPickedKey] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [timeBar, setTimeBar] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(null);

  const totalRounds = DECISION_SCENARIOS.length;

  const setPhaseBoth = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const clearPhaseTimeout = () => {
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handles = createPitchScene({
      container,
      cameraPosition: [0, 28, 36],
      cameraTarget: [0, 0, 0],
      fov: 50,
    });
    handlesRef.current = handles;

    const ball = createBallMesh();
    handles.scene.add(ball);
    ballRef.current = ball;

    const onResize = () => handles.resize();
    window.addEventListener('resize', onResize);

    const onSceneClick = (e) => {
      const currentPhase = phaseRef.current;
      if (currentPhase === 'preview') {
        startLiveRound();
        return;
      }
      if (currentPhase !== 'live') return;

      const rect = handles.renderer.domElement.getBoundingClientRect();
      mouseRef.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(mouseRef.current, handles.camera);
      const hits = raycasterRef.current.intersectObjects(handles.scene.children, true);
      for (const hit of hits) {
        let o = hit.object;
        while (o) {
          if (o.userData && o.userData.clickOption) {
            handlePick(o.userData.clickOption);
            return;
          }
          o = o.parent;
        }
      }
    };
    handles.renderer.domElement.addEventListener('click', onSceneClick);

    loadRound(0);

    const animate = (now) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      teammateRefs.current.forEach((entry) => moveTowardTarget(entry, dt));
      opponentRefs.current.forEach((entry) => moveTowardTarget(entry, dt));
      if (carrierRef.current) moveTowardTarget(carrierRef.current, dt);

      const t = now * 0.004;
      const s = 1 + Math.sin(t) * 0.12;
      if (carrierRef.current?.ring) {
        carrierRef.current.ring.scale.set(s, s, 1);
      }
      teammateRefs.current.forEach((entry) => {
        if (entry.passRing) entry.passRing.scale.set(0.85 * s, 0.85 * s, 1);
      });
      optionMarkersRef.current.forEach((marker) => {
        if (marker.userData.ring) marker.userData.ring.scale.set(s, s, 1);
      });

      if (carrierRef.current && guideArrowsRef.current.length) {
        const origin = carrierRef.current.mesh.position;
        guideArrowsRef.current.forEach(({ arrow, getEnd }) => {
          const end = getEnd();
          const dir = new THREE.Vector3(end.x - origin.x, 0, end.z - origin.z);
          const length = Math.max(0.5, dir.length());
          dir.normalize();
          arrow.position.set(origin.x, 0.08, origin.z);
          arrow.setDirection(dir);
          const headLength = Math.min(1.4, length * 0.3);
          arrow.setLength(length, headLength, headLength * 0.65);
        });
      }

      updateBall(now);

      handles.renderer.render(handles.scene, handles.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearPhaseTimeout();
      window.removeEventListener('resize', onResize);
      handles.renderer.domElement.removeEventListener('click', onSceneClick);
      clearGuideVisuals();
      handles.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (phaseRef.current === 'preview' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        startLiveRound();
        return;
      }
      if (phaseRef.current !== 'live') return;
      const k = e.key;
      if (k === '1' || k === '2' || k === '3' || k === '4') {
        const opt = scenarioRef.current?.options[parseInt(k, 10) - 1];
        if (opt) handlePick(opt);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phaseRef.current !== 'live') return;
    let raf;
    const tick = () => {
      const elapsed = performance.now() - roundStartRef.current;
      const remaining = Math.max(0, 1 - elapsed / timeLimit);
      setTimeBar(remaining);
      if (remaining > 0 && phaseRef.current === 'live') {
        raf = requestAnimationFrame(tick);
      } else if (remaining <= 0 && phaseRef.current === 'live') {
        timeoutRound();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx]);

  const clearSceneActors = () => {
    const scene = handlesRef.current?.scene;
    if (!scene) return;
    const drop = (entry) => {
      scene.remove(entry.mesh);
      entry.mesh.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const materials = Array.isArray(o.material) ? o.material : [o.material];
          materials.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose && m.dispose();
          });
        }
      });
    };
    teammateRefs.current.forEach(drop);
    opponentRefs.current.forEach(drop);
    if (carrierRef.current) drop(carrierRef.current);
    teammateRefs.current.clear();
    opponentRefs.current.clear();
    carrierRef.current = null;
  };

  const clearGuideArrows = () => {
    const scene = handlesRef.current?.scene;
    guideArrowsRef.current.forEach(({ arrow }) => {
      if (scene) scene.remove(arrow);
      arrow.line.geometry.dispose();
      arrow.line.material.dispose();
      arrow.cone.geometry.dispose();
      arrow.cone.material.dispose();
    });
    guideArrowsRef.current = [];
  };

  const clearOptionMarkers = () => {
    const scene = handlesRef.current?.scene;
    optionMarkersRef.current.forEach((marker) => {
      if (scene) scene.remove(marker);
      marker.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose && m.dispose();
          });
        }
      });
    });
    optionMarkersRef.current = [];
  };

  const clearTeammatePassDecor = () => {
    teammateRefs.current.forEach((entry) => {
      if (entry.passRing) {
        entry.mesh.remove(entry.passRing);
        entry.passRing.geometry.dispose();
        entry.passRing.material.dispose();
        entry.passRing = null;
      }
      if (entry.optionTag) {
        entry.mesh.remove(entry.optionTag);
        entry.optionTag.material.map.dispose();
        entry.optionTag.material.dispose();
        entry.optionTag = null;
      }
      entry.mesh.userData.clickOption = null;
    });
  };

  const clearGuideVisuals = () => {
    clearGuideArrows();
    clearOptionMarkers();
    clearTeammatePassDecor();
  };

  // Builds everything the player can tap on the pitch for the current
  // scenario: pass options highlight + tag the teammate directly, shot and
  // dribble options get a marker at their target, anything else gets a
  // small marker fanned out in front of the carrier. Every option also gets
  // a live ground arrow from the carrier to its target.
  const applyOptionVisuals = (scn) => {
    clearGuideVisuals();
    const scene = handlesRef.current?.scene;
    if (!scene || !scn) return;

    const carrierPos = new THREE.Vector3(scn.carrier.pos[0], 0, scn.carrier.pos[2]);
    const arrows = [];
    const markers = [];

    scn.options.forEach((opt) => {
      if (opt.type === 'pass') {
        const tmEntry = teammateRefs.current.get(opt.targetId);
        if (!tmEntry) return;

        tmEntry.mesh.userData.clickOption = opt;

        const ring = createHighlightRing(ARROW_PASS_COLOR);
        ring.scale.set(0.85, 0.85, 1);
        tmEntry.mesh.add(ring);
        tmEntry.passRing = ring;

        const tag = createLabelSprite(opt.key, { bg: 'rgba(8,14,28,0.82)', accent: hexToCss(ARROW_PASS_COLOR) });
        tag.scale.set(1.1, 0.55, 1);
        tag.position.set(0, 3.6, 0);
        tmEntry.mesh.add(tag);
        tmEntry.optionTag = tag;

        const arrow = createGroundArrow(carrierPos, tmEntry.targetPos.clone(), ARROW_PASS_COLOR);
        scene.add(arrow);
        arrows.push({ arrow, getEnd: () => tmEntry.mesh.position });
      } else if (opt.type === 'shot' && opt.to) {
        const end = new THREE.Vector3(opt.to[0], 0, opt.to[2]);
        const marker = createOptionMarker(opt, ARROW_SHOT_COLOR);
        marker.position.copy(end);
        scene.add(marker);
        markers.push(marker);

        const arrow = createGroundArrow(carrierPos, end, ARROW_SHOT_COLOR);
        scene.add(arrow);
        arrows.push({ arrow, getEnd: () => end });
      } else if (opt.type === 'dribble' && opt.to) {
        const end = new THREE.Vector3(opt.to[0], 0, opt.to[2]);
        const marker = createOptionMarker(opt, ARROW_DRIBBLE_COLOR);
        marker.position.copy(end);
        scene.add(marker);
        markers.push(marker);

        const arrow = createGroundArrow(carrierPos, end, ARROW_DRIBBLE_COLOR);
        scene.add(arrow);
        arrows.push({ arrow, getEnd: () => end });
      }
    });

    // Anything that isn't a pass/shot/dribble (hold-up, shield, etc.) gets a
    // small marker fanned out just in front of the carrier.
    const otherOpts = scn.options.filter((o) => o.type !== 'pass' && o.type !== 'shot' && o.type !== 'dribble');
    otherOpts.forEach((opt, i) => {
      const offset = (i - (otherOpts.length - 1) / 2) * 1.6;
      const pos = new THREE.Vector3(carrierPos.x + offset, 0, carrierPos.z + 1.8);
      const marker = createOptionMarker(opt, ARROW_OTHER_COLOR);
      marker.position.copy(pos);
      scene.add(marker);
      markers.push(marker);
    });

    guideArrowsRef.current = arrows;
    optionMarkersRef.current = markers;
  };

  const buildActor = (entry) => {
    const { pos, color, label, positionLabel } = entry;
    const mesh = createPlayerMesh(color, { numberLabel: label });
    mesh.position.set(pos[0], 0, pos[2]);
    mesh.lookAt(0, 0, -PITCH.length);
    if (positionLabel) {
      mesh.add(createLabelSprite(positionLabel));
    }
    const runArrow = createRunArrowMesh(0xffffff);
    mesh.add(runArrow);
    handlesRef.current.scene.add(mesh);
    return {
      mesh,
      targetPos: new THREE.Vector3(pos[0], 0, pos[2]),
      speed: entry.speed ?? 3.5,
      moving: false,
      runArrow,
    };
  };

  const moveTowardTarget = (entry, dt) => {
    if (!entry || !entry.mesh) return;
    const { mesh, targetPos } = entry;
    const dx = targetPos.x - mesh.position.x;
    const dz = targetPos.z - mesh.position.z;
    const dist = Math.hypot(dx, dz);
    let moving = false;
    if (dist > 0.05) {
      const step = Math.min(dist, (entry.speed ?? 3.5) * dt);
      const nx = dx / dist;
      const nz = dz / dist;
      mesh.position.x += nx * step;
      mesh.position.z += nz * step;
      const lookAtZ = mesh.position.z + nz;
      const lookAtX = mesh.position.x + nx;
      mesh.lookAt(lookAtX, mesh.position.y, lookAtZ);
      moving = true;
    }
    if (entry.runArrow) entry.runArrow.visible = moving;
    animatePlayerStep(mesh, moving, dt);
  };

  const updateBall = (now) => {
    const ball = ballRef.current;
    const state = ballStateRef.current;
    if (!ball) return;
    if (state.mode === 'idle') {
      if (state.followCarrier && carrierRef.current) {
        const p = carrierRef.current.mesh.position;
        ball.position.set(p.x + 0.35, 0.24, p.z + 0.15);
      }
      return;
    }
    if (state.mode === 'arc' || state.mode === 'ground') {
      const t = Math.min(1, (now - state.startTime) / state.duration);
      if (state.mode === 'arc') {
        const v = quadBezier(state.start, state.control, state.end, t);
        ball.position.copy(v);
      } else {
        ball.position.lerpVectors(state.start, state.end, t);
        ball.position.y = 0.24;
      }
      if (t >= 1) {
        state.mode = 'idle';
        const cb = state.onDone;
        state.onDone = null;
        if (cb) cb();
      }
    }
  };

  const setBallArc = (startVec, endVec, height, duration, onDone) => {
    const state = ballStateRef.current;
    state.followCarrier = false;
    state.mode = 'arc';
    state.start.copy(startVec);
    state.end.copy(endVec);
    state.control.copy(makeArcControl(startVec, endVec, height));
    state.startTime = performance.now();
    state.duration = duration;
    state.onDone = onDone;
  };

  const setBallGround = (startVec, endVec, duration, onDone) => {
    const state = ballStateRef.current;
    state.followCarrier = false;
    state.mode = 'ground';
    state.start.copy(startVec);
    state.end.copy(endVec);
    state.start.y = 0.24;
    state.end.y = 0.24;
    state.startTime = performance.now();
    state.duration = duration;
    state.onDone = onDone;
  };

  const handleBallReturnToCarrier = () => {
    const state = ballStateRef.current;
    state.followCarrier = true;
    state.mode = 'idle';
  };

  // Loads a round and pauses on a "preview" phase: actors are placed, the
  // carrier is highlighted, teammate position labels are shown, and every
  // option (pass/shot/dribble/other) gets a clickable on-pitch marker plus
  // a guide arrow from the carrier. Nothing moves and the clock does not
  // start until the user calls startLiveRound().
  const loadRound = (idx) => {
    clearSceneActors();
    clearGuideVisuals();
    const scn = DECISION_SCENARIOS[idx];
    scenarioRef.current = scn;
    if (!scn) return;

    const carrier = buildActor({
      pos: scn.carrier.pos,
      color: COLOR_CARRIER,
      label: 'YOU',
    });
    const ring = createHighlightRing(COLOR_CARRIER_RING);
    carrier.mesh.add(ring);
    carrier.ring = ring;
    handlesRef.current.scene.add(carrier.mesh);
    carrierRef.current = carrier;

    scn.teammates.forEach((tm) => {
      const a = buildActor({
        pos: tm.pos,
        color: COLOR_HOME,
        label: tm.label || '',
        positionLabel: tm.position || tm.role || tm.label || '',
      });
      teammateRefs.current.set(tm.id, { ...a, originalPos: [...tm.pos], targetPos: new THREE.Vector3(...tm.pos) });
    });

    const oppList = scn.opponents.slice(0, oppLimit);
    oppList.forEach((op, i) => {
      const a = buildActor({
        pos: op.pos,
        color: COLOR_AWAY,
        label: String(i + 1),
      });
      opponentRefs.current.set(op.id, { ...a, originalPos: [...op.pos], pressTarget: op.targetPos ? [...op.targetPos] : null });
    });

    handleBallReturnToCarrier();
    ballStateRef.current.followCarrier = true;
    ballStateRef.current.mode = 'idle';
    setPickedKey(null);
    setFeedback(null);
    setTimeBar(1);

    applyOptionVisuals(scn);
    setPhaseBoth('preview');
  };

  // Called when the user is ready (button, click, space, or enter): starts
  // the clock and releases teammates/opponents to begin their runs. Guide
  // arrows and markers stay live so the player can tap their choice.
  const startLiveRound = () => {
    if (phaseRef.current !== 'preview') return;
    roundStartRef.current = performance.now();
    setPhaseBoth('live');

    const scn = scenarioRef.current;
    if (!scn) return;
    setTimeout(() => {
      if (phaseRef.current !== 'live') return;
      scn.teammates.forEach((tm) => {
        if (!tm.targetPos) return;
        const entry = teammateRefs.current.get(tm.id);
        if (entry) entry.targetPos.set(tm.targetPos[0], 0, tm.targetPos[2]);
      });
      scn.opponents.slice(0, oppLimit).forEach((op) => {
        if (!op.targetPos) return;
        const entry = opponentRefs.current.get(op.id);
        if (entry) entry.targetPos.set(op.targetPos[0], 0, op.targetPos[2]);
      });
    }, 250);
  };

  const handlePick = (option) => {
    if (phaseRef.current !== 'live') return;
    const pickTimeMs = performance.now() - roundStartRef.current;
    setReactions((r) => [...r, Math.round(pickTimeMs)]);
    setPickedKey(option.key);
    setPhaseBoth('resolving');
    clearGuideVisuals();

    const scn = scenarioRef.current;
    const recommended = scn.options.find((o) => o.correct);
    const correct = option.correct;
    let earned = 0;
    if (correct) {
      earned = ROUND_BASE_POINTS;
      if (pickTimeMs <= SPEED_BONUS_WINDOW_MS) {
        const ratio = 1 - pickTimeMs / SPEED_BONUS_WINDOW_MS;
        earned += Math.round(SPEED_BONUS * Math.max(0, ratio));
      }
      setScore((s) => s + earned);
    }

    resolveOption(option, correct, () => {
      setFeedback({
        correct,
        picked: option,
        recommended,
        earned,
      });
      setPhaseBoth('feedback');
    });
  };

  const timeoutRound = () => {
    if (phaseRef.current !== 'live') return;
    setReactions((r) => [...r, timeLimit]);
    setPickedKey(null);
    setPhaseBoth('resolving');
    clearGuideVisuals();
    const scn = scenarioRef.current;
    const recommended = scn.options.find((o) => o.correct);
    resolveTackle(() => {
      setFeedback({
        correct: false,
        picked: { key: '–', label: 'No decision', rationale: 'You ran out of time. The press won the ball.' },
        recommended,
        earned: 0,
      });
      setPhaseBoth('feedback');
    });
  };

  const resolveOption = (option, correct, onDone) => {
    const scn = scenarioRef.current;
    const carrier = carrierRef.current;
    if (!carrier) { onDone(); return; }
    const start = new THREE.Vector3(carrier.mesh.position.x, 0.24, carrier.mesh.position.z);

    if (option.type === 'pass') {
      const tm = teammateRefs.current.get(option.targetId);
      if (!tm) { onDone(); return; }
      const target = correct
        ? tm.targetPos.clone()
        : findInterceptPoint(start, tm.targetPos);
      target.y = 0.24;
      setBallArc(start, target, 3.2, 750, () => {
        if (correct) {
          tm.targetPos.copy(target).setY(0);
          setTimeout(onDone, 600);
        } else {
          const opp = findClosestOpponent(target);
          if (opp) opp.targetPos.copy(target).setY(0);
          setTimeout(onDone, 600);
        }
      });
    } else if (option.type === 'dribble') {
      const end = new THREE.Vector3(option.to[0], 0, option.to[2]);
      carrier.targetPos.copy(end);
      if (correct) {
        ballStateRef.current.followCarrier = true;
        ballStateRef.current.mode = 'idle';
        setTimeout(onDone, 1100);
      } else {
        const opp = findClosestOpponent(end);
        if (opp) opp.targetPos.copy(end);
        setTimeout(onDone, 1100);
      }
    } else if (option.type === 'shot') {
      const goalPos = new THREE.Vector3(option.to[0], 0.24, option.to[2]);
      setBallArc(start, goalPos, 4.0, 900, () => setTimeout(onDone, 400));
    } else {
      if (correct) {
        setTimeout(onDone, 600);
      } else {
        resolveTackle(onDone);
      }
    }
  };

  const resolveTackle = (onDone) => {
    const carrier = carrierRef.current;
    if (!carrier) { onDone(); return; }
    const dropPoint = new THREE.Vector3(carrier.mesh.position.x, 0.24, carrier.mesh.position.z);
    const opp = findClosestOpponent(dropPoint);
    if (opp) opp.targetPos.set(dropPoint.x, 0, dropPoint.z);
    setTimeout(onDone, 1000);
  };

  const findClosestOpponent = (pos) => {
    let best = null;
    let bestD = Infinity;
    opponentRefs.current.forEach((entry) => {
      const d = Math.hypot(entry.mesh.position.x - pos.x, entry.mesh.position.z - pos.z);
      if (d < bestD) {
        bestD = d;
        best = entry;
      }
    });
    return best;
  };

  const findInterceptPoint = (from, to) => {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.55);
    let nearest = mid.clone();
    let bestD = Infinity;
    opponentRefs.current.forEach((entry) => {
      const op = entry.mesh.position;
      const d = Math.hypot(op.x - mid.x, op.z - mid.z);
      if (d < bestD) {
        bestD = d;
        nearest = new THREE.Vector3(op.x, 0, op.z);
      }
    });
    return new THREE.Vector3(
      lerp(mid.x, nearest.x, 0.5),
      0,
      lerp(mid.z, nearest.z, 0.5),
    );
  };

  const goNext = () => {
    clearPhaseTimeout();
    const next = roundIdx + 1;
    if (next >= totalRounds) {
      finalize();
    } else {
      setRoundIdx(next);
      loadRound(next);
    }
  };

  const finalize = async () => {
    const avgReaction = reactions.length
      ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)
      : null;
    const finalScore = Math.min(100, Math.round((score / (totalRounds * (ROUND_BASE_POINTS + SPEED_BONUS))) * 100));
    setFinished({ score: finalScore, reactionTime: avgReaction });
    setPhaseBoth('done');

    try {
      useEliteStore.getState().setEliteResult('elite_decision', { score: finalScore, reactionTime: avgReaction });
    } catch (e) { /* ignore */ }

    if (playerProfile.firstname) {
      setSubmitting(true);
      try {
        await submitScore({
          firstname: playerProfile.firstname,
          lastname: playerProfile.lastname,
          club: playerProfile.club,
          age: playerProfile.age ?? null,
          position: playerProfile.position,
          gender: playerProfile.gender,
          gameType: 'elite_decision',
          score: finalScore,
          reactionTime: avgReaction,
        });
        toast.success('Elite Decision saved');
      } catch (err) {
        toast.error("Couldn't save elite decision score");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const back = () => navigate('/demo', { state: { playerProfile } });
  const currentScenario = scenarioRef.current || DECISION_SCENARIOS[roundIdx];
  const cursorStyle = phase === 'live' || phase === 'preview' ? 'pointer' : 'default';

  return (
    <EliteGameShell title="Decision — ELITE 3D" subtitle={`Round ${Math.min(roundIdx + 1, totalRounds)} / ${totalRounds}`} onBack={back}>
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

          {(phase === 'live' || phase === 'resolving') && (
            <div style={timerWrap}>
              <div style={{ ...timerBar, width: `${Math.max(0, timeBar) * 100}%` }} />
            </div>
          )}

          <div style={promptWrap}>
            <div style={promptTitle}>{currentScenario?.title}</div>
            <div style={promptText}>{currentScenario?.prompt}</div>
            {phase === 'live' && (
              <div style={promptHint}>Tap a player or a marker on the pitch to decide</div>
            )}
          </div>
        </>
      )}

      {phase === 'preview' && currentScenario && (
        <div style={feedbackWrap}>
          <div style={previewCard}>
            <div style={previewBadge}>⚑ GET READY</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
              {currentScenario.title}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, marginBottom: 18 }}>
              {currentScenario.prompt}
            </div>
            <div style={legendRow}>
              <div style={legendItem}>
                <span style={{ ...legendDot, background: '#ff8a00' }} />
                You
              </div>
              <div style={legendItem}>
                <span style={{ ...legendSwatch, background: '#38bdf8' }} />
                Pass option
              </div>
              <div style={legendItem}>
                <span style={{ ...legendSwatch, background: '#ff3b30' }} />
                Shot option
              </div>
              <div style={legendItem}>
                <span style={{ ...legendSwatch, background: '#a3e635' }} />
                Dribble option
              </div>
            </div>
            <button onClick={startLiveRound} style={nextBtn}>
              I'm Ready ›
            </button>
          </div>
        </div>
      )}

      {feedback && phase === 'feedback' && (
        <div style={feedbackWrap}>
          <div style={{
            ...feedbackCard,
            borderLeft: `4px solid ${feedback.correct ? '#2ead3c' : '#f59e0b'}`,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: feedback.correct ? '#2ead3c' : '#f59e0b', marginBottom: 8 }}>
              {feedback.correct ? '✓ SHARP READ' : '△ EVEN BETTER'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
              Your call · {feedback.picked.key} — {feedback.picked.label}
            </div>
            <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.6, marginBottom: 14 }}>
              {feedback.picked.rationale}
            </div>
            {!feedback.correct && feedback.recommended && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#f59e0b', letterSpacing: 1.5, marginBottom: 4 }}>
                  Sharper option · {feedback.recommended.key} — {feedback.recommended.label}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
                  {feedback.recommended.rationale}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                {feedback.correct ? `+${feedback.earned} pts` : 'Round score locked'}
              </div>
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

const timerWrap = {
  position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
  width: 360, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden',
};
const timerBar = { height: '100%', background: 'linear-gradient(90deg, #facc15, #f97316)', transition: 'width 0.08s linear' };

const promptWrap = {
  position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.55)', padding: '10px 18px', borderRadius: 6,
  textAlign: 'center', color: '#fff', maxWidth: 520,
  fontFamily: "'JetBrains Mono', monospace",
};
const promptTitle = { fontSize: 11, letterSpacing: 2, color: '#facc15', marginBottom: 4 };
const promptText = { fontSize: 13, lineHeight: 1.5 };
const promptHint = { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, letterSpacing: 0.5 };

const feedbackWrap = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 30, padding: 24,
};
const feedbackCard = {
  maxWidth: 480, width: '100%', background: '#080e0a', padding: '24px 28px',
  border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'JetBrains Mono', monospace",
};
const previewCard = {
  ...feedbackCard,
  borderLeft: '4px solid #ff8a00',
  textAlign: 'left',
};
const previewBadge = {
  fontSize: 11, letterSpacing: 2, color: '#ffa733', marginBottom: 8, fontWeight: 800,
};
const legendRow = {
  display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 20,
  paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)',
};
const legendItem = {
  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.75)',
};
const legendDot = {
  width: 12, height: 12, borderRadius: '50%', display: 'inline-block',
};
const legendSwatch = {
  width: 18, height: 4, borderRadius: 2, display: 'inline-block',
};
const nextBtn = {
  padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
  color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: 1.4, fontSize: 12,
};