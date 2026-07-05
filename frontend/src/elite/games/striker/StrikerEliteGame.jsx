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
  createHighlightRing,
  createLabelSprite,
  hexToCss,
  pickClickTarget,
} from '../../rendering/eliteVisualHelpers';
import useEliteStore from '../../engine/useEliteStore';
import EliteGameShell from '../../ui/EliteGameShell';
import EliteScoreCard from '../../ui/EliteScoreCard';
import EliteIntroCard from '../../ui/EliteIntroCard';
import STRIKER_SCENARIOS from '../../scenarios/strikerScenarios';
import { submitScore } from '@/services/api';
import { toast } from 'sonner';

const GOAL_Z = -PITCH.length / 2; // -30

// TODO: point this at the actual games-list/menu route used elsewhere in the app
// (kept as a constant so it's a one-line change once that route is confirmed).
const GAMES_MENU_ROUTE = '/games';

// Score weights — kept to a flat 100 per round so every scenario (first-time
// or not) contributes evenly to the final percentage.
const W_KEEPER_READ = 50;
const W_TIMING = 25;
const W_TOUCH = 25;
const MAX_ROUND = W_KEEPER_READ + W_TIMING + W_TOUCH;

// A keeper rushing out shouldn't be able to shrink below this gap to the
// striker — keeps a real 1v1 angle rather than the keeper standing on top
// of the ball, and gives the chip/dink option somewhere to actually go.
const KEEPER_PRESS_MIN_GAP = 2.4;
const KEEPER_PRESS_SPEED = 3.1; // units/sec while closing the striker down

// Bigger, more imposing presence for keeper and striker — this is a camera
// / mesh-scale change only. The actual goal frame/net geometry lives in
// PitchRenderer's createPitchScene and isn't touched here.
const KEEPER_SCALE = 1.18;
const STRIKER_SCALE = 1.1;

// Traditional keeper kit colour — distinct from every outfield player on
// the pitch, the way a real goalkeeper jersey always is.
const COLOR_KEEPER = 0x16a34a;

// Real goalkeepers constantly narrow the angle rather than standing dead
// centre: they shade their positioning toward whichever side the ball/
// striker is on, staying on the line connecting the striker to the middle
// of the goal. GOAL_HALF_WIDTH is an approximation of a real 7.32m goal;
// adjust if PitchRenderer exposes an exact goal-width constant.
const GOAL_HALF_WIDTH = 3.66;
const KEEPER_REPOSITION_RATE = 1.1; // how briskly the keeper re-shades across goal, per second

// If the shot clock or the touch window runs out, this is the fallback
// target used so the round always resolves rather than stalling.
const FALLBACK_TARGET_KEY = 'NL';

// ---------- Age-appropriate timing (mirrors the pattern used in the other
// Elite games: younger players get more time / more forgiving windows,
// older/academy-age players are held to tighter, more realistic timing). ----------

// Total time allowed to pick a finish once targets appear.
function getShotWindowMs(age) {
  const a = Number(age) || 0;
  if (!a || a < 11) return 5000;
  if (a < 14) return 4000;
  return 3000;
}

// Window to take the first touch before targets appear (non-first-time
// services only).
function getTouchWindowMs(age) {
  const a = Number(age) || 0;
  if (!a || a < 11) return 1100;
  if (a < 14) return 900;
  return 700;
}

// How forgiving the "timing of the strike" scoring curve is — larger
// tolerance for younger players, tighter (more exacting) for older ones.
function getTimingToleranceMs(age) {
  const a = Number(age) || 0;
  if (!a || a < 11) return 1200;
  if (a < 14) return 1000;
  return 800;
}

// Fixed goal-mouth target templates (position relative to goal centre).
// The "chip" is only added when the scenario flags keeper off line, or
// automatically for keeper-pressure (1v1) scenarios.
const TARGET_TEMPLATES = [
  { key: 'NL', label: 'Near post — low', offset: [-2.5, 0.4, 0.05] },
  { key: 'NH', label: 'Near post — high', offset: [-2.2, 1.9, 0.05] },
  { key: 'FL', label: 'Far post — low', offset: [2.5, 0.4, 0.05] },
  { key: 'FH', label: 'Far post — high', offset: [2.2, 1.9, 0.05] },
];

const CHIP_TEMPLATE = { key: 'CH', label: 'Chip — over keeper', offset: [0, 2.35, 0.05] };

// Where a real keeper would stand for a given striker x-position: shaded
// toward that side of goal, roughly bisecting the angle to the near post.
function computeKeeperIdealX(strikerX) {
  const clamped = Math.max(-GOAL_HALF_WIDTH, Math.min(GOAL_HALF_WIDTH, strikerX));
  return clamped * 0.45;
}

