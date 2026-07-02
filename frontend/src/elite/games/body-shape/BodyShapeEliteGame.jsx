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
} from '../../rendering/PitchRenderer';
import {
  ELITE_COLORS,
  createHighlightRing,
  createLabelSprite,
} from '../../rendering/eliteVisualHelpers';
import useEliteStore from '../../engine/useEliteStore';
import EliteGameShell from '../../ui/EliteGameShell';
import EliteScoreCard from '../../ui/EliteScoreCard';
import BODY_SHAPE_SCENARIOS from '../../scenarios/bodyShapeScenarios';
import { submitScore } from '@/services/api';
import { toast } from 'sonner';

const PLAYER_SPEED = 4.2;
const FIRST_TOUCH_WINDOW_MS = 800;
const ORIENT_WINDOW_MS = 1000;               // ball flight duration
const PASS_SETUP_WINDOW_MS = 2800;           // time to open hips + tap after receiving

// Kick animation
const KICK_DUR_MS = 520;
const KICK_REACH = 0.36;                     // spec: ~0.36u lunge
const KICK_CONTACT_FRAC = 0.42;              // ball leaves foot at ~42% of duration

// Round scoring — MAX_ROUND stays at 100 so finalize() percentage math is unchanged.
const W_TIMING = 15;
const W_ORIENT = 20;
const W_TOUCH = 15;
const W_BODY_SHAPE = 30;
const W_PASS_DIR = 20;
const MAX_ROUND = W_TIMING + W_ORIENT + W_TOUCH + W_BODY_SHAPE + W_PASS_DIR; // = 100

const IDEAL_ARROW_COLOR = 0x22d3ee;      // cyan — rotate-your-body guide
const PASS_TARGET_ARROW_COLOR = 0xa3e635; // lime — "pass me the ball" pointer

// ============================================================================
// Module-scope helpers (no component state needed)
// ============================================================================

/**
 * Locate a kicking-leg child inside a player mesh. First try a name match
 * (per spec: /leg|foot|shin|thigh|calf/i). PitchRenderer's createPlayerMesh
 * does not name its children, so fall back to `mesh.userData.legs[0]` — the
 * documented left-leg cylinder — which lets the swing land on the real mesh
 * we ship with. Returns null if neither is found; stepKick then falls back
 * to a body-lunge-only animation without crashing.
 */
function findKickLeg(mesh) {
  let named = null;
  mesh.traverse((child) => {
    if (named) return;
    if (typeof child.name === 'string' && /leg|foot|shin|thigh|calf/i.test(child.name)) {
      named = child;
    }
  });
  if (named) return named;
  const legs = mesh.userData?.legs;
  if (Array.isArray(legs) && legs[0]) return legs[0];
  return null;
}

/**
 * Kick lunge: face the pass direction, plant, strike, recover. Fires
 * `onContact` exactly at the contact frame (~42% into the duration) so the
 * ball releases off the foot, not before.
 */
function startKick(entry, dirX, dirZ, durMs = KICK_DUR_MS, onContact = null) {
  if (!entry?.mesh) return;
  const mesh = entry.mesh;
  // Face the direction of the pass.
  mesh.lookAt(mesh.position.x + dirX, 0, mesh.position.z + dirZ);
  const kickLeg = findKickLeg(mesh);
  mesh.userData._kick = {
    dirX, dirZ, durMs, onContact,
    startTs: performance.now(),
    contactFrac: KICK_CONTACT_FRAC,
    contacted: false,
    kickLeg,
    origLegRot: kickLeg ? kickLeg.rotation.x : 0,
    origX: mesh.position.x,
    origZ: mesh.position.z,
  };
}

function stepKick(entry, now) {
  const mesh = entry?.mesh;
  const k = mesh?.userData?._kick;
  if (!k) return false;
  const elapsed = now - k.startTs;
  const t = Math.min(1, elapsed / k.durMs);
  const cf = k.contactFrac;

  // Body lunge: parabolic peak at contact frame.
  let lunge;
  if (t <= cf) {
    lunge = (t / cf) * KICK_REACH;
  } else {
    lunge = (1 - (t - cf) / (1 - cf)) * KICK_REACH;
  }
  mesh.position.x = k.origX + k.dirX * lunge;
  mesh.position.z = k.origZ + k.dirZ * lunge;

  // Leg swing: pull back to windup, snap through at contact, settle.
  if (k.kickLeg) {
    let swing;
    if (t <= cf) {
      swing = -(t / cf) * 0.95;                 // windup to ~-55°
    } else {
      const post = (t - cf) / (1 - cf);         // 0..1 after contact
      // Snap through +0.7 rad then settle back to 0
      swing = -0.95 * (1 - Math.min(1, post * 2)) + Math.max(0, 1 - post * 1.4) * 0.7 * (post > 0 ? 1 : 0);
    }
    k.kickLeg.rotation.x = swing;
  }

  // Fire contact exactly once.
  if (!k.contacted && elapsed >= k.durMs * cf) {
    k.contacted = true;
    if (k.onContact) k.onContact();
  }

  if (t >= 1) {
    mesh.position.x = k.origX;
    mesh.position.z = k.origZ;
    if (k.kickLeg) k.kickLeg.rotation.x = k.origLegRot;
    delete mesh.userData._kick;
    return false;
  }
  return true;
}

