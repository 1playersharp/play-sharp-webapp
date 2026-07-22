import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { toast } from 'sonner';

import {
  createPitchScene,
  createPlayerMesh,
  animatePlayerStep,
} from '../../rendering/PitchRenderer';
import useEliteStore from '../../engine/useEliteStore';
import EliteGameShell from '../../ui/EliteGameShell';
import useIsTouchDevice from '../../ui/useIsTouchDevice';
import { submitScore } from '@/services/api';

/**
 * EliteDuelGame — 1v1 / 2v1 Defending Duels (Elite tier)
 *
 * ENGAGE or JOCKEY? Weighted decision-quality scoring across five duels
 * spanning three scenario types (solo 1v1, 1v1 with cover, 1v2 overload).
 * The same action scores differently by context — coach-copy explains the
 * "why" every rep.
 *
 * Integration notes:
 *  - Uses createPitchScene() + createPlayerMesh() + animatePlayerStep() from
 *    PitchRenderer.ts to match every other Elite game exactly.
 *  - The factory's north goal is hidden; this game uses its own defensive
 *    goal marker at z=GOAL_Z so all reference gameplay timings hold.
 *  - Resize handled by ResizeObserver on the container — orientation flips
 *    refit the canvas without unmounting or resetting duel state.
 */

/* ─── Tuning (kept identical to the reference; z-axis coord system) ── */
const GOAL_Z = -24;                        // defensive goal line
const DANGER_R = 11;                       // central danger zone radius from goal
const ATT_SPEED = 4.2;                     // attacker dribble m/s
const ATT_BURST = 6.4;                     // beat-you burst m/s
const DEF_SPEED = 5.2;                     // defender strafe m/s
const TOUCH_EVERY = [0.55, 0.85];          // s between attacker touches
const HEAVY_PUSH = [1.5, 2.4];             // heavy touch rolls ball ahead (m)
const CTRL_PUSH  = [0.5, 0.9];             // controlled touch (m)
const ENGAGE_RANGE = 2.3;                  // lunge reach (m)
const JOCKEY_BAND = [1.4, 2.6];            // ideal cushion (m)
const DUEL_TIME = 9;                       // s before a duel resolves as "delayed"

const COL = {
  def: 0x1e6fd6, defCover: 0x8fb8ea, att: 0xdc1e28, attSecondary: 0xff7a1f,
  accent: '#2ead3c', red: '#dc1e28', mono: "'JetBrains Mono', monospace",
};

/* ─── Scenarios ──────────────────────────────────────────────── */
// type: 'solo' | 'covered' | 'overload'
const DUELS = [
  {
    id: 'solo_central', type: 'solo',
    title: '1v1 — Last Man, Central',
    brief: "No cover behind you. Don't dive in — jockey, stay side-on, wait for the heavy touch.",
    attStart: [0, 8], heavyChance: 0.30,
  },
  {
    id: 'solo_wide', type: 'solo',
    title: '1v1 — Show Them The Line',
    brief: 'Winger in the channel. Use the touchline as your extra defender — angle your body to show them wide.',
    attStart: [-13, 8], heavyChance: 0.28,
  },
  {
    id: 'covered_press', type: 'covered',
    title: '1v1 — Cover Behind You',
    brief: 'Your CB is covering. With insurance behind, you can engage earlier — pressure the first bad touch.',
    attStart: [5, 8], heavyChance: 0.38,
  },
  {
    id: 'overload_delay', type: 'overload',
    title: '2v1 — Outnumbered. DELAY.',
    brief: 'Two attackers, just you. Committing loses the duel instantly. Drop, stay compact, show one side, buy time for recovery.',
    attStart: [-3, 10], heavyChance: 0.18, recoverySecs: 7,
  },
  {
    id: 'covered_trap', type: 'covered',
    title: '1v1 — Spring The Trap',
    brief: 'Cover is set and the attacker is careless. Read the touch weight — win it high.',
    attStart: [8, 9], heavyChance: 0.5,
  },
];

