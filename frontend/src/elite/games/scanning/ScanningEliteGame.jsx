import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import EliteIntroCard from '../../ui/EliteIntroCard';
import { submitScore } from '@/services/api';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// All players are PROCEDURAL now (createPlayerMesh). YOU wears the orange
// kit, gets a "YOU" nameplate sprite and an orange ring under their feet.
// Defenders have no number label — passing `null` skips the sprite in
// createPlayerMesh entirely, so there is literally nothing to hide.
// ---------------------------------------------------------------------------

// -------- Anatomy of a check ----------------------------------------------
// With a procedural body (no head bone we can rotate independently), the
// whole player twists to check a shoulder. Max yaw is capped modestly so
// the body stays broadly open to the CB.
const MAX_HEAD_YAW = 80 * (Math.PI / 180);
const REVEAL_CONE_HALF = 35 * (Math.PI / 180);
/** Max angle from the player's forward a check can reach. */
const MAX_REACH_RAD = MAX_HEAD_YAW + REVEAL_CONE_HALF;

// One check: ease out, hold at peak, ease back. ~520ms total.
const CHECK_OUT_MS = 200;
const CHECK_HOLD_MS = 120;
const CHECK_RETURN_MS = 200;
const CHECK_TOTAL_MS = CHECK_OUT_MS + CHECK_HOLD_MS + CHECK_RETURN_MS;

// -------- Pass release timing ---------------------------------------------
// Round 1 starts at exactly 3s. Later rounds tick down in 200ms steps and
// the floor keeps round 5 (with any age difficulty on top) at ~2s.
const PASS_RELEASE_MS_BASE = 3000;

// -------- Defenders -------------------------------------------------------
const MARK_ANGLE_MIN_DEG = 95;
// Kept safely inside MAX_REACH (=115°) with margin so every defender can
// be revealed with a properly timed scan on their shoulder.
const MARK_ANGLE_MAX_DEG = 110;
const MARK_DIST_MIN = 3.5;
const MARK_DIST_MAX = 6.0;
const MARK_LAG_TAU = 0.35;
const MAX_DEFENDER_PRESS_SPEED = 5.5;
const DEFENDER_ACCEL = 6.0;
const DEFENDER_DECEL = 8.0;
const PRESS_LATERAL_MIN = 1.0;
const PRESS_LATERAL_MAX = 1.4;
const PRESS_BEHIND_MIN = 0.6;
const PRESS_BEHIND_MAX = 1.0;

// -------- Ball ------------------------------------------------------------
const BALL_RADIUS = 0.24;

// -------- Reveal / scoring ------------------------------------------------
const GHOST_OPACITY = 0;
const REVEAL_UNSEEN_OPACITY = 0.65;
const REVEAL_UNSEEN_MS = 600;
const REVEAL_BEAT_MS = 1400;

const W_BOTH      = 50;
const W_RECENCY   = 30;
const W_TIGHTNESS = 20;
const MAX_ROUND   = W_BOTH + W_RECENCY + W_TIGHTNESS;

const RECENCY_ELITE_MS = 700;
const TIGHTNESS_TIGHT_MS = 900;
const TIGHTNESS_LOOSE_MS = 2500;

const TURNOVER_CAP = 30;
const PRESS_TAKEOVER_RADIUS = 2.4;