function isKicking(entry) {
  return !!entry?.mesh?.userData?._kick;
}

/**
 * If a scenario doesn't declare its own passTargets, synthesise three
 * receivers — one forward, biased away from the nearest defender (correct),
 * two lateral decoys. Guarantees a scoreable play-out for every legacy round.
 */
function synthesizePassTargets(playerPos, defenderPos) {
  // Escape vector = from defender to player. Defaults to +X if no defender.
  let ex = 1, ez = 0;
  if (defenderPos) {
    ex = playerPos.x - defenderPos.x;
    ez = playerPos.z - defenderPos.z;
    const len = Math.hypot(ex, ez) || 1;
    ex /= len; ez /= len;
  }
  const correct = [playerPos.x + ex * 8, 0, playerPos.z + ez * 8];
  const perpX = -ez, perpZ = ex;
  const decoyL = [playerPos.x + perpX * 6 + ex * 2, 0, playerPos.z + perpZ * 6 + ez * 2];
  const decoyR = [playerPos.x - perpX * 6 + ex * 2, 0, playerPos.z - perpZ * 6 + ez * 2];
  return [
    { pos: correct, label: 'FWD', correct: true },
    { pos: decoyL,  label: 'L',   correct: false },
    { pos: decoyR,  label: 'R',   correct: false },
  ];
}

function dotDirScore(fx, fz, tx, tz) {
  const len = Math.hypot(tx, tz) || 1;
  const nx = tx / len, nz = tz / len;
  const dot = fx * nx + fz * nz;               // -1..+1
  return Math.round(((dot + 1) / 2) * 100);    // 0..100
}

// ============================================================================
// Component
// ============================================================================

