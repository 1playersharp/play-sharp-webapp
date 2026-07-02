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
import {
  ELITE_COLORS,
  createLabelSprite,
  createHighlightRing,
  createClickMarker,
  pickClickTarget,
  hexToCss,
} from '../../rendering/eliteVisualHelpers';
import useEliteStore from '../../engine/useEliteStore';
import EliteGameShell from '../../ui/EliteGameShell';
import EliteScoreCard from '../../ui/EliteScoreCard';
import MOVEMENT_SCENARIOS from '../../scenarios/movementScenarios';
import { submitScore } from '@/services/api';
import { toast } from 'sonner';

const PLAYER_RUN_SPEED = 5.2;
const PASSER_RELOCATE_SPEED = 4.8;

// Score weights per round (total 100).
const W_MOVE_IN = 30;
const W_PASS_CHOICE = 30;
const W_BREAKOUT = 30;
const W_TEMPO = 10;
const MAX_ROUND = W_MOVE_IN + W_PASS_CHOICE + W_BREAKOUT + W_TEMPO;
const TEMPO_TARGET_MS = 14000; // full tempo score at ≤ this; drops to 0 by ~24s
const TEMPO_CUTOFF_MS = 24000;

const COLOR_ZONE_NEUTRAL = 0x38bdf8;   // blue markers
const COLOR_PASS_TARGET = 0xa3e635;    // lime for pass receivers