// Sets a low, alert goalkeeper stance instead of the default standing
// pose — bent knees, hands ready — using the same userData.arms/legs
// skeleton hooks the pressing game uses for its celebration pose. Safe
// no-op if PitchRenderer's mesh doesn't expose those parts.
function applyKeeperReadyPose(mesh) {
  const arms = mesh.userData?.arms;
  const legs = mesh.userData?.legs;
  if (arms && arms[0] && arms[1]) {
    arms[0].rotation.x = -0.45;
    arms[1].rotation.x = -0.45;
    arms[0].rotation.z = 0.3;
    arms[1].rotation.z = -0.3;
  }
  if (legs && legs[0] && legs[1]) {
    legs[0].rotation.x = 0.18;
    legs[1].rotation.x = -0.18;
  }
}

export default function StrikerEliteGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const playerProfile = (location.state && location.state.playerProfile) || {};

  const containerRef = useRef(null);
  const handlesRef = useRef(null);
  const passerRef = useRef(null);
  const strikerRef = useRef(null);
  const keeperRef = useRef(null);
  const defenderRefs = useRef([]);
  const ballRef = useRef(null);
  const targetRefs = useRef([]);

  const phaseRef = useRef('intro');
  const phaseStartRef = useRef(0);
  const shootStartRef = useRef(0);
  const touchStartRef = useRef(0);
  const scenarioRef = useRef(null);
  const receiveAtRef = useRef(null);
  const touchScoreRef = useRef(100);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(performance.now());
  const clockRef = useRef(0);
  const phaseTimeoutRef = useRef(null);
  const touchTimeoutRef = useRef(null);

  // Drives a smooth, synced run for the striker only when a scenario
  // actually defines a receive point different from the start point — the
  // default is the striker is already in position for the service.
  const strikerMotionRef = useRef({ active: false, from: new THREE.Vector3(), to: new THREE.Vector3(), startTime: 0, duration: 900 });

  // Keeper-pressure (rushing 1v1) chase state.
  const keeperPressRef = useRef({ active: false });

  // Keeper dive animation, triggered the instant a finish is chosen.
  // `to` is the ball's actual world target so the dive endpoint matches
  // where the shot is heading, not a fixed left/right offset.
  const keeperDiveRef = useRef({
    active: false,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    isChip: false,
    startTime: 0,
    duration: 650,
  });

  const ballStateRef = useRef({
    mode: 'idle',
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    control: new THREE.Vector3(),
    startTime: 0,
    duration: 900,
    onDone: null,
  });

  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState('intro');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(null);
  const [shotBar, setShotBar] = useState(1);
  const [touchBar, setTouchBar] = useState(1);
  // Pre-game brief. Service is deferred on the first round until the user
  // dismisses the intro.
  const [showIntro, setShowIntro] = useState(true);
  const pendingIntroRef = useRef(true);

  const totalRounds = STRIKER_SCENARIOS.length;

  const setPhaseBoth = (p) => { phaseRef.current = p; setPhase(p); };
  const clearPhaseTimeout = () => {
    if (phaseTimeoutRef.current) { clearTimeout(phaseTimeoutRef.current); phaseTimeoutRef.current = null; }
  };
  const clearTouchTimeout = () => {
    if (touchTimeoutRef.current) { clearTimeout(touchTimeoutRef.current); touchTimeoutRef.current = null; }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Camera framed lower and closer, behind the striker's shoulder — a
    // tighter, more broadcast-style finishing-drill angle so the goal and
    // keeper read as bigger/closer without needing to touch the underlying
    // goal geometry in PitchRenderer.
    const handles = createPitchScene({
      container,
      cameraPosition: [0, 6.4, -8],
      cameraTarget: [0, 1.7, GOAL_Z + 1.5],
      fov: 44,
    });
    handlesRef.current = handles;
    const ball = createBallMesh();
    handles.scene.add(ball);
    ballRef.current = ball;

    const onResize = () => handles.resize();
    window.addEventListener('resize', onResize);

    const onClick = (e) => {
      if (phaseRef.current !== 'shoot') return;
      const hit = pickClickTarget(e, container, handles.camera, targetRefs.current.map((t) => t.group));
      if (hit && hit.userData.onClick) hit.userData.onClick();
    };
    container.addEventListener('click', onClick);
    container.addEventListener('touchend', onClick);

    // First-touch direction input — WASD/arrows only, during the 'touch'
    // phase. Whichever direction is pressed first resolves the touch.
    const TOUCH_DIR_MAP = {
      arrowup: [0, -1], w: [0, -1],
      arrowdown: [0, 1], s: [0, 1],
      arrowleft: [-1, 0], a: [-1, 0],
      arrowright: [1, 0], d: [1, 0],
    };
    const onKeyDown = (e) => {
      if (phaseRef.current !== 'touch') return;
      const k = e.key.toLowerCase();
      if (TOUCH_DIR_MAP[k]) {
        e.preventDefault();
        resolveTouch(TOUCH_DIR_MAP[k]);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    loadRound(0);

    const animate = (now) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;
      clockRef.current += dt;
      stepMeshes(dt, now);
      stepKeeperPressure(dt);
      stepKeeperDive(now);
      updateBall(now);
      pulseTargets();
      handles.renderer.render(handles.scene, handles.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearPhaseTimeout();
      clearTouchTimeout();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('click', onClick);
      container.removeEventListener('touchend', onClick);
      handles.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shot-clock timer bar for the 'shoot' phase, scaled to the player's age.
  useEffect(() => {
    if (phase !== 'shoot') return;
    const limit = getShotWindowMs(playerProfile.age);
    let raf;
    const tick = () => {
      const elapsed = performance.now() - shootStartRef.current;
      const remaining = Math.max(0, 1 - elapsed / limit);
      setShotBar(remaining);
      if (remaining > 0 && phaseRef.current === 'shoot') {
        raf = requestAnimationFrame(tick);
      } else if (remaining <= 0 && phaseRef.current === 'shoot') {
        const fallback = targetRefs.current.find((t) => t.template.key === FALLBACK_TARGET_KEY) || targetRefs.current[0];
        if (fallback) onPickTarget(fallback.template);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx]);

  // Touch-window timer bar for the 'touch' phase, scaled to the player's age.
  useEffect(() => {
    if (phase !== 'touch') return;
    const limit = getTouchWindowMs(playerProfile.age);
    let raf;
    const tick = () => {
      const elapsed = performance.now() - touchStartRef.current;
      const remaining = Math.max(0, 1 - elapsed / limit);
      setTouchBar(remaining);
      if (remaining > 0 && phaseRef.current === 'touch') {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx]);

  const stepMeshes = (dt, now) => {
    if (passerRef.current) animatePlayerStep(passerRef.current.mesh, false, dt);

    // Synced run onto the service, only active when a scenario explicitly
    // defines a receive point away from the start point.
    const motion = strikerMotionRef.current;
    let strikerMoving = false;
    if (motion.active && strikerRef.current) {
      const t = Math.min(1, (now - motion.startTime) / motion.duration);
      strikerRef.current.mesh.position.lerpVectors(motion.from, motion.to, t);
      strikerRef.current.mesh.lookAt(0, 0, GOAL_Z);
      strikerMoving = true;
      if (t >= 1) motion.active = false;
    }
    if (strikerRef.current) animatePlayerStep(strikerRef.current.mesh, strikerMoving, dt);

    stepKeeperStance(dt, now);
    defenderRefs.current.forEach((d) => animatePlayerStep(d.mesh, false, dt));

    if (strikerRef.current?.ring) {
      const p = strikerRef.current.mesh.position;
      strikerRef.current.ring.position.set(p.x, 0.03, p.z);
      strikerRef.current.ring.material.opacity = 0.55 + Math.sin(clockRef.current * 6) * 0.25;
    }
    if (keeperRef.current?.pressureRing) {
      const kp = keeperRef.current.mesh.position;
      keeperRef.current.pressureRing.position.set(kp.x, 0.03, kp.z);
      const speedPulse = keeperPressRef.current.active ? 10 : 3;
      keeperRef.current.pressureRing.material.opacity = 0.35 + Math.sin(clockRef.current * speedPulse) * 0.25;
    }
  };

  // Realistic goalkeeper positioning and stance for whenever the keeper
  // isn't actively rushing out or mid-dive: a low, ready stance that keeps
  // tracking the striker and gently re-shades toward the ball side of
  // goal, plus a subtle ready-stance shuffle — a real keeper is never
  // dead still on their line.
  const stepKeeperStance = (dt, now) => {
    const entry = keeperRef.current;
    if (!entry) return;

    if (keeperDiveRef.current.active) return; // dive animation owns the mesh
    if (keeperPressRef.current.active) {
      animatePlayerStep(entry.mesh, true, dt);
      return;
    }

    const strikerPos = strikerRef.current ? strikerRef.current.mesh.position : null;
    if (strikerPos && entry.basePos) {
      const idealX = computeKeeperIdealX(strikerPos.x);
      entry.basePos.x += (idealX - entry.basePos.x) * Math.min(1, dt * KEEPER_REPOSITION_RATE);

      const t = now * 0.0022;
      const sway = Math.sin(t) * 0.16;
      const bob = Math.max(0, Math.sin(t * 2.4)) * 0.035;
      entry.mesh.position.x = entry.basePos.x + sway;
      entry.mesh.position.z = entry.basePos.z;
      entry.mesh.position.y = bob;
      entry.mesh.lookAt(strikerPos.x, entry.mesh.position.y, strikerPos.z);
    }
    animatePlayerStep(entry.mesh, false, dt);
  };

  // Keeper rushing out for a 1v1: chases the striker's live position, but
  // never closes past a minimum gap so there's always a real angle to beat.
  const stepKeeperPressure = (dt) => {
    const press = keeperPressRef.current;
    if (!press.active || !keeperRef.current || !strikerRef.current) return;
    if (phaseRef.current !== 'service' && phaseRef.current !== 'touch' && phaseRef.current !== 'shoot') return;

    const keeperMesh = keeperRef.current.mesh;
    const target = strikerRef.current.mesh.position;
    const dx = target.x - keeperMesh.position.x;
    const dz = target.z - keeperMesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > KEEPER_PRESS_MIN_GAP) {
      const step = Math.min(dist - KEEPER_PRESS_MIN_GAP, KEEPER_PRESS_SPEED * dt);
      keeperMesh.position.x += (dx / dist) * step;
      keeperMesh.position.z += (dz / dist) * step;
      keeperMesh.lookAt(target.x, 0, target.z);
    }
  };

  // Cosmetic keeper reaction once a finish has been chosen. The dive
  // endpoint IS the ball's target position — x lerps toward target.x,
  // y arcs up to target.y, z pushes forward a fraction of the way toward
  // the goal-line so the keeper looks like they're stretching for the
  // shot rather than sliding along their starting Z. Purely visual:
  // scoring already froze the keeper at the moment of the strike.
  const stepKeeperDive = (now) => {
    const dive = keeperDiveRef.current;
    if (!dive.active || !keeperRef.current) return;
    const mesh = keeperRef.current.mesh;
    const t = Math.min(1, (now - dive.startTime) / dive.duration);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    if (dive.isChip) {
      // Keeper knows they're beaten — small back-pedal + look up.
      mesh.position.x = dive.from.x;
      mesh.position.z = dive.from.z - Math.sin(t * Math.PI) * 0.4;
      mesh.rotation.x = -Math.sin(t * Math.PI) * 0.35;
    } else {
      // Full dive — mesh lerps toward the target's actual x/y/z.
      const dx = dive.to.x - dive.from.x;
      const dz = dive.to.z - dive.from.z;
      // Only push a fraction of the way in Z so the keeper stretches
      // forward without literally teleporting into the net at t=1.
      const zReach = 0.55;
      mesh.position.x = dive.from.x + dx * ease;
      mesh.position.z = dive.from.z + dz * ease * zReach;
      // Vertical: reach up to target.y plus a small hop so low dives
      // still leave the ground and high dives arc even further.
      mesh.position.y = dive.to.y * ease + Math.sin(t * Math.PI) * 0.4;
      // Body roll follows the lateral direction. Falls back to +1 for
      // a rare exactly-central strike so the roll never flips to 0.
      const rollDir = Math.sign(dx) || 1;
      mesh.rotation.z = rollDir * ease * 1.1;
    }
    if (t >= 1) dive.active = false;
  };

  const updateBall = (now) => {
    const ball = ballRef.current;
    const state = ballStateRef.current;
    if (!ball) return;
    if (state.mode === 'arc') {
      const t = Math.min(1, (now - state.startTime) / state.duration);
      ball.position.copy(quadBezier(state.start, state.control, state.end, t));
      if (t >= 1) {
        state.mode = 'idle';
        const cb = state.onDone; state.onDone = null;
        if (cb) cb();
      }
    } else if (state.mode === 'ground') {
      const t = Math.min(1, (now - state.startTime) / state.duration);
      ball.position.lerpVectors(state.start, state.end, t);
      ball.position.y = 0.24;
      if (t >= 1) {
        state.mode = 'idle';
        const cb = state.onDone; state.onDone = null;
        if (cb) cb();
      }
    } else if (state.mode === 'idle') {
      // ball follows passer if in service prep, or sits with the striker
      // during the touch window
      if (phaseRef.current === 'intro' && passerRef.current) {
        const p = passerRef.current.mesh.position;
        ball.position.set(p.x + 0.3, 0.24, p.z + 0.1);
      } else if (phaseRef.current === 'touch' && strikerRef.current) {
        const p = strikerRef.current.mesh.position;
        ball.position.set(p.x + 0.25, 0.24, p.z + 0.1);
      }
    }
  };

  const pulseTargets = () => {
    if (phaseRef.current !== 'shoot') return;
    const t = clockRef.current * 5;
    targetRefs.current.forEach((tgt) => {
      const pulse = 0.55 + Math.sin(t + tgt.phase) * 0.25;
      tgt.ring.material.opacity = pulse;
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
      if (entry.pressureRing) {
        scene.remove(entry.pressureRing);
        entry.pressureRing.geometry.dispose();
        entry.pressureRing.material.dispose();
      }
    };
    drop(passerRef.current);
    drop(strikerRef.current);
    drop(keeperRef.current);
    defenderRefs.current.forEach(drop);
    defenderRefs.current = [];
    targetRefs.current.forEach((tgt) => {
      scene.remove(tgt.group);
      tgt.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose && m.dispose());
          else o.material.dispose && o.material.dispose();
        }
      });
    });
    targetRefs.current = [];
    passerRef.current = null;
    strikerRef.current = null;
    keeperRef.current = null;
  };

  const buildActor = (pos, color, label, opts = {}) => {
    const mesh = createPlayerMesh(color, { numberLabel: label });
    mesh.position.set(pos[0], 0, pos[2]);
    mesh.lookAt(0, 0, GOAL_Z);
    if (opts.scale) mesh.scale.setScalar(opts.scale);
    handlesRef.current.scene.add(mesh);
    const entry = { mesh };
    if (opts.ring) {
      const ring = createHighlightRing(opts.ring);
      ring.position.set(pos[0], 0.03, pos[2]);
      handlesRef.current.scene.add(ring);
      entry.ring = ring;
    }
    if (opts.pressureRing) {
      const pressureRing = createHighlightRing(opts.pressureRing);
      pressureRing.position.set(pos[0], 0.03, pos[2]);
      pressureRing.scale.setScalar(1.3);
      handlesRef.current.scene.add(pressureRing);
      entry.pressureRing = pressureRing;
    }
    return entry;
  };

  const buildGoalTarget = (template, color, onClick) => {
    const scene = handlesRef.current.scene;
    const group = new THREE.Group();
    const [x, y, z] = template.offset;
    const worldX = x;
    const worldY = y;
    const worldZ = GOAL_Z + z;

    // Vertical ring facing +z (toward camera)
    const ringGeo = new THREE.RingGeometry(0.32, 0.55, 28);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.renderOrder = 500;
    group.add(ring);

    // Solid inner spot
    const dotMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthTest: false });
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.28, 28), dotMat);
    dot.renderOrder = 500;
    group.add(dot);

    // Larger invisible hit sphere for easy clicking
    const hitMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.001, depthTest: false });
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8), hitMat);
    group.add(hit);

    // Label sprite floating above the target
    const label = createLabelSprite(template.key, { bg: 'rgba(0,0,0,0.72)', accent: hexToCss(color) });
    label.scale.set(0.9, 0.45, 1);
    label.position.set(0, 0.85, 0);
    group.add(label);

    group.position.set(worldX, worldY, worldZ);
    group.userData.onClick = onClick;
    group.userData.template = template;
    scene.add(group);
    return { group, ring, template };
  };

  const loadRound = (idx) => {
    clearActors();
    clearTouchTimeout();
    const scn = STRIKER_SCENARIOS[idx];
    scenarioRef.current = scn;
    setFeedback(null);
    receiveAtRef.current = null;
    keeperPressRef.current.active = !!scn.keeperPressure;
    keeperDiveRef.current.active = false;
    setShotBar(1);
    setTouchBar(1);
    // First-time services (headers/crosses struck on arrival) get full
    // credit for the touch component automatically — there's no touch to
    // take, so this keeps every round's max score consistent.
    touchScoreRef.current = scn.firstTime ? 100 : null;

    // Default: the striker is already in position for the service — no
    // receive point means no run. Only scenarios that explicitly set a
    // different strikerReceive get a smooth, synced run onto the ball.
    const strikerReceivePos = scn.strikerReceive || scn.strikerStart;

    passerRef.current = buildActor(scn.passer.pos, ELITE_COLORS.neutralHome, 'P');
    strikerRef.current = buildActor(scn.strikerStart, ELITE_COLORS.you, 'YOU', {
      ring: ELITE_COLORS.youRing,
      scale: STRIKER_SCALE,
    });
    keeperRef.current = buildActor([scn.keeper.pos[0], 0, scn.keeper.pos[2]], COLOR_KEEPER, 'GK', {
      scale: KEEPER_SCALE,
      pressureRing: scn.keeperPressure ? 0xff3b30 : null,
    });
    // basePos is the keeper's "home" line position for this round — the
    // realistic-positioning logic gently re-shades this toward the ball
    // side of goal each frame, and the ready-stance shuffle oscillates
    // around it, rather than the mesh's raw position drifting freely.
    keeperRef.current.basePos = new THREE.Vector3(scn.keeper.pos[0], 0, scn.keeper.pos[2]);
    applyKeeperReadyPose(keeperRef.current.mesh);
    scn.defenders.forEach((d, i) => defenderRefs.current.push(buildActor(d.pos, ELITE_COLORS.away, String(i + 1))));

    strikerMotionRef.current.active = false;
    strikerMotionRef.current.from.set(scn.strikerStart[0], 0, scn.strikerStart[2]);
    strikerMotionRef.current.to.set(strikerReceivePos[0], 0, strikerReceivePos[2]);

    // Ball starts at passer
    ballStateRef.current.mode = 'idle';
    const p = passerRef.current.mesh.position;
    ballRef.current.position.set(p.x + 0.3, 0.24, p.z + 0.1);

    phaseStartRef.current = performance.now();
    setPhaseBoth('intro');

    // Kick off service after a brief pause — but on the first round wait for
    // the user to dismiss the intro brief first.
    if (!pendingIntroRef.current) {
      phaseTimeoutRef.current = setTimeout(() => startService(), 700);
    }
  };

  const dismissIntro = () => {
    if (!pendingIntroRef.current) return;
    pendingIntroRef.current = false;
    setShowIntro(false);
    // Same 700 ms pre-service beat the subsequent rounds get.
    phaseTimeoutRef.current = setTimeout(() => startService(), 700);
  };

  const startService = () => {
    const scn = scenarioRef.current;
    if (!scn) return;
    setPhaseBoth('service');

    const strikerReceivePos = scn.strikerReceive || scn.strikerStart;
    const start = new THREE.Vector3(passerRef.current.mesh.position.x, 0.24, passerRef.current.mesh.position.z);
    const end = new THREE.Vector3(strikerReceivePos[0], 0.24, strikerReceivePos[2]);
    const height = scn.serviceType === 'cross' ? 4.2 : scn.serviceType === 'cutback' ? 0.6 : scn.serviceType === 'layoff' ? 0.4 : 2.2;
    const duration = scn.serviceType === 'cross' ? 1200 : 900;

    ballStateRef.current.mode = height > 1.0 ? 'arc' : 'ground';
    ballStateRef.current.start.copy(start);
    ballStateRef.current.end.copy(end);
    ballStateRef.current.control.copy(makeArcControl(start, end, height));
    ballStateRef.current.startTime = performance.now();
    ballStateRef.current.duration = duration;

    // Only run the striker if this scenario actually places the receive
    // point away from the start — synced to the same window as the ball
    // flight so it reads as meeting the pass, not teleporting onto it.
    const needsRun = Math.hypot(
      strikerReceivePos[0] - scn.strikerStart[0],
      strikerReceivePos[2] - scn.strikerStart[2],
    ) > 0.15;
    if (needsRun) {
      strikerMotionRef.current.active = true;
      strikerMotionRef.current.startTime = performance.now();
      strikerMotionRef.current.duration = duration;
    }

    ballStateRef.current.onDone = () => {
      // Make sure the striker has landed exactly on the receive point even
      // if the run animation and ball flight timings drift by a frame.
      const striker = strikerRef.current;
      if (striker) {
        striker.mesh.position.set(strikerReceivePos[0], 0, strikerReceivePos[2]);
        striker.mesh.lookAt(0, 0, GOAL_Z);
      }
      strikerMotionRef.current.active = false;
      receiveAtRef.current = performance.now();

      if (scn.firstTime) {
        // Struck first time — straight into the finishing decision.
        shootStartRef.current = performance.now();
        spawnTargets();
        setPhaseBoth('shoot');
      } else {
        // Take a touch first, away from the nearest pressure.
        touchStartRef.current = performance.now();
        setPhaseBoth('touch');
        const limit = getTouchWindowMs(playerProfile.age);
        touchTimeoutRef.current = setTimeout(() => {
          if (phaseRef.current === 'touch') resolveTouch([0, 0]);
        }, limit);
      }
    };
  };

  // Finds whichever defender or the keeper is currently closest to the
  // striker — the touch should ideally move away from this player.
  const nearestThreat = () => {
    if (!strikerRef.current) return null;
    const sp = strikerRef.current.mesh.position;
    let best = null;
    let bestD = Infinity;
    const candidates = [keeperRef.current, ...defenderRefs.current].filter(Boolean);
    candidates.forEach((entry) => {
      const d = Math.hypot(entry.mesh.position.x - sp.x, entry.mesh.position.z - sp.z);
      if (d < bestD) { bestD = d; best = entry; }
    });
    return best;
  };

  // Resolves the first touch: a small physical nudge in the chosen
  // direction, scored by how well it moves the striker away from the
  // nearest pressure. No direction pressed (timeout) resolves with a
  // neutral score rather than a penalty.
  const resolveTouch = (dir) => {
    if (phaseRef.current !== 'touch') return;
    clearTouchTimeout();

    const striker = strikerRef.current;
    const threat = nearestThreat();
    let touchScore = 55; // neutral default if no input was given in time

    const len = Math.hypot(dir[0], dir[1]);
    if (striker && threat && len > 0) {
      const ndx = dir[0] / len;
      const ndz = dir[1] / len;
      const nudge = 1.0;
      striker.mesh.position.x += ndx * nudge;
      striker.mesh.position.z += ndz * nudge;
      striker.mesh.lookAt(0, 0, GOAL_Z);

      const toThreatX = threat.mesh.position.x - striker.mesh.position.x;
      const toThreatZ = threat.mesh.position.z - striker.mesh.position.z;
      const threatLen = Math.hypot(toThreatX, toThreatZ) || 1;
      // dot > 0 means the touch moved toward the threat, dot < 0 means away
      const towardThreatDot = (ndx * toThreatX + ndz * toThreatZ) / threatLen;
      touchScore = Math.round(Math.max(0, Math.min(100, 50 - towardThreatDot * 50)));
    }

    touchScoreRef.current = touchScore;

    const scn = scenarioRef.current;
    shootStartRef.current = performance.now();
    // Timing is measured from the touch onward for these scenarios — that's
    // the realistic "don't rush, don't dwell" window after setting yourself.
    receiveAtRef.current = performance.now();
    spawnTargets();
    setPhaseBoth('shoot');
  };

  const spawnTargets = () => {
    const scn = scenarioRef.current;
    // Filter chip target based on offerChip flag, or automatically for a
    // rushing keeper — the whole point of a 1v1 is the chip becomes live.
    const showChip = scn.offerChip || scn.keeperPressure;
    const templates = showChip ? [...TARGET_TEMPLATES, CHIP_TEMPLATE] : TARGET_TEMPLATES;
    templates.forEach((tmpl, i) => {
      const color = tmpl.key.startsWith('N') || tmpl.key === 'CH' ? 0x38bdf8 : 0xa3e635;
      const entry = buildGoalTarget(tmpl, color, () => onPickTarget(tmpl));
      entry.phase = i * 0.5;
      targetRefs.current.push(entry);
    });
  };

  const onPickTarget = (template) => {
    if (phaseRef.current !== 'shoot') return;
    const strikerPos = strikerRef.current.mesh.position.clone();
    strikerPos.y = 0.24;
    const targetWorld = new THREE.Vector3(template.offset[0], template.offset[1], GOAL_Z + template.offset[2]);

    // Freeze the keeper's position for scoring purposes right now — the
    // decision was made against where the keeper actually was at the
    // moment of the strike, not wherever they end up after the ball lands.
    const keeperPosAtStrike = keeperRef.current.mesh.position.clone();
    startKeeperDive(template, keeperPosAtStrike);

    setPhaseBoth('shot');
    ballStateRef.current.mode = 'arc';
    ballStateRef.current.start.copy(strikerPos);
    ballStateRef.current.end.copy(targetWorld);
    ballStateRef.current.control.copy(makeArcControl(strikerPos, targetWorld, 1.2));
    ballStateRef.current.startTime = performance.now();
    ballStateRef.current.duration = 700;
    ballStateRef.current.onDone = () => resolveShot(template, keeperPosAtStrike);
  };

  // Kicks off the cosmetic keeper reaction. The dive endpoint IS the ball's
  // world target (x, y, z) so the keeper actually goes toward wherever the
  // shot is heading — not just a signed left/right offset. Chip is the one
  // exception: keeper knows they're beaten and back-pedals + looks up.
  const startKeeperDive = (template, keeperPosAtStrike) => {
    const targetWorld = new THREE.Vector3(
      template.offset[0],
      template.offset[1],
      GOAL_Z + template.offset[2],
    );
    const isChip = template.key === 'CH';
    keeperDiveRef.current = {
      active: true,
      from: keeperPosAtStrike.clone(),
      to: targetWorld.clone(),
      isChip,
      startTime: performance.now(),
      duration: 650,
    };
  };

  const resolveShot = (template, keeperPosAtStrike) => {
    const scn = scenarioRef.current;
    const targetWorld = new THREE.Vector3(template.offset[0], template.offset[1], GOAL_Z + template.offset[2]);
    const targetDist = keeperPosAtStrike.distanceTo(targetWorld);

    // Compute max possible distance across offered templates for normalisation
    const offered = (scn.offerChip || scn.keeperPressure) ? [...TARGET_TEMPLATES, CHIP_TEMPLATE] : TARGET_TEMPLATES;
    let maxD = 0;
    offered.forEach((t) => {
      const w = new THREE.Vector3(t.offset[0], t.offset[1], GOAL_Z + t.offset[2]);
      const d = keeperPosAtStrike.distanceTo(w);
      if (d > maxD) maxD = d;
    });
    const keeperRead = maxD > 0 ? Math.round((targetDist / maxD) * 100) : 60;

    // Timing: how close the strike was to the ideal window mid-point,
    // scored against an age-appropriate tolerance.
    const receivedAt = receiveAtRef.current || performance.now();
    const elapsed = performance.now() - receivedAt;
    const ideal = scn.timingWindowMs || 800;
    const tolerance = getTimingToleranceMs(playerProfile.age);
    const off = Math.abs(elapsed - ideal);
    const timingScore = Math.max(0, Math.round(100 - (off / tolerance) * 100));

    const touchScore = touchScoreRef.current == null ? 100 : touchScoreRef.current;

    const points = Math.round(
      (keeperRead / 100) * W_KEEPER_READ +
      (timingScore / 100) * W_TIMING +
      (touchScore / 100) * W_TOUCH
    );

    setScore((s) => s + points);
    setFeedback({
      keeperRead,
      timingScore,
      touchScore,
      firstTime: !!scn.firstTime,
      points,
      chosen: template,
      scn,
    });
    setPhaseBoth('feedback');
  };

  const goNext = () => {
    clearPhaseTimeout();
    clearTouchTimeout();
    const next = roundIdx + 1;
    if (next >= totalRounds) finalize();
    else { setRoundIdx(next); loadRound(next); }
  };

  const finalize = async () => {
    const maxTotal = totalRounds * MAX_ROUND;
    const finalScore = Math.min(100, Math.round((score / maxTotal) * 100));
    setFinished({ score: finalScore, reactionTime: null });
    setPhaseBoth('done');
    try {
      useEliteStore.getState().setEliteResult('elite_striker', { score: finalScore, reactionTime: null });
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
          gameType: 'elite_striker',
          score: finalScore,
          reactionTime: null,
        });
        toast.success('Elite Striker saved');
      } catch (err) {
        toast.error("Couldn't save elite striker score");
      }
    }
  };

  const back = () => navigate(GAMES_MENU_ROUTE, { state: { playerProfile } });
  const scn = scenarioRef.current;
  const cursorStyle = phase === 'shoot' ? 'crosshair' : 'default';

  return (
    <EliteGameShell title="Striker — ELITE 3D" subtitle={`Round ${Math.min(roundIdx + 1, totalRounds)} / ${totalRounds}`} onBack={back}>
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

          {phase === 'touch' && (
            <div style={timerWrap}>
              <div style={{ ...timerBar, width: `${Math.max(0, touchBar) * 100}%` }} />
            </div>
          )}
          {phase === 'shoot' && (
            <div style={timerWrap}>
              <div style={{ ...timerBar, width: `${Math.max(0, shotBar) * 100}%` }} />
            </div>
          )}

          <div style={promptWrap}>
            <div style={promptTitle}>{scn?.title}</div>
            <div style={promptText}>{scn?.instruction}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
              {phase === 'intro' && 'Watch the service…'}
              {phase === 'service' && (scn?.keeperPressure ? 'Ball incoming — keeper is off his line…' : 'Ball incoming…')}
              {phase === 'touch' && 'Take your touch — WASD / arrow keys, away from the pressure.'}
              {phase === 'shoot' && (scn?.keeperPressure ? 'Keeper is closing you down — pick your finish.' : 'Click a target in the goal-mouth.')}
              {phase === 'shot' && 'Finish!'}
            </div>
          </div>
        </>
      )}

      {phase === 'feedback' && feedback && (
        <div style={feedbackWrap}>
          <div style={{ ...feedbackCard, borderLeft: `4px solid ${feedback.points >= MAX_ROUND * 0.7 ? '#2ead3c' : '#f59e0b'}` }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: feedback.points >= MAX_ROUND * 0.7 ? '#2ead3c' : '#f59e0b', marginBottom: 10 }}>
              FINISH · {feedback.chosen.label}
            </div>
            <MetricBar label="Read of the keeper" value={feedback.keeperRead} />
            <MetricBar label="Timing of the strike" value={feedback.timingScore} />
            <MetricBar label={feedback.firstTime ? 'First-time finish' : 'First touch'} value={feedback.touchScore} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.6 }}>
              {feedback.points >= MAX_ROUND * 0.7
                ? 'Great choice — the keeper had no chance from that angle.'
                : 'A touch further from the keeper next time — attack the space the keeper cannot reach.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>+{feedback.points} pts</div>
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
          title="Striker · ELITE"
          accent="#facc15"
          objective="Read the goalkeeper. When the ball is served, click a coloured goal-mouth target and finish where the keeper cannot reach. Timing matters — the shot clock is unforgiving."
          controls={[
            { keys: 'Click',   action: 'Tap a coloured target inside the goal-mouth' },
            { keys: 'Timing',  action: 'Shoot as soon as your first touch lands cleanly' },
            { keys: 'Chip',    action: 'Only offered when the keeper is off their line' },
          ]}
          onStart={dismissIntro}
        />
      )}
    </EliteGameShell>
  );
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

const timerWrap = {
  position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
  width: 360, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden',
};
const timerBar = { height: '100%', background: 'linear-gradient(90deg, #facc15, #f97316)', transition: 'width 0.08s linear' };

const promptWrap = {
  position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.55)', padding: '10px 18px', borderRadius: 6,
  textAlign: 'center', color: '#fff', maxWidth: 620,
  fontFamily: "'JetBrains Mono', monospace",
};
const promptTitle = { fontSize: 11, letterSpacing: 2, color: '#facc15', marginBottom: 4 };
const promptText = { fontSize: 13, lineHeight: 1.5 };

const feedbackWrap = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 30, padding: 24,
};
const feedbackCard = {
  maxWidth: 500, width: '100%', background: '#080e0a', padding: '24px 28px',
  border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'JetBrains Mono', monospace",
};
const nextBtn = {
  padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
  color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: 1.4, fontSize: 12,
};