export default function BodyShapeEliteGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const playerProfile = (location.state && location.state.playerProfile) || {};

  const containerRef = useRef(null);
  const handlesRef = useRef(null);
  const passerRef = useRef(null);
  const playerRef = useRef(null);
  const defenderRefs = useRef([]);
  const passTargetRefs = useRef([]);           // [{ mesh, ring?, highlightRing?, isCorrect, label }]
  const ballRef = useRef(null);
  const passerStateRingRef = useRef(null);
  const idealArrowRef = useRef(null);          // cyan ideal-shape guide (rotate to match)
  const passTargetArrowRef = useRef(null);     // lime pass-target pointer (points TO the player)

  // ---- On-pitch rotate handle (drag to rotate the player) ----
  const rotateRingRef = useRef(null);          // orange ring at YOU's feet
  const rotateLabelRef = useRef(null);         // "ROTATE" sprite above the ring
  const rotateDragRef = useRef({ active: false });
  const raycasterRef = useRef(new THREE.Raycaster());
  const groundPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  const keysRef = useRef(new Set());
  const phaseRef = useRef('intro');
  const phaseStartRef = useRef(0);
  const scenarioRef = useRef(null);
  const passerStateRef = useRef({ state: 'scanning', switchAt: 0 });

  // Receive-side
  const runStartRef = useRef(null);
  const passerStateAtRunStartRef = useRef(null);
  const touchDirRef = useRef(null);            // { x, z } — first-touch direction
  const orientAtReceiveRef = useRef(null);     // { fx, fz } — snapshot at ball arrival
  const receiveScoresRef = useRef(null);       // { timingScore, orientScore, touchScore }

  // Play-out-side
  const passTapRef = useRef(null);             // { x, z } — WASD tap direction
  const passShapeAtTapRef = useRef(null);      // { fx, fz } — player facing at tap

  // Carrier: 'passer' | 'inflight' | 'player' | 'settled'
  const ballCarrierRef = useRef('passer');

  const clockRef = useRef(0);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(performance.now());
  const phaseTimeoutRef = useRef(null);
  const roundScoresRef = useRef([]);

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

  const totalRounds = BODY_SHAPE_SCENARIOS.length;

  const setPhaseBoth = (p) => { phaseRef.current = p; setPhase(p); };
  const clearPhaseTimeout = () => {
    if (phaseTimeoutRef.current) { clearTimeout(phaseTimeoutRef.current); phaseTimeoutRef.current = null; }
  };

  // -------------------------------------------------------------------------
  // Scene + animation loop
  // -------------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handles = createPitchScene({
      container,
      cameraPosition: [0, 10, 13],
      cameraTarget: [0, 1.2, 2],
      fov: 44,
    });
    handlesRef.current = handles;
    const ball = createBallMesh();
    handles.scene.add(ball);
    ballRef.current = ball;

    // Passer state ring (green = ready, amber = scanning)
    const ring = createHighlightRing(0xf59e0b, { innerR: 1.0, outerR: 1.3 });
    ring.visible = false;
    handles.scene.add(ring);
    passerStateRingRef.current = ring;

    // Cyan ideal-shape guide arrow (rotate your body to match this).
    const idealArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0.06, 0),
      2.0,
      IDEAL_ARROW_COLOR,
      0.6,
      0.44,
    );
    if (idealArrow.line?.material) {
      idealArrow.line.material.transparent = true;
      idealArrow.line.material.opacity = 0.7;
    }
    if (idealArrow.cone?.material) {
      idealArrow.cone.material.transparent = true;
      idealArrow.cone.material.opacity = 0.7;
    }
    idealArrow.visible = false;
    idealArrow.renderOrder = 997;
    handles.scene.add(idealArrow);
    idealArrowRef.current = idealArrow;

    // Lime pass-target arrow — sits at the correct receiver during passSetup
    // and points AT the player ("I'm open, pass it to me over here").
    const passTargetArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0.06, 0),
      2.6,
      PASS_TARGET_ARROW_COLOR,
      0.75,
      0.55,
    );
    if (passTargetArrow.line?.material) {
      passTargetArrow.line.material.transparent = true;
      passTargetArrow.line.material.opacity = 0.85;
    }
    if (passTargetArrow.cone?.material) {
      passTargetArrow.cone.material.transparent = true;
      passTargetArrow.cone.material.opacity = 0.9;
    }
    passTargetArrow.visible = false;
    passTargetArrow.renderOrder = 997;
    handles.scene.add(passTargetArrow);
    passTargetArrowRef.current = passTargetArrow;

    // ---- Drag-to-rotate handle: an orange torus-style ring at YOU's feet
    // plus a "ROTATE" sprite. The ring is the visible affordance; the actual
    // pointer target is the whole disc within DRAG_RADIUS of the player, so
    // clicking anywhere near the player initiates a body-shape drag.
    const rotateRing = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 1.7, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffa733,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    rotateRing.rotation.x = -Math.PI / 2;
    rotateRing.position.y = 0.02;
    rotateRing.visible = false;
    rotateRing.renderOrder = 995;
    handles.scene.add(rotateRing);
    rotateRingRef.current = rotateRing;

    const rotateLabel = createLabelSprite('ROTATE', {
      bg: 'rgba(20,10,0,0.82)',
      fg: '#ffffff',
      accent: '#ffa733',
      fontSize: 44,
    });
    rotateLabel.scale.set(1.6, 0.8, 1);
    rotateLabel.visible = false;
    handles.scene.add(rotateLabel);
    rotateLabelRef.current = rotateLabel;

    // ---- Pointer handlers (drag-to-rotate) ----
    const DRAG_RADIUS = 3.2;

    const worldFromEvent = (event) => {
      const rect = container.getBoundingClientRect();
      const src = event.touches && event.touches.length ? event.touches[0]
                : event.changedTouches && event.changedTouches.length ? event.changedTouches[0]
                : event;
      const mouse = new THREE.Vector2(
        ((src.clientX - rect.left) / rect.width) * 2 - 1,
        -((src.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(mouse, handles.camera);
      const out = new THREE.Vector3();
      const hit = raycasterRef.current.ray.intersectPlane(groundPlaneRef.current, out);
      return hit ? out : null;
    };

    const canRotate = () => {
      const p = phaseRef.current;
      return p === 'move' || p === 'orient' || p === 'passSetup';
    };

    const onPointerDown = (e) => {
      if (!canRotate()) return;
      const player = playerRef.current;
      if (!player) return;
      const world = worldFromEvent(e);
      if (!world) return;
      const dx = world.x - player.mesh.position.x;
      const dz = world.z - player.mesh.position.z;
      if (Math.hypot(dx, dz) > DRAG_RADIUS) return;
      rotateDragRef.current.active = true;
      container.style.cursor = 'grabbing';
      player.mesh.lookAt(world.x, 0, world.z);
      e.preventDefault && e.preventDefault();
    };
    const onPointerMove = (e) => {
      if (!rotateDragRef.current.active) return;
      const player = playerRef.current;
      if (!player) return;
      const world = worldFromEvent(e);
      if (!world) return;
      player.mesh.lookAt(world.x, 0, world.z);
    };
    const onPointerUp = () => {
      if (!rotateDragRef.current.active) return;
      rotateDragRef.current.active = false;
      container.style.cursor = canRotate() ? 'grab' : 'default';
    };
    const onPointerOver = () => {
      if (canRotate() && !rotateDragRef.current.active) container.style.cursor = 'grab';
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerUp);
    container.addEventListener('pointerover', onPointerOver);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);

    const onResize = () => handles.resize();
    window.addEventListener('resize', onResize);
    loadRound(0);

    const animate = (now) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;
      clockRef.current += dt;

      updatePasserState(now);
      stepPasser(dt, now);
      stepPlayer(dt, now);
      stepDefenders(dt);
      updateBall(now);
      updateIdealArrow();
      updateRotateHandle();

      handles.renderer.render(handles.scene, handles.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearPhaseTimeout();
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerUp);
      container.removeEventListener('pointerover', onPointerOver);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      handles.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  useEffect(() => {
    const onDown = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'q', 'e', ' '].includes(k)) e.preventDefault();
      keysRef.current.add(k);
      const phaseNow = phaseRef.current;

      // First input during positioning stamps the "run start" for the timing score.
      if (phaseNow === 'move' && runStartRef.current == null) {
        if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','q','e'].includes(k)) {
          runStartRef.current = performance.now() - phaseStartRef.current;
          passerStateAtRunStartRef.current = passerStateRef.current.state;
        }
      }

      // SPACE during move = "call for the ball" — snapshots passer state for timing.
      if (phaseNow === 'move' && k === ' ') {
        callForBall();
      }

      // First-touch tap during firstTouch (single WASD tap).
      if (phaseNow === 'firstTouch' && !touchDirRef.current) {
        const dir = readTapDir(k);
        if (dir) {
          touchDirRef.current = dir;
          finishReceive();
        }
      }

      // Pass-out tap during passSetup (single WASD tap; guard against repeats).
      if (phaseNow === 'passSetup' && !passTapRef.current) {
        const dir = readTapDir(k);
        if (dir) {
          handlePassTap(dir.x, dir.z);
        }
      }
    };
    const onUp = (e) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readTapDir = (k) => {
    let tx = 0, tz = 0;
    if (k === 'arrowup' || k === 'w') tz -= 1;
    if (k === 'arrowdown' || k === 's') tz += 1;
    if (k === 'arrowleft' || k === 'a') tx -= 1;
    if (k === 'arrowright' || k === 'd') tx += 1;
    if (tx === 0 && tz === 0) return null;
    const len = Math.hypot(tx, tz);
    return { x: tx / len, z: tz / len };
  };

  const callForBall = () => {
    if (phaseRef.current !== 'move') return;
    passerStateAtRunStartRef.current = passerStateRef.current.state;
    if (runStartRef.current == null) {
      runStartRef.current = performance.now() - phaseStartRef.current;
    }
    clearPhaseTimeout();
    triggerPass();
  };

  // -------------------------------------------------------------------------
  // Per-frame steps
  // -------------------------------------------------------------------------

  const updatePasserState = (now) => {
    const state = passerStateRef.current;
    if (now >= state.switchAt) {
      const scn = scenarioRef.current;
      const cyc = scn?.passerCycle || { scanMinMs: 900, scanMaxMs: 1300, readyMinMs: 900, readyMaxMs: 1300 };
      if (state.state === 'scanning') {
        state.state = 'ready';
        state.switchAt = now + cyc.readyMinMs + Math.random() * (cyc.readyMaxMs - cyc.readyMinMs);
      } else {
        state.state = 'scanning';
        state.switchAt = now + cyc.scanMinMs + Math.random() * (cyc.scanMaxMs - cyc.scanMinMs);
      }
    }
    const ring = passerStateRingRef.current;
    const passer = passerRef.current;
    if (!ring || !passer) return;

    // Ring is only meaningful during move (before the pass is played).
    const showRing = phaseRef.current === 'move';
    ring.visible = showRing;
    if (!showRing) return;

    ring.position.set(passer.mesh.position.x, 0.05, passer.mesh.position.z);
    const color = state.state === 'ready' ? ELITE_COLORS.success : ELITE_COLORS.amber;
    ring.material.color.setHex(color);
    const pulse = 0.55 + Math.sin(clockRef.current * (state.state === 'ready' ? 8 : 4)) * 0.25;
    ring.material.opacity = pulse;
    // Small head-tilt on the passer while positioning (only, so we don't fight the kick's lookAt)
    if (!isKicking(passer)) {
      passer.mesh.rotation.y = Math.sin(clockRef.current * (state.state === 'ready' ? 1 : 3)) * (state.state === 'ready' ? 0.15 : 0.6);
    }
  };

  const stepPasser = (dt, now) => {
    const passer = passerRef.current;
    if (!passer) return;
    if (isKicking(passer)) {
      stepKick(passer, now);
      return;
    }
    animatePlayerStep(passer.mesh, false, dt);
  };

  const stepPlayer = (dt, now) => {
    const player = playerRef.current;
    if (!player) return;
    const mesh = player.mesh;
    const phaseNow = phaseRef.current;
    const k = keysRef.current;

    // Kick lunge takes precedence over walking gait.
    if (isKicking(player)) {
      stepKick(player, now);
      updateYouRing();
      return;
    }

    // Body rotation is driven ENTIRELY by dragging the on-pitch rotate
    // handle now — no keyboard rotation. See onPointerDown/Move handlers.

    // WASD movement only during move phase.
    if (phaseNow === 'move') {
      let dx = 0, dz = 0;
      if (k.has('w')) dz -= 1;
      if (k.has('s')) dz += 1;
      if (k.has('a')) dx -= 1;
      if (k.has('d')) dx += 1;
      const len = Math.hypot(dx, dz);
      if (len > 0) {
        dx /= len; dz /= len;
        mesh.position.x += dx * PLAYER_SPEED * dt;
        mesh.position.z += dz * PLAYER_SPEED * dt;
        animatePlayerStep(mesh, true, dt);
      } else {
        animatePlayerStep(mesh, false, dt);
      }
    } else {
      animatePlayerStep(mesh, false, dt);
    }

    updateYouRing();
  };

  const updateYouRing = () => {
    const player = playerRef.current;
    if (!player?.ring) return;
    const p = player.mesh.position;
    player.ring.position.set(p.x, 0.03, p.z);
    player.ring.material.opacity = 0.55 + Math.sin(clockRef.current * 6) * 0.25;
  };

  const stepDefenders = (dt) => {
    // Face the ball for a light sense of engagement — no chasing.
    const ballPos = ballRef.current?.position;
    defenderRefs.current.forEach((d) => {
      if (ballPos) d.mesh.lookAt(ballPos.x, 0, ballPos.z);
      animatePlayerStep(d.mesh, false, dt);
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
        const cb = state.onDone; state.onDone = null;
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
        const cb = state.onDone; state.onDone = null;
        if (cb) cb();
      }
      return;
    }
    // idle → park by carrier. Do NOT park after user has received the ball.
    if (ballCarrierRef.current === 'passer' && passerRef.current) {
      const p = passerRef.current.mesh.position;
      ball.position.set(p.x + 0.3, 0.24, p.z + 0.1);
    } else if (ballCarrierRef.current === 'player' && playerRef.current) {
      const p = playerRef.current.mesh.position;
      const q = playerRef.current.mesh.quaternion;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      ball.position.set(p.x + forward.x * 0.5, 0.24, p.z + forward.z * 0.5);
    }
    // 'inflight' + 'settled' — leave ball where it is.
  };

  // -------------------------------------------------------------------------
  // Ideal-shape guide arrow
  // -------------------------------------------------------------------------

  const updateIdealArrow = () => {
    const idealArrow = idealArrowRef.current;
    const passArrow = passTargetArrowRef.current;
    const phaseNow = phaseRef.current;
    const player = playerRef.current;

    // Default: everything hidden. Each branch re-shows what it wants.
    if (idealArrow) idealArrow.visible = false;
    if (passArrow) passArrow.visible = false;
    if (!player) return;

    // Cyan rotation guide during RECEIVE (move + orient). It sits under the
    // player and points AWAY from the nearest defender — rotate to match.
    if (idealArrow && (phaseNow === 'move' || phaseNow === 'orient')) {
      const nearDef = findNearestDefender(player.mesh.position);
      let vx = 0, vz = -1;
      if (nearDef) {
        vx = player.mesh.position.x - nearDef.mesh.position.x;
        vz = player.mesh.position.z - nearDef.mesh.position.z;
      }
      const len = Math.hypot(vx, vz);
      if (len >= 0.001) {
        const dir = new THREE.Vector3(vx / len, 0, vz / len);
        idealArrow.visible = true;
        idealArrow.position.set(player.mesh.position.x, 0.06, player.mesh.position.z);
        idealArrow.setDirection(dir);
        const pulse = 0.65 + Math.sin(clockRef.current * 3.4) * 0.2;
        if (idealArrow.line?.material) idealArrow.line.material.opacity = Math.max(0.35, pulse);
        if (idealArrow.cone?.material) idealArrow.cone.material.opacity = Math.max(0.4, pulse);
      }
    }

    // Lime pass-target arrow during PLAY OUT. It sits at the correct receiver
    // and points AT the player — the receiver signalling "I'm open, pass here".
    if (passArrow && phaseNow === 'passSetup') {
      const correct = passTargetRefs.current.find((t) => t.isCorrect);
      if (correct) {
        const rx = correct.mesh.position.x;
        const rz = correct.mesh.position.z;
        const dx = player.mesh.position.x - rx;
        const dz = player.mesh.position.z - rz;
        const len = Math.hypot(dx, dz);
        if (len >= 0.001) {
          const dir = new THREE.Vector3(dx / len, 0, dz / len);
          passArrow.visible = true;
          passArrow.position.set(rx, 0.06, rz);
          passArrow.setDirection(dir);
          const pulse = 0.8 + Math.sin(clockRef.current * 4.2) * 0.2;
          if (passArrow.line?.material) passArrow.line.material.opacity = Math.max(0.45, pulse);
          if (passArrow.cone?.material) passArrow.cone.material.opacity = Math.max(0.55, pulse);
        }
      }
    }
  };

  // Rotation handle follows YOU during shape-relevant phases and pulses.
  const updateRotateHandle = () => {
    const ring = rotateRingRef.current;
    const label = rotateLabelRef.current;
    const player = playerRef.current;
    const phaseNow = phaseRef.current;
    const canRot = phaseNow === 'move' || phaseNow === 'orient' || phaseNow === 'passSetup';
    if (!ring || !label) return;
    if (!player || !canRot) {
      ring.visible = false;
      label.visible = false;
      return;
    }
    const p = player.mesh.position;
    ring.visible = true;
    ring.position.set(p.x, 0.02, p.z);
    const pulse = 0.65 + Math.sin(clockRef.current * 4) * 0.25;
    ring.material.opacity = Math.max(0.4, pulse);
    label.visible = true;
    // Sits above the player's head; small vertical bob so it draws the eye.
    label.position.set(p.x, 2.6 + Math.sin(clockRef.current * 3) * 0.08, p.z);
  };

  // -------------------------------------------------------------------------
  // Phase transitions
  // -------------------------------------------------------------------------

  const triggerPass = () => {
    if (!passerRef.current || !playerRef.current) return;
    const passer = passerRef.current;
    const player = playerRef.current;
    const dx = player.mesh.position.x - passer.mesh.position.x;
    const dz = player.mesh.position.z - passer.mesh.position.z;
    const len = Math.hypot(dx, dz) || 1;
    const dirX = dx / len;
    const dirZ = dz / len;

    setPhaseBoth('orient');
    // Passer lunges, then releases the ball at contact.
    startKick(passer, dirX, dirZ, KICK_DUR_MS, () => {
      // Release the ball off the foot into a low arc to the player.
      const start = passer.mesh.position.clone(); start.y = 0.24;
      const end = player.mesh.position.clone(); end.y = 0.24;
      ballStateRef.current.mode = 'arc';
      ballStateRef.current.start.copy(start);
      ballStateRef.current.end.copy(end);
      ballStateRef.current.control.copy(makeArcControl(start, end, 1.4));
      ballStateRef.current.startTime = performance.now();
      ballStateRef.current.duration = ORIENT_WINDOW_MS;
      ballCarrierRef.current = 'inflight';
      ballStateRef.current.onDone = () => {
        // Ball at player's feet.
        ballCarrierRef.current = 'player';
        const mesh = player.mesh;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
        orientAtReceiveRef.current = { fx: forward.x, fz: forward.z };
        setPhaseBoth('firstTouch');
        phaseTimeoutRef.current = setTimeout(() => {
          if (phaseRef.current === 'firstTouch' && !touchDirRef.current) {
            finishReceive();
          }
        }, FIRST_TOUCH_WINDOW_MS);
      };
    });
  };

  const finishReceive = () => {
    clearPhaseTimeout();
    const player = playerRef.current;
    if (!player) return;

    // ---- Receive scores (kept in receiveScoresRef, added to totals in resolvePassOut) ----

    let timingScore = 20;
    if (runStartRef.current == null) timingScore = 0;
    else if (passerStateAtRunStartRef.current === 'ready') timingScore = 100;
    else timingScore = 30;

    let orientScore = 50;
    const nearDef = findNearestDefender(player.mesh.position);
    const orient = orientAtReceiveRef.current;
    if (orient && nearDef) {
      const toDefX = nearDef.mesh.position.x - player.mesh.position.x;
      const toDefZ = nearDef.mesh.position.z - player.mesh.position.z;
      // Forward should point AWAY from defender → dot(forward, awayDir) mapped 0..100.
      orientScore = dotDirScore(orient.fx, orient.fz, -toDefX, -toDefZ);
    }

    let touchScore = 0;
    const td = touchDirRef.current;
    if (td && nearDef) {
      const toDefX = nearDef.mesh.position.x - player.mesh.position.x;
      const toDefZ = nearDef.mesh.position.z - player.mesh.position.z;
      touchScore = dotDirScore(td.x, td.z, -toDefX, -toDefZ);
    } else if (td) {
      touchScore = 60;
    }

    receiveScoresRef.current = { timingScore, orientScore, touchScore };

    // Short visible touch nudge for the ball (kept short so it stays with the player).
    if (td && ballRef.current && playerRef.current) {
      const b = ballRef.current;
      const startPos = new THREE.Vector3(b.position.x, 0.24, b.position.z);
      const endPos = new THREE.Vector3(b.position.x + td.x * 1.2, 0.24, b.position.z + td.z * 1.2);
      ballStateRef.current.mode = 'ground';
      ballStateRef.current.start.copy(startPos);
      ballStateRef.current.end.copy(endPos);
      ballStateRef.current.startTime = performance.now();
      ballStateRef.current.duration = 320;
      ballStateRef.current.onDone = () => {
        // Player "runs onto" the first touch.
        if (playerRef.current) {
          playerRef.current.mesh.position.set(
            ballRef.current.position.x,
            0,
            ballRef.current.position.z,
          );
        }
        ballCarrierRef.current = 'player';
        startPassSetup();
      };
    } else {
      // No touch made — go straight to passSetup with ball where it landed.
      ballCarrierRef.current = 'player';
      startPassSetup();
    }
  };

  // -------------------------------------------------------------------------
  // Play-out phase
  // -------------------------------------------------------------------------

  const startPassSetup = () => {
    const scn = scenarioRef.current;
    if (!scn || !playerRef.current) return;

    // Resolve pass targets (scenario-provided or synthesised).
    const nearDef = findNearestDefender(playerRef.current.mesh.position);
    const rawTargets = (scn.passTargets && scn.passTargets.length > 0)
      ? scn.passTargets
      : synthesizePassTargets(playerRef.current.mesh.position, nearDef?.mesh.position);

    // Ensure at least one is marked correct.
    if (!rawTargets.some((t) => t.correct)) rawTargets[0].correct = true;

    rawTargets.forEach((t) => {
      const entry = buildActor(t.pos, ELITE_COLORS.pass, t.label || 'T');
      entry.isCorrect = !!t.correct;
      if (t.correct) {
        const ring = createHighlightRing(ELITE_COLORS.success, { innerR: 0.9, outerR: 1.15 });
        ring.position.set(t.pos[0], 0.04, t.pos[2]);
        handlesRef.current.scene.add(ring);
        entry.highlightRing = ring;
      }
      passTargetRefs.current.push(entry);
    });

    passTapRef.current = null;
    passShapeAtTapRef.current = null;
    setPhaseBoth('passSetup');

    // Auto-resolve at 2800ms if the user never taps.
    phaseTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === 'passSetup' && !passTapRef.current) {
        autoResolveOut();
      }
    }, PASS_SETUP_WINDOW_MS);
  };

  const handlePassTap = (tx, tz) => {
    if (phaseRef.current !== 'passSetup' || passTapRef.current) return;
    passTapRef.current = { x: tx, z: tz };
    const mesh = playerRef.current.mesh;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
    passShapeAtTapRef.current = { fx: forward.x, fz: forward.z };
    clearPhaseTimeout();

    setPhaseBoth('passResolve');
    // Player kick in the tapped direction. Contact fires the ground pass.
    startKick(playerRef.current, tx, tz, KICK_DUR_MS, () => sendPlayerPassBall());
  };

  const sendPlayerPassBall = () => {
    const correct = passTargetRefs.current.find((t) => t.isCorrect);
    if (!correct || !playerRef.current) { resolvePassOut(false); return; }
    const start = new THREE.Vector3(playerRef.current.mesh.position.x, 0.24, playerRef.current.mesh.position.z);
    const end = new THREE.Vector3(correct.mesh.position.x, 0.24, correct.mesh.position.z);
    ballStateRef.current.mode = 'ground';
    ballStateRef.current.start.copy(start);
    ballStateRef.current.end.copy(end);
    ballStateRef.current.startTime = performance.now();
    ballStateRef.current.duration = 620;
    ballCarrierRef.current = 'inflight';
    ballStateRef.current.onDone = () => {
      ballCarrierRef.current = 'settled';
      resolvePassOut(false);
    };
  };

  const autoResolveOut = () => {
    // No tap. Snapshot current body shape for scoring; pass direction stays 0.
    if (!playerRef.current) return;
    const mesh = playerRef.current.mesh;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
    passShapeAtTapRef.current = { fx: forward.x, fz: forward.z };
    setPhaseBoth('passResolve');
    // Play a safe visual pass into the correct receiver so the round still lands.
    sendPlayerPassBall();
  };

  const resolvePassOut = () => {
    const player = playerRef.current;
    const correct = passTargetRefs.current.find((t) => t.isCorrect);
    if (!player || !correct) return;

    const tx = correct.mesh.position.x - player.mesh.position.x;
    const tz = correct.mesh.position.z - player.mesh.position.z;

    // Body shape score: player's facing at the moment of the tap vs dir to correct.
    let bodyShapeScore = 0;
    const shape = passShapeAtTapRef.current;
    if (shape) {
      bodyShapeScore = dotDirScore(shape.fx, shape.fz, tx, tz);
    }

    // Pass direction score: tapped direction vs dir to correct. No tap = 0.
    let passDirScore = 0;
    const tap = passTapRef.current;
    if (tap) {
      passDirScore = dotDirScore(tap.x, tap.z, tx, tz);
    }

    const receive = receiveScoresRef.current || { timingScore: 0, orientScore: 0, touchScore: 0 };
    const points = Math.round(
      (receive.timingScore / 100) * W_TIMING +
      (receive.orientScore / 100) * W_ORIENT +
      (receive.touchScore  / 100) * W_TOUCH  +
      (bodyShapeScore      / 100) * W_BODY_SHAPE +
      (passDirScore        / 100) * W_PASS_DIR
    );

    roundScoresRef.current.push({ ...receive, bodyShapeScore, passDirScore, points });
    setScore((s) => s + points);
    setFeedback({
      timingScore: receive.timingScore,
      orientScore: receive.orientScore,
      touchScore: receive.touchScore,
      bodyShapeScore,
      passDirScore,
      points,
      scn: scenarioRef.current,
    });
    setPhaseBoth('feedback');
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const findNearestDefender = (pos) => {
    let best = null;
    let bestD = Infinity;
    defenderRefs.current.forEach((d) => {
      const dd = Math.hypot(d.mesh.position.x - pos.x, d.mesh.position.z - pos.z);
      if (dd < bestD) { bestD = dd; best = d; }
    });
    return best;
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
      if (entry.highlightRing) {
        scene.remove(entry.highlightRing);
        entry.highlightRing.geometry.dispose();
        entry.highlightRing.material.dispose();
      }
    };
    drop(passerRef.current);
    drop(playerRef.current);
    defenderRefs.current.forEach(drop);
    defenderRefs.current = [];
    passTargetRefs.current.forEach(drop);
    passTargetRefs.current = [];
    passerRef.current = null;
    playerRef.current = null;
    if (idealArrowRef.current) idealArrowRef.current.visible = false;
    if (passTargetArrowRef.current) passTargetArrowRef.current.visible = false;
    if (rotateRingRef.current) rotateRingRef.current.visible = false;
    if (rotateLabelRef.current) rotateLabelRef.current.visible = false;
    rotateDragRef.current.active = false;
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
    if (opts.forwardArrow) {
      // Child of mesh so yaw follows mesh.rotation.y. Local -Z is forward.
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 0.08, 0),
        1.7,
        opts.forwardArrow,
        0.55,
        0.42,
      );
      if (arrow.line?.material) {
        arrow.line.material.transparent = true;
        arrow.line.material.opacity = 0.95;
      }
      if (arrow.cone?.material) {
        arrow.cone.material.transparent = true;
        arrow.cone.material.opacity = 0.95;
      }
      arrow.renderOrder = 998;
      mesh.add(arrow);
      entry.forwardArrow = arrow;
    }
    return entry;
  };

  const loadRound = (idx) => {
    clearActors();
    clearPhaseTimeout();
    const scn = BODY_SHAPE_SCENARIOS[idx];
    scenarioRef.current = scn;
    setFeedback(null);
    runStartRef.current = null;
    passerStateAtRunStartRef.current = null;
    touchDirRef.current = null;
    orientAtReceiveRef.current = null;
    passTapRef.current = null;
    passShapeAtTapRef.current = null;
    receiveScoresRef.current = null;

    passerRef.current = buildActor(scn.passer.pos, ELITE_COLORS.neutralHome, 'P');
    playerRef.current = buildActor(scn.playerStart, ELITE_COLORS.you, 'YOU', {
      ring: ELITE_COLORS.youRing,
      forwardArrow: ELITE_COLORS.you,
    });
    scn.defenders.forEach((d, i) => {
      defenderRefs.current.push(buildActor(d.pos, ELITE_COLORS.away, String(i + 1)));
    });

    const cyc = scn.passerCycle || { scanMinMs: 900, scanMaxMs: 1300, readyMinMs: 900, readyMaxMs: 1300 };
    passerStateRef.current.state = Math.random() < 0.5 ? 'scanning' : 'ready';
    passerStateRef.current.switchAt = performance.now() + (
      passerStateRef.current.state === 'ready'
        ? cyc.readyMinMs + Math.random() * (cyc.readyMaxMs - cyc.readyMinMs)
        : cyc.scanMinMs + Math.random() * (cyc.scanMaxMs - cyc.scanMinMs)
    );

    ballStateRef.current.mode = 'idle';
    ballStateRef.current.onDone = null;
    ballCarrierRef.current = 'passer';

    phaseStartRef.current = performance.now();
    setPhaseBoth('move');
    phaseTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === 'move') triggerPass();
    }, scn.passAt || 3000);
  };

  const goNext = () => {
    clearPhaseTimeout();
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
      useEliteStore.getState().setEliteResult('elite_body_shape', { score: finalScore, reactionTime: null });
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
          gameType: 'elite_body_shape',
          score: finalScore,
          reactionTime: null,
        });
        toast.success('Elite Body Shape saved');
      } catch (err) {
        toast.error("Couldn't save elite body shape score");
      }
    }
  };

  const back = () => navigate('/demo', { state: { playerProfile } });
  const scn = scenarioRef.current;
  const stateLabel = passerStateRef.current.state === 'ready' ? 'PASSER READY' : 'PASSER SCANNING';
  const stateColor = passerStateRef.current.state === 'ready' ? '#2ead3c' : '#f59e0b';

  const isReceivePhase = phase === 'move' || phase === 'orient' || phase === 'firstTouch';
  const isPlayOutPhase = phase === 'passSetup' || phase === 'passResolve';

  return (
    <EliteGameShell title="Body Shape — ELITE 3D" subtitle={`Round ${Math.min(roundIdx + 1, totalRounds)} / ${totalRounds}`} onBack={back}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />

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

          {(isReceivePhase || isPlayOutPhase) && (
            <div style={promptWrap}>
              <div style={promptTitle}>
                {isPlayOutPhase ? `${scn?.title} · PLAY OUT` : scn?.title}
              </div>
              <div style={promptText}>
                {isPlayOutPhase
                  ? (scn?.passInstruction || 'You have the ball. Open your hips toward the highlighted receiver, then tap WASD to play the pass.')
                  : scn?.instruction}
              </div>
              {phase === 'move' && (
                <div style={{ fontSize: 11, marginTop: 6, color: stateColor, letterSpacing: 2 }}>
                  {stateLabel}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 6, lineHeight: 1.7 }}>
                {phase === 'move' && (
                  <>
                    <strong>WASD</strong> position · <strong>drag the orange ROTATE ring</strong> around YOU to open your body ·{' '}
                    <strong>SPACE</strong> call for the ball when the passer's head is up.
                    The cyan arrow shows the ideal shape — face away from pressure.
                  </>
                )}
                {phase === 'orient' && (
                  <>Ball in flight — <strong>drag the orange ROTATE ring</strong> to fine-tune your body shape as it arrives.</>
                )}
                {phase === 'firstTouch' && (
                  <>Tap <strong>WASD</strong> once — direction of your first touch away from pressure.</>
                )}
                {phase === 'passSetup' && (
                  <>
                    <strong>Drag the orange ROTATE ring</strong> to open your hips toward the lime arrow ·{' '}
                    <strong>tap WASD</strong> once to release the pass.
                  </>
                )}
                {phase === 'passResolve' && <>Pass on its way…</>}
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'feedback' && feedback && (
        <div style={feedbackWrap}>
          <div style={{ ...feedbackCard, borderLeft: `4px solid ${feedback.points >= 70 ? '#2ead3c' : '#f59e0b'}` }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: feedback.points >= 70 ? '#2ead3c' : '#f59e0b', marginBottom: 12 }}>
              {feedback.points >= 70 ? '✓ SHARP TWO-TOUCH REP' : '△ CLEANER SHAPE NEXT TIME'}
            </div>

            <div style={groupLabel}>RECEIVE</div>
            <MetricBar label="Timing (read passer)" value={feedback.timingScore} />
            <MetricBar label="Body orientation" value={feedback.orientScore} />
            <MetricBar label="First touch" value={feedback.touchScore} />

            <div style={{ ...groupLabel, marginTop: 12 }}>PLAY OUT</div>
            <MetricBar label="Body shape" value={feedback.bodyShapeScore} />
            <MetricBar label="Pass direction" value={feedback.passDirScore} />

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 12, lineHeight: 1.6 }}>
              Great receivers open their hips BEFORE the ball arrives — and set the same shape when they play it out.
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
    </EliteGameShell>
  );
}

function MetricBar({ label, value }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const color = clamped >= 75 ? '#2ead3c' : clamped >= 45 ? '#facc15' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
      <div style={{ width: 160, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{label}</div>
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
  maxWidth: 520, width: '100%', background: '#080e0a', padding: '24px 28px',
  border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'JetBrains Mono', monospace",
};
const groupLabel = {
  fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase', marginBottom: 6, marginTop: 4,
};
const nextBtn = {
  padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
  color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: 1.4, fontSize: 12,
};