function getDifficultyForAge(age) {
  const a = Number(age) || 0;
  if (a >= 16) return 1.15;
  if (a >= 13) return 1.0;
  if (a >= 10) return 0.85;
  return 0.75;
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInCubic(t)  { return t * t * t; }
function easeOutQuad(t)  { return 1 - (1 - t) * (1 - t); }

/**
 * Rounds carry TIMING only. Pass shape + press plan chosen per round-load.
 * Defender count is drawn from a SHUFFLED sequence [1, 2, 3, 2, 3] so every
 * session guarantees you see all three variants — pure per-round randomness
 * had a real chance of missing 3-defender rounds entirely.
 */
function buildRounds(age) {
  const diff = getDifficultyForAge(age);
  const wnd = (b) => Math.max(1300, b / diff);
  const flt = (b) => Math.max(650,  b / diff);
  // NOT age-scaled. Younger players used to get 3000/0.75 = 4000ms which
  // rounded up to a 4s countdown; we want round 1 to read exactly 3s for
  // everyone. Only window/flight timing still adapts to age.
  const rel = (b) => b;
  const counts = shuffle([1, 2, 3, 2, 3]);
  return [
    { idx: 1, defenderCount: counts[0], windowMs: wnd(2600), flightMs: flt(1350), passReleaseMs: rel(PASS_RELEASE_MS_BASE),
      title: 'Round 1', instruction: 'Scan both shoulders before the CB plays it.' },
    { idx: 2, defenderCount: counts[1], windowMs: wnd(2300), flightMs: flt(1200), passReleaseMs: rel(PASS_RELEASE_MS_BASE - 200),
      title: 'Round 2', instruction: 'Ball comes a bit quicker now.' },
    { idx: 3, defenderCount: counts[2], windowMs: wnd(2000), flightMs: flt(1050), passReleaseMs: rel(PASS_RELEASE_MS_BASE - 400),
      title: 'Round 3', instruction: 'Tighter release window.' },
    { idx: 4, defenderCount: counts[3], windowMs: wnd(1750), flightMs: flt(920),  passReleaseMs: rel(PASS_RELEASE_MS_BASE - 600),
      title: 'Round 4', instruction: 'Fast release. Late scan wins.' },
    { idx: 5, defenderCount: counts[4], windowMs: wnd(1500), flightMs: flt(820),  passReleaseMs: rel(PASS_RELEASE_MS_BASE - 800),
      title: 'Round 5', instruction: 'Match tempo. Two quick checks.' },
  ];
}

function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }
function pickOne(arr)      { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Four clearly-different pass shapes so each attempt reads distinct:
 *   HIGH   — big loft, hangs in the air, slow flight
 *   LOFTED — normal lofted, mid arc, mid tempo
 *   DRIVEN — low, quick
 *   GROUND — rolled, fastest
 * Each carries its own arc + flight-time multiplier so the ranges don't
 * overlap enough to feel same-y. Pass kind is pickable uniformly.
 */
function pickPassVariant() {
  const kind = pickOne(['high', 'lofted', 'driven', 'ground']);
  let arcPeak; let flightMultiplier;
  if (kind === 'high') {
    arcPeak = randRange(2.8, 3.8);
    flightMultiplier = randRange(1.2, 1.45);
  } else if (kind === 'lofted') {
    arcPeak = randRange(1.5, 2.2);
    flightMultiplier = randRange(0.95, 1.15);
  } else if (kind === 'driven') {
    arcPeak = randRange(0.4, 0.8);
    flightMultiplier = randRange(0.78, 0.95);
  } else { // ground
    arcPeak = 0;
    flightMultiplier = randRange(0.7, 0.9);
  }
  const serverX = randRange(-3.8, 3.8);
  const pressingPlan = pickPressingPlan();
  return { kind, arcPeak, flightMultiplier, serverX, pressingPlan };
}

function pickPressingPlan() {
  const r = Math.random();
  if (r < 0.25) return { left: false, right: false };
  if (r < 0.50) return { left: true,  right: false };
  if (r < 0.75) return { left: false, right: true };
  return { left: true, right: true };
}

/**
 * Sides for a given defender count. count is fixed per round (from the
 * shuffled sequence in buildRounds); WHICH side gets the extra is random:
 *   1 → single defender on a random side
 *   2 → one each side (classic)
 *   3 → two on one side + one on the other (random which is heavy)
 */
function pickDefenderConfig(count) {
  if (count <= 1) return [pickOne(['left', 'right'])];
  if (count === 2) return ['left', 'right'];
  const heavy = pickOne(['left', 'right']);
  const light = heavy === 'left' ? 'right' : 'left';
  return [heavy, heavy, light];
}

function markTarget(playerPos, side, deg, dist) {
  const th = deg * (Math.PI / 180);
  const sign = side === 'left' ? -1 : 1;
  return {
    x: playerPos.x + sign * dist * Math.sin(th),
    z: playerPos.z - dist * Math.cos(th),
  };
}

/**
 * Assign mark angles + distances. When multiple defenders share a shoulder
 * they're spread across the [MIN, MAX] mark angle range so they don't stack
 * on top of each other visually.
 */
function makeDefenderLayout(count) {
  const sides = pickDefenderConfig(count);
  const grouped = { left: [], right: [] };
  sides.forEach((s, idx) => grouped[s].push(idx));
  const out = new Array(sides.length);
  ['left', 'right'].forEach((side) => {
    const idxs = grouped[side];
    const n = idxs.length;
    if (!n) return;
    const range = MARK_ANGLE_MAX_DEG - MARK_ANGLE_MIN_DEG;
    idxs.forEach((originalIdx, i) => {
      // Even spread + small jitter so same-side defenders aren't stacked.
      const base = n === 1
        ? randRange(MARK_ANGLE_MIN_DEG, MARK_ANGLE_MAX_DEG)
        : MARK_ANGLE_MIN_DEG + (range / n) * (i + 0.5) + randRange(-2, 2);
      out[originalIdx] = {
        side,
        markDeg: base,
        markDist: randRange(MARK_DIST_MIN, MARK_DIST_MAX),
      };
    });
  });
  return out;
}

function pickPressOffset(side) {
  const sign = side === 'left' ? -1 : 1;
  return {
    x: sign * randRange(PRESS_LATERAL_MIN, PRESS_LATERAL_MAX),
    z: randRange(PRESS_BEHIND_MIN, PRESS_BEHIND_MAX),
  };
}

function checkYawAtTime(active, now) {
  if (!active) return 0;
  const dt = now - active.startAt;
  const sign = active.side === 'left' ? 1 : -1;
  if (dt < CHECK_OUT_MS) return sign * MAX_HEAD_YAW * easeOutCubic(dt / CHECK_OUT_MS);
  if (dt < CHECK_OUT_MS + CHECK_HOLD_MS) return sign * MAX_HEAD_YAW;
  const t = (dt - CHECK_OUT_MS - CHECK_HOLD_MS) / CHECK_RETURN_MS;
  return sign * MAX_HEAD_YAW * (1 - easeInCubic(Math.min(1, t)));
}

function stepVelocity(current, target, dt, accel, decel) {
  const dv = target - current;
  const cap = (Math.abs(target) > Math.abs(current) ? accel : decel) * dt;
  return current + Math.sign(dv) * Math.min(Math.abs(dv), cap);
}

/**
 * Angle between the player's gaze direction and a world point, on the XZ
 * plane. Player's mesh forward is local +Z (createPlayerMesh convention),
 * so the world forward = rotate (0,0,1) by mesh.rotation.y around Y.
 * = (sin(rotY), 0, cos(rotY))
 */
function gazeAngleTo(playerPos, playerRotY, targetPos) {
  const fwdX = Math.sin(playerRotY);
  const fwdZ = Math.cos(playerRotY);
  const toX = targetPos.x - playerPos.x;
  const toZ = targetPos.z - playerPos.z;
  const len = Math.hypot(toX, toZ);
  if (len < 1e-4) return 0;
  const dot = (fwdX * toX + fwdZ * toZ) / len;
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

export default function ScanningEliteGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const playerProfile = (location.state && location.state.playerProfile) || {};

  const containerRef = useRef(null);
  const handlesRef = useRef(null);
  const serverRef = useRef(null);
  const playerRef = useRef(null);       // { mesh, ring, label } — procedural + orange
  const defenderRefs = useRef([]);
  const ballRef = useRef(null);

  const rounds = useMemo(() => buildRounds(playerProfile.age), [playerProfile.age]);
  const totalRounds = rounds.length;

  const roundIdxRef = useRef(0);
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState('intro');
  const phaseRef = useRef('intro');
  const [totalScore, setTotalScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const pendingIntroRef = useRef(true);
  const [checkBadge, setCheckBadge] = useState(null);
  const [revealBanner, setRevealBanner] = useState(null);

  const phaseStartRef = useRef(0);
  const releaseStartRef = useRef(0);
  const scanCtl = useRef({
    active: null,
    queued: null,
    checks: [],
    curYaw: 0,
  });

  const receptionTimeRef = useRef(null);
  const outcomeRef = useRef(null);
  const thiefRef = useRef(null);
  const roundVariantRef = useRef({ kind: 'lofted', arcPeak: 1.6, flightMs: 1200, serverX: 0 });
  // YOU walks forward to meet the ball during flight. Total walk distance is
  // small — a step onto the pass — so the receive reads as movement rather
  // than a static stand.
  const playerMotion = useRef({ isMoving: false, targetZ: 0, speed: 1.7 });

  const rafRef = useRef(0);
  const lastFrameRef = useRef(performance.now());
  const ballStateRef = useRef({
    mode: 'idle',
    passType: 'lofted',
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    control: new THREE.Vector3(),
    startTime: 0,
    duration: 900,
    onDone: null,
    lastPos: new THREE.Vector3(),
  });
  const clockRef = useRef(0);
  const phaseTimeoutsRef = useRef([]);
  const lastAssertLogRef = useRef(0);

  const setPhaseBoth = (p) => { phaseRef.current = p; setPhase(p); };
  const scheduleTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    phaseTimeoutsRef.current.push(id);
    return id;
  };
  const clearAllTimeouts = () => {
    phaseTimeoutsRef.current.forEach(clearTimeout);
    phaseTimeoutsRef.current = [];
  };

  // -------------------------------------------------------------------------
  // Scene lifecycle
  // -------------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handles = createPitchScene({
      container,
      cameraPosition: [0, 4.8, -19],
      cameraTarget: [0, 1.3, 2],
      fov: 42,
    });
    handlesRef.current = handles;

    const ball = createBallMesh();
    handles.scene.add(ball);
    ballRef.current = ball;

    // No async model load anymore — procedural players are synchronous.
    loadRound(0);

    const onResize = () => handles.resize();
    window.addEventListener('resize', onResize);

    const animate = (now) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;
      clockRef.current += dt;

      stepScan(now);
      stepPlayerAnim(dt);
      stepDefenders(dt, now);
      updateBall(dt, now);
      updateYouRing();

      handles.renderer.render(handles.scene, handles.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearAllTimeouts();
      window.removeEventListener('resize', onResize);
      clearActors();
      handles.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-release countdown.
  useEffect(() => {
    if (phase !== 'scan') { setCountdown(0); return undefined; }
    const r = rounds[roundIdxRef.current];
    if (!r) return undefined;
    const tick = () => {
      const remaining = r.passReleaseMs - (performance.now() - releaseStartRef.current);
      setCountdown(Math.max(0, Math.ceil(remaining / 1000)));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phase, rounds]);

  // -------------------------------------------------------------------------
  // Input — screen-side tap + keyboard
  // -------------------------------------------------------------------------

  useEffect(() => {
    const onDown = (e) => {
      if (e.repeat) return;
      const p = phaseRef.current;
      if (p !== 'scan' && p !== 'flight') return;
      const k = e.key.toLowerCase();
      // Screen-mirror mapping. The camera faces YOU, so YOU's own LEFT
      // shoulder appears on the RIGHT half of the screen (like looking at
      // your reflection). Users tap where they want the player to look on
      // screen, so ← / LEFT tap → check the RIGHT shoulder (which rotates
      // the body toward screen-left) and vice versa.
      if (k === 'a' || k === 'arrowleft')  { requestCheck('right'); e.preventDefault(); }
      if (k === 'd' || k === 'arrowright') { requestCheck('left');  e.preventDefault(); }
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScreenTap = (e) => {
    const p = phaseRef.current;
    if (p !== 'scan' && p !== 'flight') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
    // Screen mirror — see keyboard comment above.
    const side = x < rect.width / 2 ? 'right' : 'left';
    requestCheck(side);
  };

  const requestCheck = (side) => {
    const p = phaseRef.current;
    if (p !== 'scan' && p !== 'flight') return;
    const s = scanCtl.current;
    if (!s.active) {
      s.active = { side, startAt: performance.now() };
      return;
    }
    if (s.active.side === side) return;
    s.queued = side;
  };

  // -------------------------------------------------------------------------
  // Per-frame
  // -------------------------------------------------------------------------

  const stepScan = (now) => {
    const player = playerRef.current;
    if (!player) return;
    const s = scanCtl.current;

    if (s.active && now - s.active.startAt >= CHECK_TOTAL_MS) {
      const completed = { side: s.active.side, completedAt: s.active.startAt + CHECK_TOTAL_MS };
      s.checks.push(completed);
      const capturedSide = completed.side;
      setCheckBadge(capturedSide);
      scheduleTimeout(() => setCheckBadge((cur) => (cur === capturedSide ? null : cur)), 380);
      s.active = null;
      if (s.queued) {
        s.active = { side: s.queued, startAt: now };
        s.queued = null;
      }
    }

    const yaw = checkYawAtTime(s.active, now);
    s.curYaw = yaw;
    // Base facing: -Z toward the CB. Local +Z of the mesh is the "forward" per
    // createPlayerMesh, so rotating by π puts local +Z at world -Z. Add the
    // scan yaw on top — the whole body turns.
    player.mesh.rotation.y = Math.PI + yaw;
  };

  /** YOU walks forward during flight; stationary otherwise. */
  const stepPlayerAnim = (dt) => {
    const player = playerRef.current;
    if (!player) return;
    const m = playerMotion.current;
    let moving = false;
    if (m.isMoving) {
      const dz = m.targetZ - player.mesh.position.z;
      if (Math.abs(dz) > 0.02) {
        const step = Math.sign(dz) * Math.min(Math.abs(dz), m.speed * dt);
        player.mesh.position.z += step;
        moving = true;
      }
    }
    animatePlayerStep(player.mesh, moving, dt);
  };

  const stepDefenders = (dt, now) => {
    const player = playerRef.current;
    if (!player) return;
    const scannable = phaseRef.current === 'scan' || phaseRef.current === 'flight';
    const revealing = phaseRef.current === 'reveal';

    if (import.meta.env?.DEV && phaseRef.current === 'scan') {
      if (now - lastAssertLogRef.current > 1000) {
        lastAssertLogRef.current = now;
        // Player forward is world direction (sin(rotY), 0, cos(rotY)); at
        // rotY = π + yaw with yaw=0 → forward = (0, -1) = -Z (correct).
        // Angle from forward with yaw=0 to defender:
        defenderRefs.current.forEach((d) => {
          const angle = gazeAngleTo(player.mesh.position, Math.PI, d.realPos);
          if (angle > MAX_REACH_RAD + 0.02) {
            // eslint-disable-next-line no-console
            console.error(
              `[scanning] defender ${d.side} at ${(angle * 180 / Math.PI).toFixed(1)}° — outside MAX_REACH ${(MAX_REACH_RAD * 180 / Math.PI).toFixed(1)}°`
            );
          }
        });
      }
    }

    defenderRefs.current.forEach((d) => {
      if (d.mode === 'marking') {
        const target = markTarget(player.mesh.position, d.side, d.markDeg, d.markDist);
        const alpha = 1 - Math.exp(-dt / MARK_LAG_TAU);
        const newX = d.realPos.x + (target.x - d.realPos.x) * alpha;
        const newZ = d.realPos.z + (target.z - d.realPos.z) * alpha;
        const stepDist = Math.hypot(newX - d.realPos.x, newZ - d.realPos.z);
        d.realPos.x = newX;
        d.realPos.z = newZ;
        d.mesh.position.set(d.realPos.x, 0, d.realPos.z);
        d.mesh.lookAt(player.mesh.position.x, 0, player.mesh.position.z);
        animatePlayerStep(d.mesh, stepDist / Math.max(dt, 1e-3) > 0.35, dt);
      } else if (d.mode === 'pressing') {
        const dx = d.pressTarget.x - d.realPos.x;
        const dz = d.pressTarget.z - d.realPos.z;
        const dist = Math.hypot(dx, dz);
        const target = dist > 0.06 ? d.pressSpeed : 0;
        d.pressSpeedCur = stepVelocity(d.pressSpeedCur, target, dt, DEFENDER_ACCEL, DEFENDER_DECEL);
        let step = d.pressSpeedCur * dt;
        if (step > dist) step = dist;
        if (dist > 0) {
          d.realPos.x += (dx / dist) * step;
          d.realPos.z += (dz / dist) * step;
        }
        d.mesh.position.set(d.realPos.x, 0, d.realPos.z);
        d.mesh.lookAt(player.mesh.position.x, 0, player.mesh.position.z);
        animatePlayerStep(d.mesh, d.pressSpeedCur > 0.4, dt);
      } else {
        d.mesh.lookAt(player.mesh.position.x, 0, player.mesh.position.z);
        animatePlayerStep(d.mesh, false, dt);
      }

      // Reveal: gaze cone every frame, computed from player rotation.
      if (scannable && !d.seen) {
        const angle = gazeAngleTo(player.mesh.position, player.mesh.rotation.y, d.realPos);
        if (angle <= REVEAL_CONE_HALF) {
          d.seen = true;
          d.seenAt = now;
        }
      }

      // Opacity model.
      let target;
      if (d.seen) target = 1.0;
      else if (revealing) {
        const t = d.unseenRevealStartedAt != null
          ? Math.min(1, (now - d.unseenRevealStartedAt) / REVEAL_UNSEEN_MS)
          : 0;
        target = GHOST_OPACITY + (REVEAL_UNSEEN_OPACITY - GHOST_OPACITY) * t;
      } else target = GHOST_OPACITY;
      d.opacity += (target - d.opacity) * Math.min(1, dt * 8);
      d.materials.forEach((m) => { m.transparent = true; m.opacity = d.opacity; });

      const visible = d.opacity > 0.02;
      if (d.mesh.visible !== visible) {
        d.mesh.visible = visible;
        d.mesh.traverse((o) => { if (o !== d.mesh) o.visible = visible; });
      }
    });
  };

  const updateBall = (dt, now) => {
    const ball = ballRef.current;
    const state = ballStateRef.current;
    if (!ball) return;

    const prev = state.lastPos.copy(ball.position);

    if (state.mode === 'arc') {
      const raw = Math.min(1, (now - state.startTime) / state.duration);
      const t = easeOutQuad(raw);
      const v = quadBezier(state.start, state.control, state.end, t);
      ball.position.copy(v);
      rollBall(ball, prev, ball.position);
      if (raw >= 1) {
        state.mode = 'idle';
        const cb = state.onDone; state.onDone = null;
        if (cb) cb();
      }
      return;
    }
    if (state.mode === 'ground') {
      const raw = Math.min(1, (now - state.startTime) / state.duration);
      const t = easeOutQuad(raw);
      ball.position.lerpVectors(state.start, state.end, t);
      ball.position.y = BALL_RADIUS;
      rollBall(ball, prev, ball.position);
      if (raw >= 1) {
        state.mode = 'idle';
        const cb = state.onDone; state.onDone = null;
        if (cb) cb();
      }
      return;
    }
    if (state.mode === 'deflect') {
      const raw = Math.min(1, (now - state.startTime) / state.duration);
      const t = easeOutQuad(raw);
      ball.position.lerpVectors(state.start, state.end, t);
      ball.position.y = BALL_RADIUS;
      rollBall(ball, prev, ball.position);
      if (raw >= 1) state.mode = 'idle';
      return;
    }

    const p = phaseRef.current;
    if ((p === 'scan' || p === 'intro') && serverRef.current) {
      const s = serverRef.current.mesh.position;
      ball.position.set(s.x + 0.3, BALL_RADIUS, s.z + 0.1);
    } else if ((p === 'receive' || p === 'reveal' || p === 'feedback') && playerRef.current && outcomeRef.current === 'clean') {
      const pp = playerRef.current.mesh.position;
      ball.position.set(pp.x + 0.3, BALL_RADIUS, pp.z + 0.1);
    }
  };

  const _rollAxis = new THREE.Vector3();
  const _rollDir = new THREE.Vector3();
  function rollBall(ball, prevPos, nextPos) {
    _rollDir.copy(nextPos).sub(prevPos);
    _rollDir.y = 0;
    const dist = _rollDir.length();
    if (dist < 1e-4) return;
    _rollDir.normalize();
    _rollAxis.set(0, 1, 0).cross(_rollDir).normalize();
    ball.rotateOnWorldAxis(_rollAxis, dist / BALL_RADIUS);
  }

  const updateYouRing = () => {
    const player = playerRef.current;
    if (!player?.ring) return;
    const p = player.mesh.position;
    player.ring.position.set(p.x, 0.03, p.z);
    player.ring.material.opacity = 0.55 + Math.sin(clockRef.current * 6) * 0.25;
    if (player.label) player.label.position.set(p.x, 2.5 + Math.sin(clockRef.current * 3) * 0.05, p.z);
  };

  // -------------------------------------------------------------------------
  // Round lifecycle
  // -------------------------------------------------------------------------

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
      if (entry.ring) { scene.remove(entry.ring); entry.ring.geometry.dispose(); entry.ring.material.dispose(); }
      if (entry.label) { scene.remove(entry.label); entry.label.material?.map?.dispose(); entry.label.material?.dispose(); }
    };
    if (serverRef.current) drop(serverRef.current);
    serverRef.current = null;
    defenderRefs.current.forEach(drop);
    defenderRefs.current = [];
    if (playerRef.current) drop(playerRef.current);
    playerRef.current = null;
  };

  /**
   * Build a procedural actor. `label` = number sprite text; pass `null` to
   * skip the sprite entirely (createPlayerMesh only adds it when `numberLabel`
   * is truthy). Defenders pass null; the server passes 'CB'; YOU passes null
   * and gets its own YOU nameplate + orange ring alongside.
   */
  const buildProceduralActor = (pos, color, label, faceZ = -1) => {
    const mesh = createPlayerMesh(color, { numberLabel: label || undefined });
    mesh.position.set(pos[0], 0, pos[2]);
    mesh.lookAt(pos[0], 0, pos[2] + faceZ);
    handlesRef.current.scene.add(mesh);
    const materials = [];
    mesh.traverse((o) => {
      if (!o.material) return;
      if (!o.isMesh && !o.isSprite) return;
      if (Array.isArray(o.material)) {
        o.material = o.material.map((m) => {
          if (!m) return m;
          const c = m.clone();
          c.transparent = true;
          materials.push(c);
          return c;
        });
      } else {
        const c = o.material.clone();
        c.transparent = true;
        o.material = c;
        materials.push(c);
      }
    });
    return { mesh, materials };
  };

  const loadRound = (idx) => {
    clearActors();
    clearAllTimeouts();
    roundIdxRef.current = idx;
    setRoundIdx(idx);
    setFeedback(null);
    setRevealBanner(null);
    receptionTimeRef.current = null;
    outcomeRef.current = null;
    thiefRef.current = null;
    scanCtl.current.checks = [];
    scanCtl.current.active = null;
    scanCtl.current.queued = null;
    scanCtl.current.curYaw = 0;
    setCheckBadge(null);
    playerMotion.current.isMoving = false;
    playerMotion.current.targetZ = 0;

    roundVariantRef.current = pickPassVariant();
    const variant = roundVariantRef.current;

    const scene = handlesRef.current.scene;

    // Own CB serving the ball. Yellow, laterally varied.
    const serverPos = [variant.serverX, 0, -12];
    serverRef.current = buildProceduralActor(serverPos, 0xfacc15, 'CB', +1);

    // YOU — procedural, orange kit, no number sprite. Add an orange ring
    // and a "YOU" nameplate as sibling scene objects.
    const youActor = buildProceduralActor([0, 0, 0], ELITE_COLORS.you, null, -1);
    // Set the base rotation for scanning — π = face -Z (toward CB). stepScan
    // adds the current scan yaw on top.
    youActor.mesh.rotation.y = Math.PI;

    const ring = createHighlightRing(ELITE_COLORS.youRing, { innerR: 0.9, outerR: 1.2 });
    ring.position.set(0, 0.03, 0);
    scene.add(ring);
    youActor.ring = ring;

    const label = createLabelSprite('YOU', {
      bg: 'rgba(10,20,10,0.88)', fg: '#ffffff', accent: '#ff6a00',
    });
    label.scale.set(1.4, 0.7, 1);
    label.position.set(0, 2.5, 0);
    scene.add(label);
    youActor.label = label;

    playerRef.current = youActor;

    // Defender count comes from the round (shuffled [1,2,3,2,3] across the
    // 5 rounds so every session shows each variant at least once). NO
    // number labels — null → no sprite. Fully invisible until scanned.
    const round = rounds[idx];
    const layout = makeDefenderLayout(round.defenderCount);
    layout.forEach((d) => {
      const t = markTarget(youActor.mesh.position, d.side, d.markDeg, d.markDist);
      const entry = buildProceduralActor([t.x, 0, t.z], ELITE_COLORS.away, null, -1);
      entry.mesh.lookAt(youActor.mesh.position.x, 0, youActor.mesh.position.z);
      entry.side = d.side;
      entry.markDeg = d.markDeg;
      entry.markDist = d.markDist;
      entry.realPos = new THREE.Vector3(t.x, 0, t.z);
      entry.seen = false;
      entry.seenAt = null;
      entry.opacity = GHOST_OPACITY;
      entry.unseenRevealStartedAt = null;
      entry.mode = 'marking';
      entry.pressTarget = null;
      entry.pressSpeed = 0;
      entry.pressSpeedCur = 0;
      entry.materials.forEach((m) => { m.opacity = GHOST_OPACITY; m.transparent = true; });
      entry.mesh.visible = false;
      entry.mesh.traverse((o) => { if (o !== entry.mesh) o.visible = false; });
      defenderRefs.current.push(entry);
    });

    if (ballRef.current) {
      ballRef.current.position.set(serverPos[0] + 0.3, BALL_RADIUS, serverPos[2] + 0.1);
      ballRef.current.rotation.set(0, 0, 0);
      ballStateRef.current.mode = 'idle';
    }

    if (pendingIntroRef.current) return;
    beginScan();
  };

  const beginScan = () => {
    const round = rounds[roundIdxRef.current];
    if (!round) return;
    phaseStartRef.current = performance.now();
    releaseStartRef.current = performance.now();
    setPhaseBoth('scan');
    scheduleTimeout(() => {
      if (phaseRef.current === 'scan') triggerPass();
    }, round.passReleaseMs);
  };

  const triggerPass = () => {
    const round = rounds[roundIdxRef.current];
    const variant = roundVariantRef.current;
    const player = playerRef.current;
    if (!round || !serverRef.current || !player || !variant) return;
    setPhaseBoth('flight');

    // Ball lands where YOU will be at reception — a small forward walk of
    // ~1.5m over the flight duration. Target position is computed once here
    // so ball trajectory and player motion converge.
    const flightMs = round.flightMs * (variant.flightMultiplier ?? 1);
    const walkDist = 1.6;
    const receiveZ = player.mesh.position.z - walkDist; // toward CB (-Z)
    const receiveX = player.mesh.position.x;
    const start = serverRef.current.mesh.position.clone(); start.y = BALL_RADIUS;
    const end = new THREE.Vector3(receiveX, BALL_RADIUS, receiveZ);
    ballStateRef.current.passType = variant.kind;
    ballStateRef.current.start.copy(start);
    ballStateRef.current.end.copy(end);
    ballStateRef.current.startTime = performance.now();
    ballStateRef.current.duration = flightMs;
    ballStateRef.current.onDone = onBallArrives;
    if (variant.kind === 'ground') {
      ballStateRef.current.mode = 'ground';
    } else {
      ballStateRef.current.control.copy(makeArcControl(start, end, variant.arcPeak));
      ballStateRef.current.mode = 'arc';
    }

    // Kick off YOU's walk toward the reception point.
    playerMotion.current.isMoving = true;
    playerMotion.current.targetZ = receiveZ;
    playerMotion.current.speed = Math.max(1.2, walkDist / (flightMs / 1000));

    const flightSec = flightMs / 1000;
    const plan = variant.pressingPlan ?? { left: true, right: true };
    defenderRefs.current.forEach((d) => {
      if (!plan[d.side]) {
        d.mode = 'marking';
        return;
      }
      const off = pickPressOffset(d.side);
      d.pressTarget = new THREE.Vector3(end.x + off.x, 0, end.z + off.z);
      const dx = d.pressTarget.x - d.realPos.x;
      const dz = d.pressTarget.z - d.realPos.z;
      const dist = Math.hypot(dx, dz);
      d.pressSpeed = Math.min(MAX_DEFENDER_PRESS_SPEED, dist / Math.max(0.1, flightSec));
      d.pressSpeedCur = 0;
      d.mode = 'pressing';
    });
  };

  const onBallArrives = () => {
    receptionTimeRef.current = performance.now();
    const player = playerRef.current;
    const ball = ballRef.current;
    if (!player || !ball) return;
    // Stop the walk — YOU arrives with the ball.
    playerMotion.current.isMoving = false;

    // Unseen presser near the player → they steal it.
    let thief = null;
    let thiefDist = Infinity;
    defenderRefs.current.forEach((d) => {
      if (d.mode !== 'pressing' || d.seen) return;
      const dd = Math.hypot(d.realPos.x - player.mesh.position.x, d.realPos.z - player.mesh.position.z);
      if (dd <= PRESS_TAKEOVER_RADIUS && dd < thiefDist) { thief = d; thiefDist = dd; }
    });

    if (thief) {
      outcomeRef.current = 'turnover-blind';
      thiefRef.current = thief;
      const away = new THREE.Vector3(
        thief.realPos.x - player.mesh.position.x, 0,
        thief.realPos.z - player.mesh.position.z,
      );
      if (away.lengthSq() < 1e-3) away.set(1, 0, 0);
      away.normalize().multiplyScalar(2.6);
      const rollEnd = new THREE.Vector3(
        thief.realPos.x + away.x, BALL_RADIUS,
        thief.realPos.z + away.z,
      );
      ballStateRef.current.start.copy(ball.position);
      ballStateRef.current.end.copy(rollEnd);
      ballStateRef.current.startTime = performance.now();
      ballStateRef.current.duration = 600;
      ballStateRef.current.mode = 'deflect';
      setPhaseBoth('turnover');
      scheduleTimeout(() => beginRevealBeat(), 900);
      return;
    }

    outcomeRef.current = 'clean';
    setPhaseBoth('receive');
    scheduleTimeout(() => beginRevealBeat(), 360);
  };

  const beginRevealBeat = () => {
    const record = computeRoundRecord();
    setFeedback(record);
    const unseen = defenderRefs.current.filter((d) => !d.seen);
    setPhaseBoth('reveal');
    if (unseen.length === 0 && outcomeRef.current === 'clean') {
      setRevealBanner({ kind: 'spotted', n: defenderRefs.current.length });
      scheduleTimeout(() => openFeedback(record), Math.floor(REVEAL_BEAT_MS * 0.55));
      return;
    }
    const now = performance.now();
    unseen.forEach((d) => { d.unseenRevealStartedAt = now; });
    if (outcomeRef.current === 'turnover-blind') {
      setRevealBanner({ kind: 'turnover-blind', thiefSide: thiefRef.current?.side ?? null });
    } else {
      setRevealBanner({ kind: 'missed', n: unseen.length });
    }
    scheduleTimeout(() => openFeedback(record), REVEAL_BEAT_MS);
  };

  const openFeedback = (record) => {
    setRevealBanner(null);
    setTotalScore((s) => s + record.points);
    setPhaseBoth('feedback');
  };

  // -------------------------------------------------------------------------
  // Scoring
  // -------------------------------------------------------------------------

  const computeRoundRecord = () => {
    const round = rounds[roundIdxRef.current];
    const receiveAt = receptionTimeRef.current ?? performance.now();
    const windowMs = round?.windowMs ?? 2200;
    const windowStart = receiveAt - windowMs;
    const checks = scanCtl.current.checks;

    const leftChecks = checks.filter((c) => c.side === 'left');
    const rightChecks = checks.filter((c) => c.side === 'right');
    const hasBoth = leftChecks.length > 0 && rightChecks.length > 0;
    const hasEither = leftChecks.length > 0 || rightChecks.length > 0;

    let bothScore = 0;
    if (hasBoth) bothScore = 100;
    else if (hasEither) bothScore = 40;

    let recencyScore = 0;
    let lastCheck = null;
    let lastDeltaMs = null;
    if (checks.length) {
      lastCheck = checks.reduce((a, b) => (a.completedAt > b.completedAt ? a : b));
      lastDeltaMs = Math.round(receiveAt - lastCheck.completedAt);
      if (lastDeltaMs <= RECENCY_ELITE_MS) recencyScore = 100;
      else if (lastDeltaMs >= windowMs) recencyScore = 0;
      else recencyScore = Math.round(100 - ((lastDeltaMs - RECENCY_ELITE_MS) / (windowMs - RECENCY_ELITE_MS)) * 100);
      recencyScore = Math.max(0, Math.min(100, recencyScore));
    }

    let tightnessScore = 0;
    let gapMs = null;
    if (hasBoth) {
      const lastL = leftChecks[leftChecks.length - 1].completedAt;
      const lastR = rightChecks[rightChecks.length - 1].completedAt;
      gapMs = Math.abs(lastL - lastR);
      if (gapMs <= TIGHTNESS_TIGHT_MS) tightnessScore = 100;
      else if (gapMs >= TIGHTNESS_LOOSE_MS) tightnessScore = 0;
      else tightnessScore = Math.round(100 - ((gapMs - TIGHTNESS_TIGHT_MS) / (TIGHTNESS_LOOSE_MS - TIGHTNESS_TIGHT_MS)) * 100);
    }

    let points = Math.round(
      (bothScore      / 100) * W_BOTH      +
      (recencyScore   / 100) * W_RECENCY   +
      (tightnessScore / 100) * W_TIGHTNESS,
    );

    if (outcomeRef.current === 'turnover-blind') {
      points = Math.min(points, TURNOVER_CAP);
    }

    const defenders = defenderRefs.current.map((d) => ({
      side: d.side, seen: d.seen, pressed: d.mode === 'pressing',
    }));
    const inWindow = checks.filter((c) => c.completedAt >= windowStart && c.completedAt <= receiveAt).length;
    const pressers = defenders.filter((d) => d.pressed);
    const pressersSeen = pressers.filter((d) => d.seen).length;
    const pressersUnseen = pressers.length - pressersSeen;

    return {
      checks: checks.map((c) => ({ side: c.side, atMs: c.completedAt })),
      leftCount: leftChecks.length,
      rightCount: rightChecks.length,
      hasBoth,
      hasEither,
      inWindowCount: inWindow,
      windowMs: Math.round(windowMs),
      lastDeltaMs,
      gapMs,
      bothScore,
      recencyScore,
      tightnessScore,
      defenders,
      seenCount: defenders.filter((d) => d.seen).length,
      totalDefenders: defenders.length,
      pressers,
      pressersSeen,
      pressersUnseen,
      outcome: outcomeRef.current,
      thiefSide: thiefRef.current?.side ?? null,
      passKind: roundVariantRef.current?.kind ?? 'lofted',
      serverX: roundVariantRef.current?.serverX ?? 0,
      points,
    };
  };

  // -------------------------------------------------------------------------
  // Round flow
  // -------------------------------------------------------------------------

  const goNext = () => {
    clearAllTimeouts();
    const next = roundIdxRef.current + 1;
    if (next >= totalRounds) finalize();
    else loadRound(next);
  };

  const finalize = async () => {
    const maxTotal = totalRounds * MAX_ROUND;
    const finalScore = Math.min(100, Math.round((totalScore / maxTotal) * 100));
    setFinished({ score: finalScore, reactionTime: null });
    setPhaseBoth('done');
    try {
      useEliteStore.getState().setEliteResult('elite_scanning', { score: finalScore, reactionTime: null });
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
          gameType: 'elite_scanning',
          score: finalScore,
          reactionTime: null,
        });
        toast.success('Elite Scanning saved');
      } catch (err) {
        toast.error("Couldn't save elite scanning score");
      }
    }
  };

  const dismissIntro = () => {
    if (!pendingIntroRef.current) return;
    pendingIntroRef.current = false;
    setShowIntro(false);
    if (playerRef.current) beginScan();
  };

  const back = () => navigate('/iq-training', { state: { playerProfile } });

  const round = rounds[roundIdxRef.current];
  const checks = scanCtl.current.checks;
  const leftDone = checks.some((c) => c.side === 'left');
  const rightDone = checks.some((c) => c.side === 'right');

  return (
    <EliteGameShell
      title="Scanning — ELITE 3D"
      subtitle={`Round ${Math.min(roundIdx + 1, totalRounds)} / ${totalRounds}`}
      onBack={back}
    >
      <div
        ref={containerRef}
        onPointerDown={onScreenTap}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'manipulation' }}
      />

      {phase !== 'done' && (
        <>
          <style>{`
            @keyframes ps-scan-pulse {
              0%   { transform: translate(-50%, 0) scale(0.75); opacity: 0; }
              45%  { transform: translate(-50%, 0) scale(1.1);  opacity: 1; }
              100% { transform: translate(-50%, 0) scale(1);    opacity: 1; }
            }
            @keyframes ps-scan-urgent {
              0%, 100% { transform: translate(-50%, 0) scale(1);    box-shadow: 0 8px 32px rgba(220,38,38,0.55), 0 0 40px rgba(220,38,38,0.35); }
              50%      { transform: translate(-50%, 0) scale(1.06); box-shadow: 0 12px 40px rgba(220,38,38,0.85), 0 0 60px rgba(220,38,38,0.6); }
            }
          `}</style>

          <div style={hudTopLeft}>
            <div style={hudLabel}>SCORE</div>
            <div style={hudValue}>{totalScore}</div>
          </div>
          <div style={hudTopRight}>
            <div style={hudLabel}>ROUND</div>
            <div style={hudValue}>{Math.min(roundIdx + 1, totalRounds)} / {totalRounds}</div>
          </div>
          <div style={scanHud}>
            <div style={hudLabel}>CHECKS</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
              <div style={{ ...checkPip, background: leftDone ? '#2ead3c' : 'rgba(255,255,255,0.14)' }}>L</div>
              <div style={{ ...checkPip, background: rightDone ? '#2ead3c' : 'rgba(255,255,255,0.14)' }}>R</div>
            </div>
          </div>

          {phase === 'scan' && (
            <div style={{
              ...scanCountdown,
              animation: countdown <= 1 ? 'ps-scan-urgent 0.7s ease-in-out infinite' : 'ps-scan-pulse 0.36s ease-out',
            }}>
              <div style={scanCountdownLabel}>BALL IN</div>
              <div style={scanCountdownNumber}>{countdown}</div>
              <div style={scanCountdownSub}>tap left / right to scan</div>
            </div>
          )}
          {phase === 'flight' && (
            <div key="badge-flight" style={{ ...phaseBadge, ...phaseBadgeFlight }}>
              <div style={phaseBadgeLabel}>BALL IN FLIGHT</div>
              <div style={{ fontSize: 10, marginTop: 2, opacity: 0.9 }}>last look now</div>
            </div>
          )}
          {phase === 'turnover' && (
            <div key="badge-turnover" style={{ ...phaseBadge, ...phaseBadgeTurnover }}>
              <div style={phaseBadgeLabel}>TURNOVER</div>
            </div>
          )}
          {phase === 'reveal' && revealBanner && (
            <div key="badge-reveal" style={{
              ...phaseBadge,
              background: bannerBg(revealBanner.kind),
              border: `2px solid ${bannerBorder(revealBanner.kind)}`,
              top: 82, minWidth: 220,
            }}>
              <div style={phaseBadgeLabel}>{bannerText(revealBanner)}</div>
            </div>
          )}

          {checkBadge && (
            <div style={{ ...scanFlash, color: checkBadge === 'left' ? '#38bdf8' : '#a3e635' }}>
              ✓ check {checkBadge}
            </div>
          )}

          {(phase === 'scan' || phase === 'flight') && (
            <div style={promptWrap}>
              <div style={promptTitle}>{round?.title}</div>
              <div style={promptText}>{round?.instruction}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', marginTop: 4, lineHeight: 1.5 }}>
                Tap the <strong>LEFT</strong> side of the pitch to check your LEFT shoulder · <strong>RIGHT</strong> for RIGHT.
              </div>
            </div>
          )}

          {(phase === 'scan' || phase === 'flight') && (
            <>
              <div style={{ ...tapHint, ...tapHintLeft }}>◂ TAP LEFT</div>
              <div style={{ ...tapHint, ...tapHintRight }}>TAP RIGHT ▸</div>
            </>
          )}
        </>
      )}

      {phase === 'feedback' && feedback && (
        <div style={feedbackWrap}>
          <div style={{ ...feedbackCard, borderLeft: `4px solid ${feedbackAccent(feedback)}` }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: feedbackAccent(feedback), marginBottom: 12 }}>
              {feedbackHeadline(feedback)}
            </div>

            <div style={groupLabel}>SHOULDERS</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, marginTop: 4, flexWrap: 'wrap' }}>
              <div style={{ ...bigPip, background: pipColor(feedback.leftCount) }}>{feedback.leftCount ? '✓ L' : '✗ L'}</div>
              <div style={{ ...bigPip, background: pipColor(feedback.rightCount) }}>{feedback.rightCount ? '✓ R' : '✗ R'}</div>
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.75)',
                display: 'flex', alignItems: 'center', paddingLeft: 4,
              }}>
                Saw <strong style={{ margin: '0 4px' }}>{feedback.seenCount}</strong> of <strong style={{ margin: '0 4px' }}>{feedback.totalDefenders}</strong> behind you
              </div>
            </div>

            <div style={groupLabel}>THIS ATTEMPT</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', marginBottom: 8, marginTop: 4, lineHeight: 1.55 }}>
              <div>
                <span style={{ opacity: 0.6 }}>Pass:</span>{' '}
                <strong>{
                  feedback.passKind === 'ground'  ? 'GROUND · rolled in flat' :
                  feedback.passKind === 'driven'  ? 'DRIVEN · low, fast' :
                  feedback.passKind === 'high'    ? 'HIGH · big loft, hangs' :
                  'LOFTED · in the air'
                }</strong>
                {feedback.serverX != null && (
                  <span style={{ opacity: 0.7 }}>{' '}from {feedback.serverX < -1 ? 'wide LEFT' : feedback.serverX > 1 ? 'wide RIGHT' : 'centre'}</span>
                )}
              </div>
              <div style={{ marginTop: 3 }}>
                <span style={{ opacity: 0.6 }}>Press:</span>{' '}
                {feedback.pressers?.length === 0
                  ? <strong>nobody pressed</strong>
                  : feedback.pressers?.length === 1
                    ? <>Presser on your <strong>{feedback.pressers[0].side}</strong> — {feedback.pressers[0].seen ? <span style={{ color: '#2ead3c' }}>you saw them ✓</span> : <span style={{ color: '#dc2626' }}>you missed them ✗</span>}</>
                    : <><strong>{feedback.pressers.length}</strong> pressers — <strong>{feedback.pressersSeen}</strong> seen, <strong>{feedback.pressersUnseen}</strong> missed</>}
              </div>
            </div>

            <div style={groupLabel}>TIMING</div>
            <MetricBar
              label={feedback.lastDeltaMs != null
                ? `Recency (last check ${feedback.lastDeltaMs} ms before)`
                : 'Recency (no check taken)'}
              value={feedback.recencyScore}
            />
            <MetricBar
              label={feedback.gapMs != null
                ? `Tightness (${feedback.gapMs} ms between L and R)`
                : 'Tightness (only one side)'}
              value={feedback.tightnessScore}
            />
            <MetricBar label="Both shoulders" value={feedback.bothScore} />

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 12, lineHeight: 1.55 }}>
              {roundNarrative(feedback)}
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
          title="Scanning · ELITE"
          accent="#dc2626"
          objective="Your centre-back has it. Two defenders may be behind you — INVISIBLE until you look. Tap the pitch to check each shoulder. The ball is released automatically when the timer hits zero."
          controls={[
            { keys: 'Tap LEFT / A / ←',   action: 'Check left shoulder — one tap, full turn and back.' },
            { keys: 'Tap RIGHT / D / →',  action: 'Check right shoulder.' },
            { keys: 'Timer',              action: 'Ball auto-releases at zero.' },
          ]}
          onStart={dismissIntro}
        />
      )}
    </EliteGameShell>
  );
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