const rand = (a, b) => a + Math.random() * (b - a);

/* ─── Helpers ─────────────────────────────────────────────── */
function createHighlightRing(color) {
  const geo = new THREE.RingGeometry(0.72, 1.0, 32);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.renderOrder = 1;
  return ring;
}

/* ─── Component ──────────────────────────────────────────────── */
export default function EliteDuelGame({ onComplete: onCompleteProp }) {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const btnRef = useRef(null);
  const engageFnRef = useRef(null);
  const S = useRef(null);                        // mutable sim state
  const [phase, setPhase] = useState('intro');   // intro | live | feedback | done
  const [duelIdx, setDuelIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const isTouch = useIsTouchDevice();
  const setEliteResult = useEliteStore((s) => s.setEliteResult);

  const duel = DUELS[duelIdx];
  const playerProfile = location.state?.playerProfile;

  /* ── evaluate a finished duel → weighted score + coach note ── */
  const evaluate = useCallback((st, outcome) => {
    const d = DUELS[st.duelIdx];
    let pts = 0; const notes = [];

    // Jockey discipline: fraction of live time in the ideal band, goal-side.
    const disc = st.timeLive > 0 ? st.timeInBand / st.timeLive : 0;
    pts += Math.round(disc * 25);
    if (disc > 0.6) notes.push('Excellent jockeying — right distance, goal-side, patient.');
    else if (disc < 0.3) notes.push(`Cushion drifted — live in the ${JOCKEY_BAND[0]}–${JOCKEY_BAND[1]}m band: close enough to press a touch, far enough not to be rolled.`);

    // Channel: did you shepherd them out of the central danger zone?
    if (d.type !== 'overload' && st.shepherded) { pts += 10; notes.push('Good angle — you showed them away from the danger zone.'); }

    // Outcome + engage-decision quality
    switch (outcome) {
      case 'won_heavy':
        pts += 55; notes.unshift("Perfect trigger: heavy touch, in range, decisive. That's WHEN you engage."); break;
      case 'won_early_covered':
        pts += 45; notes.unshift('Aggressive press with cover behind — a calculated risk that paid off. Right idea for this scenario.'); break;
      case 'beaten_dive_nocover':
        pts += 5; notes.unshift('You dived in as last man on a controlled touch. With no cover, patience IS the defending — make them make the mistake.'); break;
      case 'beaten_dive_covered':
        pts += 18; notes.unshift('Beaten, but with cover set that press was a defensible gamble — better here than in the solo duels.'); break;
      case 'beaten_pace':
        pts += 15; notes.unshift('Knocked past you — your cushion was too tight for their speed. Drop half a yard earlier and angle side-on.'); break;
      case 'delayed':
        pts += d.type === 'overload' ? 55 : 30;
        notes.unshift(d.type === 'overload'
          ? 'Outnumbered and you never committed — you delayed, stayed compact and bought recovery time. That is the WIN in a 2v1.'
          : 'You delayed them the full duel. Solid — though a heavy touch came and went; look for that trigger.');
        break;
      case 'pass_slipped':
        pts += 10; notes.unshift('You stepped to the carrier and the pass went round you. In a 2v1, splitting the two — showing outside, screening the lane — beats attacking the ball.'); break;
      default: break;
    }
    if (d.type === 'overload' && outcome !== 'delayed' && st.engaged) {
      notes.push('Rule of the overload: your first job is TIME, not the tackle.');
    }

    return { pts: Math.max(0, Math.min(100, pts)), notes };
  }, []);

  const endDuel = useCallback((outcome) => {
    const st = S.current; if (!st || st.over) return;
    st.over = true;
    const ev = evaluate(st, outcome);
    const entry = { id: DUELS[st.duelIdx].id, title: DUELS[st.duelIdx].title, outcome, ...ev };
    setResults(r => [...r, entry]);
    setFeedback(entry);
    setPhase('feedback');
  }, [evaluate]);

  /* ── three.js scene, sim + RAF ── */
  useEffect(() => {
    if (phase !== 'live') return;
    const container = containerRef.current;
    if (!container) return;

    const handles = createPitchScene({
      container,
      cameraPosition: [0, 12, GOAL_Z + 22],
      cameraTarget: [0, 0.8, 0],
      fov: 48,
    });

    // Hide the factory's north goal so we can place our defensive goal
    // exactly at GOAL_Z (the reference's gameplay reference line).
    handles.goals.north.visible = false;

    // Defensive goal marker at GOAL_Z. Matches the reference visual.
    const goalMesh = new THREE.Mesh(
      new THREE.BoxGeometry(7.3, 2.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    );
    goalMesh.position.set(0, 1.2, GOAL_Z - 0.4);
    handles.scene.add(goalMesh);

    // Central danger-zone semicircle in front of the goal.
    const danger = new THREE.Mesh(
      new THREE.RingGeometry(DANGER_R - 0.25, DANGER_R, 48, 1, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xdc1e28, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    danger.rotation.x = -Math.PI / 2;
    danger.rotation.z = Math.PI;
    danger.position.set(0, 0.02, GOAL_Z);
    handles.scene.add(danger);

    // Actors — createPlayerMesh matches the ~2.02m scale of every other Elite game.
    const d0 = DUELS[duelIdx];
    const you = createPlayerMesh(COL.def, { numberLabel: '5' });
    const att = createPlayerMesh(COL.att, { numberLabel: '9' });
    handles.scene.add(you, att);
    const att2 = d0.type === 'overload' ? createPlayerMesh(COL.attSecondary, { numberLabel: '10' }) : null;
    if (att2) handles.scene.add(att2);
    const cover = d0.type === 'covered' ? createPlayerMesh(COL.defCover, { numberLabel: '4' }) : null;
    if (cover) handles.scene.add(cover);

    // "YOU" indicator ring under the defender.
    const youRing = createHighlightRing(0xffa733);
    you.add(youRing);

    // Ball.
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    );
    ball.castShadow = true;
    handles.scene.add(ball);

    // Sim state — verbatim from reference.
    const st = S.current = {
      duelIdx, over: false, t: 0, timeLive: 0, timeInBand: 0,
      attPos: new THREE.Vector3(d0.attStart[0], 0, d0.attStart[1]),
      att2Pos: att2 ? new THREE.Vector3(d0.attStart[0] + 8, 0, d0.attStart[1] + 3) : null,
      youPos: new THREE.Vector3(d0.attStart[0] * 0.5, 0, (d0.attStart[1] + GOAL_Z) / 2 + 4),
      ballAhead: 0.45, nextTouch: rand(...TOUCH_EVERY), heavy: false, heavyT: 0,
      cushionTarget: 2.0, strafeTarget: 0, engaged: false, lunge: 0,
      shepherded: false, ballFlying: null, dragging: false, burst: 0,
      prevYou: new THREE.Vector3(), prevAtt: new THREE.Vector3(),
      prevAtt2: att2 ? new THREE.Vector3() : null,
    };
    st.strafeTarget = st.youPos.x;
    st.prevYou.copy(st.youPos);
    st.prevAtt.copy(st.attPos);
    if (st.prevAtt2) st.prevAtt2.copy(st.att2Pos);

    // Input: drag = jockey; button = engage.
    const el = handles.renderer.domElement;
    const onDown = (e) => { st.dragging = true; el.setPointerCapture?.(e.pointerId); };
    const onMove = (e) => {
      if (!st.dragging || st.over) return;
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = (e.clientY - r.top) / r.height;
      st.strafeTarget = st.attPos.x + nx * 7;
      st.cushionTarget = 0.9 + ny * 2.6;
    };
    const onUp = () => { st.dragging = false; };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const engage = () => {
      if (st.over || st.engaged) return;
      st.engaged = true;
      st.lunge = 0.32;
    };
    engageFnRef.current = engage;
    const btn = btnRef.current;
    btn?.addEventListener('pointerdown', engage);

    // Container resize → refit renderer + camera (orientation flip safe).
    const ro = new ResizeObserver(() => handles.resize());
    ro.observe(container);
    const onWinResize = () => handles.resize();
    window.addEventListener('resize', onWinResize);

    // RAF loop.
    const clock = new THREE.Clock();
    let raf;
    const toward = (v, target, maxStep) => {
      const dx = target - v; return v + Math.max(-maxStep, Math.min(maxStep, dx));
    };
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!st.over) {
        st.t += dt; st.timeLive += dt;

        st.prevYou.copy(st.youPos);
        st.prevAtt.copy(st.attPos);
        if (st.prevAtt2 && st.att2Pos) st.prevAtt2.copy(st.att2Pos);

        /* attacker dribbles at goal, angling past your weaker side */
        const goalDir = new THREE.Vector3(0 - st.attPos.x * 0.25, 0, GOAL_Z - st.attPos.z).normalize();
        const gap = st.attPos.distanceTo(st.youPos);
        let speed = ATT_SPEED;
        st.nextTouch -= dt;
        if (st.nextTouch <= 0) {
          st.nextTouch = rand(...TOUCH_EVERY);
          st.heavy = Math.random() < d0.heavyChance;
          st.heavyT = 0;
          st.ballAhead = st.heavy ? rand(...HEAVY_PUSH) : rand(...CTRL_PUSH);
          if (!st.heavy && gap < 1.3 && Math.random() < 0.5) st.burst = 0.8;
        }
        if (st.heavy) { st.heavyT += dt; if (st.heavyT > 0.55) st.heavy = false; }
        if (st.burst) { speed = ATT_BURST; st.burst -= dt; if (st.burst <= 0) st.burst = 0; }
        st.attPos.addScaledVector(goalDir, speed * dt);

        /* 2v1: second attacker holds a passing line; carrier releases if you commit */
        if (st.att2Pos) {
          st.att2Pos.z = toward(st.att2Pos.z, st.attPos.z + 1.5, 3.8 * dt);
          st.att2Pos.x = toward(st.att2Pos.x, st.attPos.x + 9, 3.2 * dt);
          const laneOpen = Math.abs(st.youPos.x - (st.attPos.x + st.att2Pos.x) / 2) > 3.5;
          if ((st.engaged || gap < 1.2) && laneOpen && !st.ballFlying) {
            st.ballFlying = { from: st.attPos.clone(), to: st.att2Pos.clone(), t: 0 };
          }
        }

        /* you: strafe + cushion (drag), always goal-side of the carrier */
        st.youPos.x = toward(st.youPos.x, st.strafeTarget, DEF_SPEED * dt);
        const idealZ = st.attPos.z - st.cushionTarget - st.ballAhead * 0.4;
        st.youPos.z = toward(st.youPos.z, Math.max(idealZ, GOAL_Z + 2), DEF_SPEED * dt);

        /* jockey band credit */
        if (gap >= JOCKEY_BAND[0] && gap <= JOCKEY_BAND[1] &&
            Math.abs(st.youPos.x - st.attPos.x) < 2.2) st.timeInBand += dt;
        if (Math.abs(st.attPos.x) > DANGER_R * 0.9) st.shepherded = true;

        /* engage resolution */
        if (st.lunge > 0) {
          st.lunge -= dt;
          const ballPos = st.attPos.clone().addScaledVector(goalDir, st.ballAhead);
          const reach = st.youPos.distanceTo(ballPos);
          if (reach < ENGAGE_RANGE) {
            if (st.heavy) return endDuel('won_heavy');
            if (d0.type === 'covered') return Math.random() < 0.55
              ? endDuel('won_early_covered') : endDuel('beaten_dive_covered');
            return endDuel(d0.type === 'solo' ? 'beaten_dive_nocover' : 'pass_slipped');
          }
          if (st.lunge <= 0) st.engaged = false;
        }

        /* pass in flight (2v1) */
        if (st.ballFlying) {
          st.ballFlying.t += dt * 1.6;
          if (st.ballFlying.t >= 1) return endDuel('pass_slipped');
        }

        /* beaten? */
        if (st.attPos.z < st.youPos.z - 0.6 && gap > 1.6) return endDuel('beaten_pace');
        if (st.attPos.distanceTo(new THREE.Vector3(0, 0, GOAL_Z)) < 6) return endDuel('beaten_pace');
        if (st.t > (d0.recoverySecs ?? DUEL_TIME)) return endDuel('delayed');
      }

      /* write transforms + walk animation */
      you.position.copy(st.youPos);
      you.lookAt(st.attPos.x, 0, st.attPos.z);
      you.rotateY(0.5);                                   // side-on jockey stance
      att.position.copy(st.attPos);
      att.lookAt(0, 0, GOAL_Z);
      if (att2 && st.att2Pos) {
        att2.position.copy(st.att2Pos);
        att2.lookAt(st.attPos.x, 0, st.attPos.z);
      }
      if (cover) cover.position.set(st.youPos.x * 0.4, 0, Math.max(st.youPos.z - 5, GOAL_Z + 3));

      // Drive walk animation from movement magnitude, matching how sibling
      // Elite games call animatePlayerStep from their RAF loops.
      const youMoving = st.prevYou.distanceTo(st.youPos) > 0.02;
      const attMoving = st.prevAtt.distanceTo(st.attPos) > 0.02;
      animatePlayerStep(you, youMoving, dt);
      animatePlayerStep(att, attMoving, dt);
      if (att2 && st.prevAtt2) {
        const a2Moving = st.prevAtt2.distanceTo(st.att2Pos) > 0.02;
        animatePlayerStep(att2, a2Moving, dt);
      }
      if (cover) animatePlayerStep(cover, false, dt);

      const bp = st.ballFlying
        ? st.ballFlying.from.clone().lerp(st.ballFlying.to, Math.min(st.ballFlying.t, 1))
        : st.attPos.clone().addScaledVector(
            new THREE.Vector3(-st.attPos.x * 0.25, 0, GOAL_Z - st.attPos.z).normalize(),
            st.ballAhead,
          );
      ball.position.set(bp.x, 0.24, bp.z);

      /* pulse the YOU ring */
      const rs = 1 + Math.sin(st.t * 6) * 0.12;
      youRing.scale.set(rs, rs, 1);

      /* broadcast camera from behind the defender */
      handles.camera.position.lerp(new THREE.Vector3(st.youPos.x * 0.7, 7.5, st.youPos.z + 11), 0.08);
      handles.camera.lookAt(st.attPos.x, 0.8, st.attPos.z);

      handles.renderer.render(handles.scene, handles.camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      btn?.removeEventListener('pointerdown', engage);
      engageFnRef.current = null;
      // dispose returns all cached scene resources including the canvas.
      handles.dispose();
    };
  }, [phase, duelIdx, endDuel]);

  const finish = (finalResults) => {
    const score = finalResults.length
      ? Math.round(finalResults.reduce((a, r) => a + r.pts, 0) / finalResults.length)
      : 0;
    setPhase('done');
    setEliteResult('elite_duels', { score });
    onCompleteProp?.({ score, duels: finalResults });

    // Persist server-side like the other Elite games (silent on failure).
    if (playerProfile?.firstname) {
      submitScore({
        firstname: playerProfile.firstname,
        lastname: playerProfile.lastname || '',
        club: '',
        gender: '',
        gameType: 'elite_duels',
        score,
        reactionTime: null,
      }).then(() => toast.success('elite_duels saved')).catch(() => {});
    }
  };

  const next = () => {
    if (duelIdx + 1 < DUELS.length) {
      setDuelIdx((i) => i + 1);
      setFeedback(null);
      setPhase('live');
    } else {
      finish(results);
    }
  };

  const back = () => navigate('/iq-training', { state: { playerProfile } });

  /* ── UI: instruction docked ABOVE the canvas while in motion ── */
  const strip = { fontFamily: COL.mono, background: 'rgba(0,0,0,0.85)', borderLeft: `3px solid ${COL.accent}`, padding: '10px 16px' };

  return (
    <EliteGameShell
      title="Defending Duels — ELITE 3D"
      subtitle={`Duel ${Math.min(duelIdx + 1, DUELS.length)} / ${DUELS.length}`}
      onBack={back}
    >
      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 26 }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', textTransform: 'uppercase', margin: '0 0 12px' }}>Engage or Jockey?</p>
            <p style={{ fontSize: 13, color: '#ffffff99', lineHeight: 1.7, margin: '0 auto 16px' }}>
              Drag on the pitch to jockey — across to shift, up to close down, down to drop off.
              Hit <b style={{ color: COL.red }}>ENGAGE</b> to step in. There's no single right answer:
              you're scored on the QUALITY of the decision for the scenario in front of you.
            </p>
            <button
              onClick={() => setPhase('live')}
              style={{ marginTop: 6, fontFamily: COL.mono, fontWeight: 900, fontSize: 13, letterSpacing: '0.1em', padding: '12px 34px', background: COL.accent, color: '#04120a', border: 'none', cursor: 'pointer' }}
            >
              START
            </button>
          </div>
        </div>
      )}

      {phase === 'live' && (
        <>
          <div style={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 5, ...strip, pointerEvents: 'none' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.22em', color: COL.accent, margin: '0 0 3px', textTransform: 'uppercase' }}>{duel.title}</p>
            <p style={{ fontSize: 11, color: '#ffffffb0', margin: 0, lineHeight: 1.5 }}>{duel.brief}</p>
          </div>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none' }} />
          <button
            ref={btnRef}
            style={{
              position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
              fontFamily: COL.mono, fontWeight: 900, fontSize: 15, letterSpacing: '0.14em',
              padding: '14px 46px', background: COL.red, color: '#fff', border: '2px solid #fff3',
              cursor: 'pointer', touchAction: 'none', zIndex: 6,
            }}
            onTouchEnd={(e) => { if (isTouch) { e.preventDefault(); engageFnRef.current?.(); } }}
          >
            ENGAGE
          </button>
        </>
      )}

      {phase === 'feedback' && feedback && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 26, background: 'rgba(0,0,0,0.55)' }}>
          <div style={{ maxWidth: 480, width: '100%', borderLeft: `3px solid ${feedback.pts >= 55 ? COL.accent : COL.red}`, background: '#071a0e', padding: '22px 26px' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: feedback.pts >= 55 ? COL.accent : COL.red, margin: '0 0 8px' }}>
              {feedback.pts >= 75 ? 'Elite read' : feedback.pts >= 55 ? 'Good defending' : "Coach's note"} · {feedback.pts}/100
            </p>
            {feedback.notes.map((n, i) => (
              <p key={i} style={{ fontSize: i === 0 ? 13 : 11, color: i === 0 ? '#ffffffd9' : '#ffffff80', lineHeight: 1.65, margin: '0 0 10px' }}>{n}</p>
            ))}
            <button
              onClick={next}
              style={{ marginTop: 6, fontFamily: COL.mono, fontWeight: 900, fontSize: 12, letterSpacing: '0.1em', padding: '10px 26px', background: COL.accent, color: '#04120a', border: 'none', cursor: 'pointer' }}
            >
              {duelIdx + 1 < DUELS.length ? 'NEXT DUEL' : 'FINISH'}
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 26 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: COL.accent, letterSpacing: '0.1em', margin: '0 0 12px' }}>FINISHED</p>
            <button
              onClick={back}
              style={{ fontFamily: COL.mono, fontWeight: 900, fontSize: 13, letterSpacing: '0.1em', padding: '12px 34px', background: COL.accent, color: '#04120a', border: 'none', cursor: 'pointer' }}
            >
              BACK TO HUB
            </button>
          </div>
        </div>
      )}
    </EliteGameShell>
  );
}