// Utility: pick random element
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Shuffled indices for scenario order
function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MovementEliteGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const playerProfile = (location.state && location.state.playerProfile) || {};

  const containerRef = useRef(null);
  const handlesRef = useRef(null);
  const passerRef = useRef(null);
  const playerRef = useRef(null);
  const decoyRefs = useRef([]);   // teammates that show up at the pass step
  const opponentRefs = useRef([]); // opposition defenders
  const ballRef = useRef(null);
  const zoneMarkersRef = useRef([]);       // { group, zone }
  const passTargetMarkersRef = useRef([]); // { group, targetKind: 'passer'|'decoy', decoyId? }

  const phaseRef = useRef('intro');
  const scenarioRef = useRef(null);
  const roundIdxRef = useRef(0);
  const roundOrderRef = useRef([]);
  const relocationRef = useRef(null); // chosen relocation for the round
  const roundStartTsRef = useRef(0);
  const roundStateRef = useRef({
    moveInScore: 0,
    passScore: 0,
    breakoutScore: 0,
    moveInPicked: null,
    passPicked: null,
    breakoutPicked: null,
  });

  const clockRef = useRef(0);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(performance.now());
  const phaseTimeoutRef = useRef(null);

  const playerMotionRef = useRef({ active: false, target: null, arriveAt: null });
  const passerMotionRef = useRef({ active: false, target: null, arriveAt: null });
  const ballStateRef = useRef({
    mode: 'idle',
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    control: new THREE.Vector3(),
    startTime: 0,
    duration: 800,
    onDone: null,
    follow: 'passer', // 'passer' | 'player' | null
  });

  const [roundNumber, setRoundNumber] = useState(1);
  const [phase, setPhase] = useState('intro');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(null);
  const [hint, setHint] = useState('');

  const totalRounds = MOVEMENT_SCENARIOS.length;

  const setPhaseBoth = (p, hintText) => {
    phaseRef.current = p;
    setPhase(p);
    if (hintText !== undefined) setHint(hintText);
  };

  const clearPhaseTimeout = () => {
    if (phaseTimeoutRef.current) { clearTimeout(phaseTimeoutRef.current); phaseTimeoutRef.current = null; }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handles = createPitchScene({
      container,
      cameraPosition: [0, 32, 32],
      cameraTarget: [0, 0, 0],
      fov: 52,
    });
    handlesRef.current = handles;
    const ball = createBallMesh();
    handles.scene.add(ball);
    ballRef.current = ball;

    const onResize = () => handles.resize();
    window.addEventListener('resize', onResize);

    const onClick = (e) => {
      const activeMarkers = getActiveMarkerGroups();
      if (!activeMarkers.length) return;
      const hit = pickClickTarget(e, container, handles.camera, activeMarkers);
      if (hit && hit.userData.onClick) hit.userData.onClick();
    };
    container.addEventListener('click', onClick);
    container.addEventListener('touchend', onClick);

    roundOrderRef.current = shuffled(totalRounds);
    roundIdxRef.current = 0;
    loadRound();

    const animate = (now) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;
      clockRef.current += dt;

      stepPlayer(dt);
      stepPasser(dt);
      stepDecoys(dt);
      stepOpponents(dt);
      updateBall(now);
      pulseMarkers();

      handles.renderer.render(handles.scene, handles.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearPhaseTimeout();
      window.removeEventListener('resize', onResize);
      container.removeEventListener('click', onClick);
      container.removeEventListener('touchend', onClick);
      handles.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getActiveMarkerGroups = () => {
    const p = phaseRef.current;
    if (p === 'moveIn' || p === 'moveOut') return zoneMarkersRef.current.map((m) => m.group);
    if (p === 'passBack') return passTargetMarkersRef.current.map((m) => m.group);
    return [];
  };

  const stepPlayer = (dt) => {
    const p = playerRef.current;
    if (!p) return;
    const motion = playerMotionRef.current;
    const mesh = p.mesh;
    let moving = false;
    if (motion.active && motion.target) {
      const dx = motion.target.x - mesh.position.x;
      const dz = motion.target.z - mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        const step = Math.min(dist, PLAYER_RUN_SPEED * dt);
        const nx = dx / dist;
        const nz = dz / dist;
        mesh.position.x += nx * step;
        mesh.position.z += nz * step;
        mesh.lookAt(mesh.position.x + nx, 0, mesh.position.z + nz);
        moving = true;
      } else {
        motion.active = false;
        if (motion.onArrive) { const cb = motion.onArrive; motion.onArrive = null; cb(); }
      }
    }
    animatePlayerStep(mesh, moving, dt);
    if (p.ring) {
      p.ring.position.set(mesh.position.x, 0.03, mesh.position.z);
      p.ring.material.opacity = 0.55 + Math.sin(clockRef.current * 6) * 0.25;
    }
  };

  const stepPasser = (dt) => {
    const p = passerRef.current;
    if (!p) return;
    const motion = passerMotionRef.current;
    const mesh = p.mesh;
    let moving = false;
    if (motion.active && motion.target) {
      const dx = motion.target.x - mesh.position.x;
      const dz = motion.target.z - mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        const step = Math.min(dist, PASSER_RELOCATE_SPEED * dt);
        const nx = dx / dist;
        const nz = dz / dist;
        mesh.position.x += nx * step;
        mesh.position.z += nz * step;
        mesh.lookAt(mesh.position.x + nx, 0, mesh.position.z + nz);
        moving = true;
      } else {
        motion.active = false;
        if (motion.onArrive) { const cb = motion.onArrive; motion.onArrive = null; cb(); }
      }
    }
    animatePlayerStep(mesh, moving, dt);
  };

  const stepDecoys = (dt) => {
    decoyRefs.current.forEach((d) => animatePlayerStep(d.mesh, false, dt));
  };

  const stepOpponents = (dt) => {
    const ballPos = ballRef.current?.position;
    opponentRefs.current.forEach((o) => {
      if (ballPos) {
        // Face the ball, subtle idle
        o.mesh.lookAt(ballPos.x, 0, ballPos.z);
      }
      animatePlayerStep(o.mesh, false, dt);
    });
  };

  const updateBall = (now) => {
    const ball = ballRef.current;
    const state = ballStateRef.current;
    if (!ball) return;
    if (state.mode === 'arc') {
      const t = Math.min(1, (now - state.startTime) / state.duration);
      const v = quadBezier(state.start, state.control, state.end, t);
      ball.position.copy(v);
      if (t >= 1) {
        state.mode = 'idle';
        const cb = state.onDone;
        state.onDone = null;
        if (cb) cb();
      }
      return;
    }
    if (state.mode === 'ground') {
      const t = Math.min(1, (now - state.startTime) / state.duration);
      ball.position.lerpVectors(state.start, state.end, t);
      ball.position.y = 0.24;
      if (t >= 1) {
        state.mode = 'idle';
        const cb = state.onDone;
        state.onDone = null;
        if (cb) cb();
      }
      return;
    }
    // idle: follow current carrier
    if (state.follow === 'passer' && passerRef.current) {
      const p = passerRef.current.mesh.position;
      ball.position.set(p.x + 0.3, 0.24, p.z + 0.1);
    } else if (state.follow === 'player' && playerRef.current) {
      const p = playerRef.current.mesh.position;
      ball.position.set(p.x + 0.3, 0.24, p.z + 0.1);
    }
  };

  const pulseMarkers = () => {
    const t = clockRef.current * 4;
    zoneMarkersRef.current.forEach((m, i) => {
      const ring = m.group.userData.ring;
      if (ring) ring.material.opacity = 0.55 + Math.sin(t + i * 0.7) * 0.25;
    });
    passTargetMarkersRef.current.forEach((m, i) => {
      const ring = m.group.userData.ring;
      if (ring) ring.material.opacity = 0.55 + Math.sin(t + i * 0.9) * 0.3;
    });
  };

  const clearActors = () => {
    const scene = handlesRef.current?.scene;
    if (!scene) return;
    const drop = (entry) => {
      if (!entry) return;
      scene.remove(entry.mesh);
      entry.mesh.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose && m.dispose());
          else o.material.dispose && o.material.dispose();
        }
      });
      if (entry.ring) {
        scene.remove(entry.ring);
        entry.ring.geometry.dispose();
        entry.ring.material.dispose();
      }
      if (entry.tag) {
        scene.remove(entry.tag);
        if (entry.tag.material.map) entry.tag.material.map.dispose();
        entry.tag.material.dispose();
      }
    };
    drop(passerRef.current);
    drop(playerRef.current);
    decoyRefs.current.forEach(drop);
    decoyRefs.current = [];
    opponentRefs.current.forEach(drop);
    opponentRefs.current = [];
    clearZoneMarkers();
    clearPassTargetMarkers();
    passerRef.current = null;
    playerRef.current = null;
  };

  const clearZoneMarkers = () => {
    const scene = handlesRef.current?.scene;
    if (!scene) return;
    zoneMarkersRef.current.forEach((m) => {
      scene.remove(m.group);
      m.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((mm) => mm.dispose && mm.dispose());
          else o.material.dispose && o.material.dispose();
        }
      });
    });
    zoneMarkersRef.current = [];
  };

  const clearPassTargetMarkers = () => {
    const scene = handlesRef.current?.scene;
    if (!scene) return;
    passTargetMarkersRef.current.forEach((m) => {
      scene.remove(m.group);
      m.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((mm) => mm.dispose && mm.dispose());
          else o.material.dispose && o.material.dispose();
        }
      });
    });
    passTargetMarkersRef.current = [];
  };

  const buildActor = (pos, color, label, opts = {}) => {
    const mesh = createPlayerMesh(color, { numberLabel: label });
    mesh.position.set(pos[0], 0, pos[2]);
    mesh.lookAt(0, 0, pos[2] + 1);
    handlesRef.current.scene.add(mesh);
    const entry = { mesh };
    if (opts.ring) {
      const ring = createHighlightRing(opts.ring);
      ring.position.set(pos[0], 0.03, pos[2]);
      handlesRef.current.scene.add(ring);
      entry.ring = ring;
    }
    return entry;
  };

  const buildZoneMarker = (zone, onClick) => {
    const scene = handlesRef.current.scene;
    const marker = createClickMarker({ key: zone.id, color: COLOR_ZONE_NEUTRAL, onClick, radius: zone.size });
    marker.position.set(zone.pos[0], 0, zone.pos[2]);
    scene.add(marker);
    return { group: marker, zone };
  };

  const buildPassTargetMarker = (worldPos, key, onClick, targetKind, decoyId) => {
    const scene = handlesRef.current.scene;
    const marker = createClickMarker({ key, color: COLOR_PASS_TARGET, onClick, radius: 1.1 });
    marker.position.set(worldPos[0], 0, worldPos[2]);
    scene.add(marker);
    return { group: marker, targetKind, decoyId };
  };

  // ---------- Round lifecycle ----------

  const loadRound = () => {
    clearActors();
    clearPhaseTimeout();
    const scenarioIdx = roundOrderRef.current[roundIdxRef.current];
    const scn = MOVEMENT_SCENARIOS[scenarioIdx];
    scenarioRef.current = scn;
    setFeedback(null);
    roundStateRef.current = {
      moveInScore: 0, passScore: 0, breakoutScore: 0,
      moveInPicked: null, passPicked: null, breakoutPicked: null,
    };
    roundStartTsRef.current = performance.now();

    // Randomise passer relocation for this round
    relocationRef.current = pickRandom(scn.passerRelocations);

    // Build actors
    passerRef.current = buildActor(scn.passer.pos, ELITE_COLORS.neutralHome, scn.passer.label || 'P');
    playerRef.current = buildActor(scn.playerStart, ELITE_COLORS.you, 'YOU', { ring: ELITE_COLORS.youRing });

    // Opposition defenders
    (scn.opposition || []).forEach((op) => {
      const entry = buildActor(op.pos, ELITE_COLORS.away, op.label || 'D');
      opponentRefs.current.push(entry);
    });

    // Ball starts at passer
    ballStateRef.current.mode = 'idle';
    ballStateRef.current.follow = 'passer';

    // Enter moveIn step
    startMoveIn();

    setRoundNumber(roundIdxRef.current + 1);
  };

  const startMoveIn = () => {
    const scn = scenarioRef.current;
    // Spawn zone markers
    scn.step1Zones.forEach((zone) => {
      const m = buildZoneMarker(zone, () => onMoveInPick(zone));
      zoneMarkersRef.current.push(m);
    });
    setPhaseBoth('moveIn', 'Click a labelled space to show for the ball.');
  };

  const onMoveInPick = (zone) => {
    if (phaseRef.current !== 'moveIn') return;
    roundStateRef.current.moveInPicked = zone.id;
    roundStateRef.current.moveInScore = zone.correct ? 100 : 30;
    // Hide zone markers
    clearZoneMarkers();

    // Animate player to zone
    playerMotionRef.current.active = true;
    playerMotionRef.current.target = new THREE.Vector3(zone.pos[0], 0, zone.pos[2]);
    playerMotionRef.current.onArrive = () => triggerFirstPass();
    setPhaseBoth('moving1', 'Running into space…');
  };

  const triggerFirstPass = () => {
    // Ball flies from passer to player
    const from = passerRef.current.mesh.position;
    const to = playerRef.current.mesh.position;
    ballStateRef.current.mode = 'arc';
    ballStateRef.current.follow = null;
    ballStateRef.current.start.set(from.x, 0.24, from.z);
    ballStateRef.current.end.set(to.x, 0.24, to.z);
    ballStateRef.current.control.copy(makeArcControl(ballStateRef.current.start, ballStateRef.current.end, 1.4));
    ballStateRef.current.startTime = performance.now();
    ballStateRef.current.duration = 700;
    ballStateRef.current.onDone = () => {
      ballStateRef.current.follow = 'player';
      // Passer relocates while ball settles with player
      startPasserRelocation();
    };
    setPhaseBoth('receive1', 'Receive it — first touch.');
  };

  const startPasserRelocation = () => {
    const relo = relocationRef.current;
    passerMotionRef.current.active = true;
    passerMotionRef.current.target = new THREE.Vector3(relo.pos[0], 0, relo.pos[2]);
    passerMotionRef.current.onArrive = () => showReturnPassTargets();
    // Also show clickable targets slightly early (as passer nears) — spawn immediately for responsiveness
    phaseTimeoutRef.current = setTimeout(() => showReturnPassTargets(), 300);
    setPhaseBoth('passerMoving', 'Passer is relocating — get ready to feed him.');
  };

  const showReturnPassTargets = () => {
    if (phaseRef.current === 'passBack') return; // already showing
    // Spawn decoy teammates (if not already present)
    const scn = scenarioRef.current;
    if (!decoyRefs.current.length) {
      scn.decoys.forEach((d) => {
        const entry = buildActor(d.pos, ELITE_COLORS.home, d.label);
        entry.decoyId = d.id;
        decoyRefs.current.push(entry);
      });
    }
    // Passer marker uses the passer's LIVE position (may still be moving)
    // Attach an update loop for the passer marker so it tracks passer position
    clearPassTargetMarkers();
    const passerPos = passerRef.current.mesh.position;
    const passerMarker = buildPassTargetMarker(
      [passerPos.x, 0, passerPos.z],
      scenarioRef.current.passer.label || 'P',
      () => onReturnPassPick('passer'),
      'passer',
    );
    passerMarker.follow = 'passer';
    passTargetMarkersRef.current.push(passerMarker);
    scn.decoys.forEach((d) => {
      const decoy = decoyRefs.current.find((e) => e.decoyId === d.id);
      const p = decoy?.mesh.position || new THREE.Vector3(d.pos[0], 0, d.pos[2]);
      const m = buildPassTargetMarker([p.x, 0, p.z], d.label, () => onReturnPassPick('decoy', d.id), 'decoy', d.id);
      passTargetMarkersRef.current.push(m);
    });
    setPhaseBoth('passBack', 'Click a teammate to return the ball. Sharpest option = the passer at his new spot.');
    // Kick a tracker so the passer marker follows him while he's still moving
    trackPasserMarker();
  };

  const trackPasserMarker = () => {
    const passerMarker = passTargetMarkersRef.current.find((m) => m.follow === 'passer');
    if (!passerMarker) return;
    const tick = () => {
      if (phaseRef.current !== 'passBack') return;
      if (!passerRef.current) return;
      const p = passerRef.current.mesh.position;
      passerMarker.group.position.set(p.x, 0, p.z);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const onReturnPassPick = (kind, decoyId) => {
    if (phaseRef.current !== 'passBack') return;
    roundStateRef.current.passPicked = kind === 'passer' ? 'passer' : `decoy:${decoyId}`;
    roundStateRef.current.passScore = kind === 'passer' ? 100 : 25;
    clearPassTargetMarkers();

    // Ball flies from player to chosen receiver
    const from = playerRef.current.mesh.position;
    let to;
    if (kind === 'passer') {
      to = passerRef.current.mesh.position;
    } else {
      const decoy = decoyRefs.current.find((e) => e.decoyId === decoyId);
      to = decoy?.mesh.position || from;
    }
    ballStateRef.current.mode = 'arc';
    ballStateRef.current.follow = null;
    ballStateRef.current.start.set(from.x, 0.24, from.z);
    ballStateRef.current.end.set(to.x, 0.24, to.z);
    ballStateRef.current.control.copy(makeArcControl(ballStateRef.current.start, ballStateRef.current.end, 1.4));
    ballStateRef.current.startTime = performance.now();
    ballStateRef.current.duration = 700;
    ballStateRef.current.onDone = () => {
      // Whoever received it becomes the new holder
      ballStateRef.current.follow = kind === 'passer' ? 'passer' : null;
      // Give a brief pause, then trigger breakout step
      phaseTimeoutRef.current = setTimeout(() => startBreakout(), 350);
    };
    setPhaseBoth('passing1', 'Pass in flight…');
  };

  const startBreakout = () => {
    const scn = scenarioRef.current;
    // Spawn step3 zone markers
    scn.step3Zones.forEach((zone) => {
      const m = buildZoneMarker(zone, () => onBreakoutPick(zone));
      zoneMarkersRef.current.push(m);
    });
    setPhaseBoth('moveOut', 'Now break into space — click your run.');
  };

  const onBreakoutPick = (zone) => {
    if (phaseRef.current !== 'moveOut') return;
    const correctId = relocationRef.current?.breakoutCorrectId;
    roundStateRef.current.breakoutPicked = zone.id;
    roundStateRef.current.breakoutScore = zone.id === correctId ? 100 : 30;
    clearZoneMarkers();

    // Animate player to breakout zone
    playerMotionRef.current.active = true;
    playerMotionRef.current.target = new THREE.Vector3(zone.pos[0], 0, zone.pos[2]);
    playerMotionRef.current.onArrive = () => triggerBreakoutPass();
    setPhaseBoth('moving2', 'Breaking away…');
  };

  const triggerBreakoutPass = () => {
    // Whoever is holding the ball plays it into the zone
    const holder = ballStateRef.current.follow;
    const fromMesh = holder === 'passer' ? passerRef.current?.mesh : playerRef.current?.mesh;
    if (!fromMesh) { finishRound(); return; }
    const from = fromMesh.position;
    const to = playerRef.current.mesh.position;
    ballStateRef.current.mode = 'arc';
    ballStateRef.current.follow = null;
    ballStateRef.current.start.set(from.x, 0.24, from.z);
    ballStateRef.current.end.set(to.x, 0.24, to.z);
    ballStateRef.current.control.copy(makeArcControl(ballStateRef.current.start, ballStateRef.current.end, 1.8));
    ballStateRef.current.startTime = performance.now();
    ballStateRef.current.duration = 800;
    ballStateRef.current.onDone = () => {
      ballStateRef.current.follow = 'player';
      finishRound();
    };
    setPhaseBoth('receive2', 'Ball incoming…');
  };

  const finishRound = () => {
    const elapsed = performance.now() - roundStartTsRef.current;
    // Tempo score: full W_TEMPO at ≤ TEMPO_TARGET_MS, linear drop to 0 at TEMPO_CUTOFF_MS
    let tempoScore = 100;
    if (elapsed > TEMPO_TARGET_MS) {
      tempoScore = Math.max(0, 100 - ((elapsed - TEMPO_TARGET_MS) / (TEMPO_CUTOFF_MS - TEMPO_TARGET_MS)) * 100);
    }

    const rs = roundStateRef.current;
    const points = Math.round(
      (rs.moveInScore / 100) * W_MOVE_IN +
      (rs.passScore / 100) * W_PASS_CHOICE +
      (rs.breakoutScore / 100) * W_BREAKOUT +
      (tempoScore / 100) * W_TEMPO
    );
    setScore((s) => s + points);
    setFeedback({
      moveInScore: rs.moveInScore,
      passScore: rs.passScore,
      breakoutScore: rs.breakoutScore,
      tempoScore,
      points,
      moveInPicked: rs.moveInPicked,
      passPicked: rs.passPicked,
      breakoutPicked: rs.breakoutPicked,
      scn: scenarioRef.current,
      correctBreakoutId: relocationRef.current?.breakoutCorrectId,
      relocationLabel: relocationRef.current?.id,
      elapsedMs: Math.round(elapsed),
    });
    setPhaseBoth('feedback', '');
  };

  const goNext = () => {
    clearPhaseTimeout();
    const next = roundIdxRef.current + 1;
    if (next >= totalRounds) {
      finalize();
    } else {
      roundIdxRef.current = next;
      loadRound();
    }
  };

  const finalize = async () => {
    const maxTotal = totalRounds * MAX_ROUND;
    const finalScore = Math.min(100, Math.round((score / maxTotal) * 100));
    setFinished({ score: finalScore, reactionTime: null });
    setPhaseBoth('done', '');
    try {
      useEliteStore.getState().setEliteResult('elite_movement', { score: finalScore, reactionTime: null });
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
          gameType: 'elite_movement',
          score: finalScore,
          reactionTime: null,
        });
        toast.success('Elite Movement saved');
      } catch (err) {
        toast.error("Couldn't save elite movement score");
      }
    }
  };

  const back = () => navigate('/demo', { state: { playerProfile } });
  const scn = scenarioRef.current;
  const mode = getActionMode(phase);

  return (
    <EliteGameShell title="Movement — ELITE 3D" subtitle={`Round ${Math.min(roundNumber, totalRounds)} / ${totalRounds}`} onBack={back}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: mode.actionable ? 'pointer' : 'default' }} />

      {phase !== 'done' && (
        <>
          <div style={hudTopLeft}>
            <div style={hudLabel}>SCORE</div>
            <div style={hudValue}>{score}</div>
          </div>
          <div style={hudTopRight}>
            <div style={hudLabel}>ROUND</div>
            <div style={hudValue}>{Math.min(roundNumber, totalRounds)} / {totalRounds}</div>
          </div>

          <div style={{ ...actionBadge, background: mode.bg, color: mode.fg, borderColor: mode.border }}>
            <span style={{ ...actionDot, background: mode.dot, animation: mode.actionable ? 'ps-mv-pulse 1.2s ease-in-out infinite' : 'none' }} />
            <span>{mode.label}</span>
            <span style={{ opacity: 0.75, marginLeft: 10, letterSpacing: 1.2, textTransform: 'none' }}>
              {mode.subLabel}
            </span>
          </div>
          <style>{`@keyframes ps-mv-pulse { 0%,100% { transform: scale(1); opacity: 1;} 50% { transform: scale(1.35); opacity: 0.55;} }`}</style>

          <div style={promptWrap}>
            <div style={promptTitle}>{scn?.title}</div>
            <div style={promptText}>{scn?.instruction}</div>
            {hint && (
              <div style={{ fontSize: 11, color: '#facc15', marginTop: 6, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                {hint}
              </div>
            )}
          </div>

          <div style={legendWrap}>
            <div><span style={{ ...swatch, background: '#38bdf8' }} /> Zones · click to move</div>
            <div><span style={{ ...swatch, background: '#a3e635' }} /> Receivers · click to pass</div>
            <div><span style={{ ...swatch, background: '#ff6a00' }} /> YOU</div>
            <div><span style={{ ...swatch, background: '#1c3aa6' }} /> Opposition</div>
          </div>
        </>
      )}

      {phase === 'feedback' && feedback && (
        <div style={feedbackWrap}>
          <div style={{
            ...feedbackCard,
            borderLeft: `4px solid ${feedback.points >= MAX_ROUND * 0.7 ? '#2ead3c' : '#f59e0b'}`,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: feedback.points >= MAX_ROUND * 0.7 ? '#2ead3c' : '#f59e0b', marginBottom: 10 }}>
              {feedback.points >= MAX_ROUND * 0.7 ? '✓ SHARP SEQUENCE' : '△ CLEANER PATTERN NEXT TIME'}
            </div>
            <MetricBar label="Space to receive" value={feedback.moveInScore} />
            <MetricBar label="Return pass choice" value={feedback.passScore} />
            <MetricBar label="Breakout run" value={feedback.breakoutScore} />
            <MetricBar label="Sequence tempo" value={feedback.tempoScore} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.6 }}>
              {feedback.passPicked === 'passer'
                ? 'Nice wall pass — you always trust the man who fed you.'
                : 'The sharpest return was back to the passer at his new spot.'}
              {' '}
              {feedback.breakoutPicked === feedback.correctBreakoutId
                ? 'And you found the pocket his run opened up.'
                : `The pocket his run opened was zone ${feedback.correctBreakoutId}.`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>+{feedback.points} pts · {(feedback.elapsedMs / 1000).toFixed(1)}s</div>
              <button onClick={goNext} style={nextBtn}>
                {roundIdxRef.current + 1 >= totalRounds ? 'Finish Session ›' : 'Next Round ›'}
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

function getActionMode(phase) {
  switch (phase) {
    case 'moveIn':
      return {
        label: 'MOVE', subLabel: 'Click a blue zone', actionable: true,
        bg: 'rgba(56,189,248,0.18)', fg: '#e0f2fe', border: 'rgba(56,189,248,0.9)', dot: '#38bdf8',
      };
    case 'moveOut':
      return {
        label: 'MOVE', subLabel: 'Break into a blue zone', actionable: true,
        bg: 'rgba(56,189,248,0.18)', fg: '#e0f2fe', border: 'rgba(56,189,248,0.9)', dot: '#38bdf8',
      };
    case 'passBack':
      return {
        label: 'PASS', subLabel: 'Click a lime receiver', actionable: true,
        bg: 'rgba(163,230,53,0.18)', fg: '#f0fdf4', border: 'rgba(163,230,53,0.9)', dot: '#a3e635',
      };
    case 'moving1':
    case 'moving2':
      return {
        label: 'RUNNING', subLabel: '…', actionable: false,
        bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.18)', dot: '#facc15',
      };
    case 'receive1':
    case 'receive2':
    case 'passing1':
    case 'passerMoving':
      return {
        label: 'WAIT', subLabel: 'Ball in play', actionable: false,
        bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.18)', dot: '#facc15',
      };
    default:
      return {
        label: 'READY', subLabel: '', actionable: false,
        bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.18)', dot: '#facc15',
      };
  }
}