function pipColor(n) { return n ? 'rgba(46,173,60,0.75)' : 'rgba(220,38,38,0.55)'; }

function feedbackAccent(fb) {
  if (fb.outcome === 'turnover-blind') return '#dc2626';
  return fb.points >= 70 ? '#2ead3c' : '#f59e0b';
}

function feedbackHeadline(fb) {
  if (fb.outcome === 'turnover-blind') return '✗ TURNOVER — YOU RECEIVED BLIND';
  if (fb.points >= 70)                 return '✓ ELITE CHECK';
  if (!fb.hasEither)                   return '△ NO CHECK';
  if (!fb.hasBoth)                     return '△ ONE SHOULDER ONLY';
  return '△ TOO EARLY / TOO SPREAD';
}

function bannerBg(kind) {
  if (kind === 'missed' || kind === 'turnover-blind') return 'linear-gradient(135deg, #dc2626, #7f1d1d)';
  return 'linear-gradient(135deg, #16a34a, #14532d)';
}
function bannerBorder(kind) {
  if (kind === 'missed' || kind === 'turnover-blind') return '#f87171';
  return '#4ade80';
}
function bannerText(b) {
  if (b.kind === 'missed')         return `MISSED ${b.n} BEHIND YOU`;
  if (b.kind === 'spotted')        return `SPOTTED ALL ${b.n}`;
  if (b.kind === 'turnover-blind') return b.thiefSide
    ? `THIEF ON YOUR ${b.thiefSide.toUpperCase()} — YOU NEVER LOOKED`
    : 'BLIND RECEIVE — STOLEN';
  return '';
}

function roundNarrative(fb) {
  const pressers = fb.pressers ?? [];
  const pressSummary = pressers.length === 0
    ? 'Nobody pressed this time'
    : pressers.length === 1
      ? `A defender came in from your ${pressers[0].side}`
      : `${pressers.length} defenders came at you`;

  if (fb.outcome === 'turnover-blind') {
    const side = fb.thiefSide ?? 'shoulder';
    return `The ${side} defender pressed and you never checked. He got there first and nicked it.`;
  }
  if (pressers.length === 0) {
    if (!fb.hasEither) {
      return 'Nobody pressed this round — but you couldn\'t have known that. The habit still matters.';
    }
    return `${pressSummary}. Clean rep — but the picture you built is what you\'d have needed if they had.`;
  }
  if (fb.pressersSeen === pressers.length) {
    if (fb.lastDeltaMs != null && fb.lastDeltaMs <= 900) {
      return `${pressSummary} — you saw them and beat them to the ball. Late scan, clean take.`;
    }
    return `${pressSummary} — you saw them. Reception was yours.`;
  }
  return `${pressSummary}. You got there first this time, but the picture wasn\'t complete.`;
}

function MetricBar({ label, value }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const color = clamped >= 75 ? '#2ead3c' : clamped >= 45 ? '#facc15' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <div style={{ flex: '0 1 180px', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{label}</div>
      <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${clamped}%`, height: '100%', background: color }} />
      </div>
      <div style={{ width: 30, textAlign: 'right', fontSize: 12, color: '#fff', fontWeight: 700 }}>{clamped}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles — mobile-first (390px).
// ---------------------------------------------------------------------------

const hudTopLeft = {
  position: 'absolute', top: 10, left: 10, color: '#fff',
  background: 'rgba(0,0,0,0.55)', padding: '5px 9px', borderRadius: 6,
  fontFamily: "'JetBrains Mono', monospace", zIndex: 5,
  pointerEvents: 'none',
};
const hudTopRight = { ...hudTopLeft, left: 'auto', right: 10, textAlign: 'right' };
const scanHud = { ...hudTopLeft, top: 62, textAlign: 'left' };
const hudLabel = { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.55)' };
const hudValue = { fontSize: 16, fontWeight: 800 };

const checkPip = {
  width: 22, height: 22, borderRadius: 4, color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, fontWeight: 900,
};
const bigPip = {
  width: 54, height: 40, borderRadius: 6, color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, fontWeight: 900, letterSpacing: 1,
};

const phaseBadge = {
  position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
  minWidth: 140, padding: '7px 16px 9px',
  borderRadius: 10, textAlign: 'center', color: '#fff',
  fontFamily: "'JetBrains Mono', monospace",
  boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
  animation: 'ps-scan-pulse 0.36s ease-out',
  zIndex: 20, pointerEvents: 'none',
};
const phaseBadgeFlight = { background: 'linear-gradient(135deg, #d97706, #7c2d12)', border: '2px solid #f59e0b' };
const phaseBadgeTurnover = { background: 'linear-gradient(135deg, #7f1d1d, #450a0a)', border: '2px solid #dc2626' };
const phaseBadgeLabel = { fontSize: 12, fontWeight: 900, letterSpacing: 3 };

const scanCountdown = {
  position: 'absolute', top: 58, left: '50%', transform: 'translateX(-50%)',
  minWidth: 220, padding: '14px 30px 18px',
  borderRadius: 14, textAlign: 'center', color: '#fff',
  fontFamily: "'JetBrains Mono', monospace",
  background: 'linear-gradient(135deg, #b91c1c, #450a0a)',
  border: '3px solid #dc2626',
  boxShadow: '0 8px 32px rgba(220,38,38,0.55), 0 0 40px rgba(220,38,38,0.35)',
  zIndex: 22, pointerEvents: 'none',
};
const scanCountdownLabel = { fontSize: 13, fontWeight: 900, letterSpacing: 3, opacity: 0.92 };
const scanCountdownNumber = {
  fontSize: 76, fontWeight: 900, lineHeight: 1, marginTop: 2,
  textShadow: '0 4px 20px rgba(0,0,0,0.5)',
  fontVariantNumeric: 'tabular-nums',
};
const scanCountdownSub = { fontSize: 10, letterSpacing: 2, marginTop: 6, opacity: 0.85 };

const promptWrap = {
  position: 'absolute', top: 96, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.55)', padding: '7px 12px', borderRadius: 6,
  textAlign: 'center', color: '#fff', maxWidth: 340,
  fontFamily: "'JetBrains Mono', monospace", zIndex: 5,
  pointerEvents: 'none',
};
const promptTitle = { fontSize: 10, letterSpacing: 2, color: '#facc15', marginBottom: 3 };
const promptText = { fontSize: 12, lineHeight: 1.35 };

const scanFlash = {
  position: 'absolute', top: 180, left: '50%', transform: 'translateX(-50%)',
  padding: '5px 12px', borderRadius: 6, background: 'rgba(0,0,0,0.7)',
  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 900,
  letterSpacing: 2, zIndex: 15, pointerEvents: 'none',
};

const tapHint = {
  position: 'absolute', bottom: 20, zIndex: 4,
  padding: '10px 14px', borderRadius: 10,
  background: 'rgba(20, 30, 45, 0.55)',
  border: '1.5px solid rgba(255,255,255,0.28)',
  color: 'rgba(255,255,255,0.85)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13, fontWeight: 800, letterSpacing: 2,
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  pointerEvents: 'none',
  userSelect: 'none',
};
const tapHintLeft  = { left: 14 };
const tapHintRight = { right: 14 };

const feedbackWrap = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 30, padding: 14,
};
const feedbackCard = {
  maxWidth: 460, width: '100%', background: '#080e0a', padding: '18px 18px',
  border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'JetBrains Mono', monospace",
};
const groupLabel = {
  fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase', marginBottom: 6, marginTop: 4,
};
const nextBtn = {
  padding: '10px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
  color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: 1.4, fontSize: 12, minHeight: 44,
};