function MetricBar({ label, value }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const color = clamped >= 75 ? '#2ead3c' : clamped >= 45 ? '#facc15' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
      <div style={{ width: 170, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{label}</div>
      <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${clamped}%`, height: '100%', background: color }} />
      </div>
      <div style={{ width: 34, textAlign: 'right', fontSize: 12, color: '#fff', fontWeight: 700 }}>{clamped}</div>
    </div>
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

const actionBadge = {
  position: 'absolute', top: 68, left: '50%', transform: 'translateX(-50%)',
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '8px 16px', borderRadius: 999,
  border: '1.5px solid rgba(255,255,255,0.18)',
  fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800,
  letterSpacing: 2, textTransform: 'uppercase',
  boxShadow: '0 6px 22px rgba(0,0,0,0.45)',
  zIndex: 20,
};
const actionDot = {
  display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
  boxShadow: '0 0 8px currentColor',
};

const promptWrap = {
  position: 'absolute', top: 118, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.55)', padding: '10px 18px', borderRadius: 6,
  textAlign: 'center', color: '#fff', maxWidth: 620,
  fontFamily: "'JetBrains Mono', monospace",
};
const promptTitle = { fontSize: 11, letterSpacing: 2, color: '#facc15', marginBottom: 4 };
const promptText = { fontSize: 13, lineHeight: 1.5 };

const legendWrap = {
  position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
  display: 'flex', gap: 20, background: 'rgba(0,0,0,0.55)', padding: '8px 14px', borderRadius: 6,
  color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
};
const swatch = {
  display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginRight: 6,
  verticalAlign: 'middle',
};

const feedbackWrap = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 30, padding: 24,
};
const feedbackCard = {
  maxWidth: 520, width: '100%', background: '#080e0a', padding: '24px 28px',
  border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'JetBrains Mono', monospace",
};
const nextBtn = {
  padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
  color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: 1.4, fontSize: 12,
};