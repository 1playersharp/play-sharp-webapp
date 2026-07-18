import { useEffect, useRef, useState, useCallback } from "react";
import GameStageLayout from "@/components/games/GameStageLayout";

/**
 * RadarPressGame — Under Pressure Decision Drill
 *
 * A rotating radar sweep (submarine sonar style) reveals opponents pressing
 * the player. Between sweeps, player-models fade — you only know what your last
 * scan showed. You must decide the best action based on your scan.
 *
 * Phases per scenario:
 *   scanning  → radar sweeps 1–2 times, revealing player-models as it passes
 *   deciding  → radar dims, pitch visible, pick an option badge
 *   feedback  → coach note, then next scenario
 *
 * Coord system: normalised [0,1] from centre of radar.
 * YOU are always at the centre.
 */

/* ─── Design tokens ─────────────────────────────────────────── */
const KIT = {
  home:   { fill: "#dc1e28", stroke: "#fff" },
  opp:    { fill: "#0a0a0a", stroke: "#fff" },
  keeper: { fill: "#f4c430", stroke: "#0a0a0a" },
  you:    { fill: "#ff7a1f", stroke: "#fff" },
};
const RADAR_COLOR   = "#00ff88";
const RADAR_BG      = "#030f06";
const SWEEP_MS      = 2200;   // one full 360° sweep

const FADE_MS       = 1800;   // how long a revealed blip stays bright
const PRESS_STOP    = 0.18;   // pressers halt at this normalised dist from YOU
const easeOutPress  = t => 1 - Math.pow(1 - Math.min(t, 1), 2.4); // fast then decelerates

/* ─── Jersey drawing (matches ScanningGame / DecisionGame) ─── */
function drawJersey(ctx, cx, cy, kitKey, isYou, scale = 1) {
  const { fill, stroke } = KIT[kitKey] || KIT.home;
  const s = (isYou ? 1.15 : 1) * scale;
  const bw = 18*s, bh = 20*s, sw = 7*s, sh = 9*s, hr = 7*s;
  const hy = cy - bh * 0.5 - hr * 0.6;

  ctx.save();

  // shadow
  ctx.save(); ctx.scale(1, 0.28);
  ctx.beginPath();
  ctx.ellipse(cx, (cy + bh * 0.55) / 0.28, bw * 0.72, bw * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();
  ctx.restore();

  // sleeves
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(side === -1 ? cx - bw/2 - sw + 2 : cx + bw/2 - 2, cy - sh/2, sw, sh, 3*s);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = isYou ? 2 : 1.4; ctx.stroke();
  }
  // body
  ctx.beginPath();
  ctx.roundRect(cx - bw/2, cy - bh*0.42, bw, bh, 4*s);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = isYou ? 2 : 1.4; ctx.stroke();
  // collar
  ctx.beginPath();
  ctx.moveTo(cx, cy - bh*0.42 + 4*s);
  ctx.lineTo(cx - 4*s, cy - bh*0.42 + 4*s);
  ctx.lineTo(cx, cy - bh*0.42 + 9*s);
  ctx.lineTo(cx + 4*s, cy - bh*0.42 + 4*s);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fill();
  // head
  ctx.beginPath(); ctx.arc(cx, hy, hr, 0, Math.PI*2);
  ctx.fillStyle = "#e8c49a"; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = isYou ? 2.2 : 1.4; ctx.stroke();
  // YOU ring
  if (isYou) {
    ctx.beginPath(); ctx.arc(cx, hy, hr + 4, 0, Math.PI*2);
    ctx.strokeStyle = KIT.you.fill; ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawLabel(ctx, cx, cy, label, isYou, scale = 1) {
  const s = (isYou ? 1.15 : 1) * scale;
  const bh = 20 * s;
  const txt = isYou ? "YOU" : label;
  ctx.font = `bold ${isYou ? 11 : 9}px 'JetBrains Mono', monospace`;
  const tw = ctx.measureText(txt).width;
  const pw = tw + 8, ph = 14;
  const px = cx - pw/2, py = cy + bh * 0.6 + 4;
  ctx.fillStyle = "rgba(0,0,0,0.82)";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 3); ctx.fill();
  ctx.strokeStyle = isYou ? KIT.you.fill : "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = isYou ? KIT.you.fill : "#fff";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(txt, cx, py + ph/2);
}

/* ─── Scenarios ─────────────────────────────────────────────── */
// Players are in polar coords relative to YOU (centre):
//   angle: 0=right, PI/2=down, PI=left (standard canvas)
//   dist:  0–1 where 1 = edge of radar
// The radar sweep reveals them as it passes their angle.
// "visible" and "revealedAt" are runtime state, not data.

const SCENARIOS = [
  {
    id: "double_press_escape",
    title: "Double Press — Find the Escape",
    subtitle: "Two opponents closing hard. One teammate free.",
    sweeps: 2,
    players: [
      { id: "p1", kit: "opp",  angle: Math.PI * 0.15, dist: 0.30, label: "CM",  pressing: true },
      { id: "p2", kit: "opp",  angle: Math.PI * 0.82, dist: 0.28, label: "AM",  pressing: true },
      { id: "p3", kit: "home", angle: Math.PI * 1.45, dist: 0.55, label: "LB",  pressing: false },
      { id: "p4", kit: "home", angle: Math.PI * 0.50, dist: 0.72, label: "ST",  pressing: false },
      { id: "p5", kit: "opp",  angle: Math.PI * 1.10, dist: 0.65, label: "RB",  pressing: false },
    ],
    question: "Two opponents pressing tight. What's your best action?",
    options: [
      {
        key: "A", label: "Lay off to the LB in space", short: "Pass LB",
        recommended: true,
        reason: "LB is behind you with space — simple back pass resets under no pressure. The two pressers have committed forward.",
        badgeAngle: Math.PI * 1.45, badgeDist: 0.55,
      },
      {
        key: "B", label: "Drive through the press centrally", short: "Drive central",
        reason: "Both opponents are tight and central — driving into them risks a turnover in a dangerous area.",
        badgeAngle: Math.PI * 0.50, badgeDist: 0.35,
      },
      {
        key: "C", label: "Long ball to the striker", short: "Long ball ST",
        reason: "Striker is an option but under pressure a long ball is low percentage. The simple pass to LB is the smart play.",
        badgeAngle: Math.PI * 0.50, badgeDist: 0.72,
      },
    ],
  },
  {
    id: "blind_side_press",
    title: "Blind Side Press",
    subtitle: "Presser approaching from behind — did you catch it on the scan?",
    sweeps: 1,
    // Only ONE sweep — player may miss the blind-side presser if not concentrating
    players: [
      { id: "p1", kit: "opp",  angle: Math.PI * 1.80, dist: 0.22, label: "CM",  pressing: true,  blindSide: true },
      { id: "p2", kit: "opp",  angle: Math.PI * 0.30, dist: 0.55, label: "RB",  pressing: false },
      { id: "p3", kit: "home", angle: Math.PI * 0.70, dist: 0.60, label: "RW",  pressing: false },
      { id: "p4", kit: "home", angle: Math.PI * 1.20, dist: 0.50, label: "CB",  pressing: false },
    ],
    question: "Presser closing from behind (π≈5:30 on the clock). What do you do?",
    options: [
      {
        key: "A", label: "First touch away from pressure, then pass CB", short: "Touch + CB",
        recommended: true,
        reason: "The presser came from your 5 o'clock — first touch away creates space instantly. CB is free and close.",
        badgeAngle: Math.PI * 1.20, badgeDist: 0.50,
      },
      {
        key: "B", label: "Turn into the presser", short: "Turn & drive",
        reason: "Turning into a blind-side presser at this distance gives them the ball. You needed to spot them earlier.",
        badgeAngle: Math.PI * 1.80, badgeDist: 0.30,
      },
      {
        key: "C", label: "Play it wide to the right winger", short: "Wide RW",
        reason: "RW is a decent outlet but the CB behind is under less pressure and safer with a presser on your blind side.",
        badgeAngle: Math.PI * 0.70, badgeDist: 0.60,
      },
    ],
  },
  {
    id: "overload_vs_free_man",
    title: "Overload or Free Man?",
    subtitle: "Opponents overloading left — right side is open.",
    sweeps: 2,
    players: [
      { id: "p1", kit: "opp",  angle: Math.PI * 1.25, dist: 0.32, label: "LM",  pressing: true },
      { id: "p2", kit: "opp",  angle: Math.PI * 1.45, dist: 0.28, label: "LW",  pressing: true },
      { id: "p3", kit: "opp",  angle: Math.PI * 1.65, dist: 0.45, label: "LB",  pressing: false },
      { id: "p4", kit: "home", angle: Math.PI * 0.20, dist: 0.65, label: "RW",  pressing: false },
      { id: "p5", kit: "home", angle: Math.PI * 0.55, dist: 0.40, label: "ST",  pressing: false },
    ],
    question: "Three opponents left side, right side open. Pick your action.",
    options: [
      {
        key: "A", label: "Switch to the free right winger", short: "Switch RW",
        recommended: true,
        reason: "Three opponents overloaded left leaving RW completely open. Switch the play — one pass changes the game.",
        badgeAngle: Math.PI * 0.20, badgeDist: 0.65,
      },
      {
        key: "B", label: "Play into the striker centrally", short: "Central ST",
        reason: "Striker is OK but contested. The real advantage is the open right side — use it.",
        badgeAngle: Math.PI * 0.55, badgeDist: 0.40,
      },
      {
        key: "C", label: "Dribble away from the left pressure", short: "Dribble right",
        reason: "Dribbling buys time but doesn't exploit the overload. Switch the ball to maximise the space.",
        badgeAngle: Math.PI * 0.05, badgeDist: 0.30,
      },
    ],
  },
  {
    id: "press_trap",
    title: "Press Trap",
    subtitle: "Opponents funnelling you toward the line — find the way out.",
    sweeps: 2,
    players: [
      { id: "p1", kit: "opp",  angle: Math.PI * 0.10, dist: 0.30, label: "CM",  pressing: true },
      { id: "p2", kit: "opp",  angle: Math.PI * 1.90, dist: 0.30, label: "AM",  pressing: true },
      { id: "p3", kit: "opp",  angle: Math.PI * 0.92, dist: 0.38, label: "RB",  pressing: true },
      { id: "p4", kit: "home", angle: Math.PI * 1.50, dist: 0.58, label: "CB",  pressing: false },
      { id: "p5", kit: "home", angle: Math.PI * 1.20, dist: 0.70, label: "GK",  pressing: false },
    ],
    question: "Three opponents forming a press trap. Where's the exit?",
    options: [
      {
        key: "A", label: "Back pass to CB then switch", short: "Back to CB",
        recommended: true,
        reason: "CB is free behind — back pass resets. From CB the switch opens up. Never force it through a press trap.",
        badgeAngle: Math.PI * 1.50, badgeDist: 0.58,
      },
      {
        key: "B", label: "Play it back to the GK", short: "Back to GK",
        reason: "GK is an option but extreme — CB is the right first step and keeps more options open.",
        badgeAngle: Math.PI * 1.20, badgeDist: 0.70,
      },
      {
        key: "C", label: "Force through the press", short: "Force through",
        reason: "Three coordinated pressers with no gap — forcing through risks a turnover in a dangerous position.",
        badgeAngle: Math.PI * 0.50, badgeDist: 0.30,
      },
    ],
  },
  {
    id: "single_press_time",
    title: "Single Press — Time to Think",
    subtitle: "Only one presser. You have time — use the scan.",
    sweeps: 2,
    players: [
      { id: "p1", kit: "opp",  angle: Math.PI * 0.05, dist: 0.35, label: "CM",  pressing: true },
      { id: "p2", kit: "home", angle: Math.PI * 0.65, dist: 0.55, label: "ST",  pressing: false },
      { id: "p3", kit: "home", angle: Math.PI * 1.35, dist: 0.50, label: "LM",  pressing: false },
      { id: "p4", kit: "home", angle: Math.PI * 1.80, dist: 0.45, label: "LB",  pressing: false },
      { id: "p5", kit: "opp",  angle: Math.PI * 0.80, dist: 0.72, label: "RB",  pressing: false },
    ],
    question: "One light press. Three teammates visible. Best use of the time?",
    options: [
      {
        key: "A", label: "Carry forward, then release to ST", short: "Carry + ST",
        recommended: true,
        reason: "One presser with space ahead — carry into the space briefly to draw them, then slip to the striker who has a run.",
        badgeAngle: Math.PI * 0.65, badgeDist: 0.55,
      },
      {
        key: "B", label: "Immediate pass to LM", short: "Quick LM",
        reason: "LM is fine but rushing it wastes the advantage — one presser means you have time to carry and pick the better option.",
        badgeAngle: Math.PI * 1.35, badgeDist: 0.50,
      },
      {
        key: "C", label: "Back to LB to reset", short: "Reset LB",
        reason: "Resetting backward with only one presser wastes the forward momentum. Go forward.",
        badgeAngle: Math.PI * 1.80, badgeDist: 0.45,
      },
    ],
  },
];

const OPT_COLORS = { A: "#dc1e28", B: "#ffffff", C: "#2ead3c", D: "#3aa3ff" };

/* ─── Polar → canvas coords ─────────────────────────────────── */
function polarToXY(angle, dist, cx, cy, R) {
  return {
    x: cx + Math.cos(angle) * dist * R,
    y: cy + Math.sin(angle) * dist * R,
  };
}

/* ─── Main component ─────────────────────────────────────────── */
export default function RadarPressGame({ onComplete }) {
  const canvasRef   = useRef(null);
  const animRef     = useRef(null);
  const stateRef    = useRef({
    phase: "scanning",
    sweepAngle: -Math.PI / 2,   // starts at top (12 o'clock)
    sweepStart: 0,
    sweepsCompleted: 0,
    scenarioIdx: 0,
    // per-player: { revealedAt, lastSeenAlpha }
    revealed: {},
  });

  const [idx,      setIdx]      = useState(0);
  const [phase,    setPhase]    = useState("scanning");
  const [feedback, setFeedback] = useState(null);
  const [results,  setResults]  = useState([]);
  const decideAtRef             = useRef(0);

  const sc = SCENARIOS[idx];

  /* ── canvas geometry ── */
  const W = 680, H = 520;
  const CX = W / 2, CY = H / 2;
  const R  = Math.min(W, H) * 0.42;   // radar radius

  /* ── init a scenario ── */
  const initScenario = useCallback((i) => {
    const st = stateRef.current;
    st.scenarioIdx = i;
    st.phase = "scanning";
    st.sweepAngle = -Math.PI / 2;
    st.sweepStart = performance.now();
    st.sweepsCompleted = 0;
    st.revealed = {};
    st.playerDist = {};          // live normalised dist from YOU per player
    const now = performance.now();
    SCENARIOS[i].players.forEach(p => {
      st.revealed[p.id]  = { revealedAt: null, alpha: 0 };
      // pressers start at their defined dist and close in over the sweep duration
      st.playerDist[p.id] = {
        current:       p.dist,
        start:         p.dist,
        pressStartTime: p.pressing ? now : null,   // null = not pressing
        // total travel time = number of sweeps × sweep duration × a speed factor
      };
    });
  }, []);

  /* ── render loop ── */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const now = performance.now();
    const st  = stateRef.current;
    const sc  = SCENARIOS[st.scenarioIdx];

    ctx.clearRect(0, 0, W, H);

    /* ── RADAR BACKGROUND ── */
    // outer dark fill
    ctx.fillStyle = "#020a04";
    ctx.fillRect(0, 0, W, H);

    // pitch stripe texture (subtle, behind radar)
    const sh = H / 8;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(16,40,22,0.4)" : "rgba(8,22,12,0.4)";
      ctx.fillRect(0, i * sh, W, sh);
    }

    /* ── radar dish circle ── */
    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = RADAR_BG; ctx.fill();
    ctx.strokeStyle = RADAR_COLOR; ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.clip();  // clip all radar drawing to the dish

    // range rings
    [0.25, 0.5, 0.75, 1.0].forEach(r => {
      ctx.beginPath(); ctx.arc(CX, CY, R * r, 0, Math.PI * 2);
      ctx.strokeStyle = RADAR_COLOR;
      ctx.globalAlpha = r === 1 ? 0.4 : 0.12;
      ctx.lineWidth = r === 1 ? 1.5 : 0.8;
      ctx.stroke(); ctx.globalAlpha = 1;
    });

    // crosshairs
    ctx.strokeStyle = RADAR_COLOR; ctx.globalAlpha = 0.12; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(CX - R, CY); ctx.lineTo(CX + R, CY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX, CY - R); ctx.lineTo(CX, CY + R); ctx.stroke();
    ctx.globalAlpha = 1;

    /* ── sweep beam ── */
    if (st.phase === "scanning") {
      const elapsed  = now - st.sweepStart;
      const progress = (elapsed % SWEEP_MS) / SWEEP_MS;
      st.sweepAngle  = -Math.PI / 2 + progress * Math.PI * 2;
      const fullSweeps = Math.floor(elapsed / SWEEP_MS);
      if (fullSweeps > st.sweepsCompleted) {
        st.sweepsCompleted = fullSweeps;
      }

      // check if done
      if (st.sweepsCompleted >= sc.sweeps && elapsed > sc.sweeps * SWEEP_MS) {
        st.phase = "deciding";
        setPhase("deciding");
        decideAtRef.current = Date.now();
      }

      // glow trail (fan behind sweep line)
      const TRAIL = Math.PI * 0.45;
      const trailGrad = ctx.createConicalGradient
        ? null
        : null; // fallback: draw manually

      // draw trail as stacked arcs
      for (let i = 0; i < 24; i++) {
        const t = i / 24;
        const a1 = st.sweepAngle - TRAIL * (1 - t);
        const a2 = st.sweepAngle - TRAIL * (1 - (i+1)/24);
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, R, a1, a2);
        ctx.closePath();
        ctx.fillStyle = RADAR_COLOR;
        ctx.globalAlpha = t * 0.18;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // sweep line
      const sx = CX + Math.cos(st.sweepAngle) * R;
      const sy = CY + Math.sin(st.sweepAngle) * R;
      const lineGrad = ctx.createLinearGradient(CX, CY, sx, sy);
      lineGrad.addColorStop(0, `${RADAR_COLOR}00`);
      lineGrad.addColorStop(0.4, `${RADAR_COLOR}55`);
      lineGrad.addColorStop(1, RADAR_COLOR);
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(sx, sy);
      ctx.strokeStyle = lineGrad; ctx.lineWidth = 2; ctx.stroke();

      // reveal player-models as sweep passes them
      sc.players.forEach(p => {
        const rel = stateRef.current.revealed[p.id];
        // normalise player angle and sweep angle to [0, 2π]
        const pAngle = ((p.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const sAngle = ((st.sweepAngle + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        // reveal if sweep is within 0.08 rad of player
        if (Math.abs(sAngle - pAngle) < 0.18 || Math.abs(sAngle - pAngle - Math.PI * 2) < 0.18) {
          rel.revealedAt = now;
        }
      });
    }

    /* ── draw player-models (radar blips + jerseys) ── */
    sc.players.forEach(p => {
      const rel  = st.revealed[p.id];
      const pd   = st.playerDist?.[p.id];

      // ── move pressers toward YOU (ease-out deceleration) ──
      if (p.pressing && pd && pd.pressStartTime !== null && st.phase === "scanning") {
        const totalTravelMs = sc.sweeps * SWEEP_MS * 0.85; // close in over most of scan window
        const elapsed = now - pd.pressStartTime;
        const t = easeOutPress(elapsed / totalTravelMs);
        // interpolate from start dist down to PRESS_STOP
        pd.current = pd.start - (pd.start - PRESS_STOP) * t;
      }

      const liveDist = pd ? pd.current : p.dist;
      const pos = polarToXY(p.angle, liveDist, CX, CY, R);

      // Calculate alpha: bright just after reveal, fades over FADE_MS
      let alpha = 0;
      if (rel.revealedAt !== null) {
        if (st.phase === "deciding") {
          // in deciding phase — keep at 0.25 (ghost visibility)
          alpha = 0.28;
        } else {
          const age = now - rel.revealedAt;
          alpha = age < 200
            ? age / 200              // ramp up
            : Math.max(0.12, 1 - (age - 200) / FADE_MS);
        }
      }

      if (alpha < 0.01) return;

      ctx.save();
      ctx.globalAlpha = alpha;

      // radar blip ping
      const kitKey = p.id === "you" ? "you" : p.kit;
      const blipColor = kitKey === "opp" ? "#ff3333" : kitKey === "you" ? KIT.you.fill : "#33aaff";

      // pressing player-models get a larger, pulsing blip ring
      if (p.pressing) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 250);
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 18 + pulse * 6, 0, Math.PI * 2);
        ctx.strokeStyle = blipColor; ctx.lineWidth = 1.5;
        ctx.globalAlpha = alpha * 0.45 * pulse; ctx.stroke();
        ctx.globalAlpha = alpha;
      }

      // draw the jersey
      drawJersey(ctx, pos.x, pos.y, kitKey, false, 0.85);
      drawLabel(ctx, pos.x, pos.y, p.label, false, 0.85);

      // motion trail — short dashed line behind presser showing direction of travel
      if (p.pressing && pd && alpha > 0.25) {
        const ang = Math.atan2(CY - pos.y, CX - pos.x);
        // trail goes AWAY from YOU (opposite of travel direction)
        const trailLen = Math.min((pd.start - pd.current) * R * 1.6, 36);
        if (trailLen > 2) {
          const tx1 = pos.x - Math.cos(ang) * 20;
          const ty1 = pos.y - Math.sin(ang) * 20;
          const tx2 = pos.x - Math.cos(ang) * (20 + trailLen);
          const ty2 = pos.y - Math.sin(ang) * (20 + trailLen);
          const trailGrad = ctx.createLinearGradient(tx1, ty1, tx2, ty2);
          trailGrad.addColorStop(0, "rgba(255,60,60,0.55)");
          trailGrad.addColorStop(1, "rgba(255,60,60,0)");
          ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx2, ty2);
          ctx.strokeStyle = trailGrad; ctx.lineWidth = 2.5;
          ctx.globalAlpha = alpha * 0.8;
          ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
          ctx.globalAlpha = alpha;
        }
      }

      ctx.restore();
    });

    /* ── YOU (always at centre) ── */
    ctx.save();
    drawJersey(ctx, CX, CY, "you", true, 1);
    drawLabel(ctx, CX, CY, "YOU", true, 1);

    // centre dot
    ctx.beginPath(); ctx.arc(CX, CY - 14, 3, 0, Math.PI * 2);
    ctx.fillStyle = KIT.you.fill; ctx.fill();
    ctx.restore();

    /* ── deciding phase: dim + badge options ── */
    if (st.phase === "deciding") {
      // subtle dark overlay — keep ghosts visible
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore(); // restore clip

    /* ── clock face ticks (outside clip) ── */
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x1 = CX + Math.cos(a) * (R + 4);
      const y1 = CY + Math.sin(a) * (R + 4);
      const x2 = CX + Math.cos(a) * (R + 10);
      const y2 = CY + Math.sin(a) * (R + 10);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = RADAR_COLOR; ctx.lineWidth = i % 3 === 0 ? 2 : 1;
      ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
    }

    // sweep count indicator
    if (st.phase === "scanning") {
      const done  = Math.min(st.sweepsCompleted, sc.sweeps);
      const total = sc.sweeps;
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.fillStyle = RADAR_COLOR; ctx.globalAlpha = 0.7;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(`SWEEP ${done + 1} / ${total}`, 20, H - 38);
      ctx.globalAlpha = 1;
    }

    animRef.current = requestAnimationFrame(render);
  }, [CX, CY, R, W, H]);

  /* ── boot render + scenario ── */
  useEffect(() => {
    initScenario(0);
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [render, initScenario]);

  /* ── advance scenario ── */
  useEffect(() => {
    if (idx === 0) return; // handled by boot
    initScenario(idx);
    setPhase("scanning");
    setFeedback(null);
  }, [idx, initScenario]);

  /* ── answer handler ── */
  const handlePick = useCallback((opt) => {
    if (phase !== "deciding") return;
    stateRef.current.phase = "feedback";
    setPhase("feedback");
    const ms = Date.now() - decideAtRef.current;
    const recommended = sc.options.find(o => o.recommended);
    const entry = {
      scenarioId: sc.id, scenarioTitle: sc.title,
      picked: opt.key, pickedLabel: opt.label,
      matchesRecommended: recommended?.key === opt.key,
      reason: opt.reason, ms,
    };
    const next = [...results, entry];
    setResults(next);
    setFeedback({ opt, entry, recommended });

    setTimeout(() => {
      if (idx + 1 < SCENARIOS.length) {
        setIdx(idx + 1);
      } else {
        const total   = SCENARIOS.length;
        const correct = next.filter(x => x.matchesRecommended).length;
        const avgTime = next.reduce((a,b) => a+b.ms, 0) / next.length;
        const speedPts = Math.round((1 - Math.min(1,(Math.max(800,Math.min(3200,avgTime))-800)/2400)) * 20);
        const score = Math.max(0, Math.min(100, Math.round((correct/total)*80) + speedPts));
        onComplete?.({ score, total, correct, avgTime, decisions: next });
      }
    }, 2400);
  }, [phase, idx, results, sc, onComplete]);

  /* ── badge position from polar ── */
  const badgePos = (angle, dist) => {
    const x = CX + Math.cos(angle) * dist * R;
    const y = CY + Math.sin(angle) * dist * R;
    return { left: `${(x/W*100).toFixed(1)}%`, top: `${(y/H*100).toFixed(1)}%` };
  };

  return (
    <div style={{ fontFamily:"'JetBrains Mono',monospace", background:"#020a04", borderRadius:8, overflow:"hidden", border:`1px solid ${RADAR_COLOR}22` }}>

      {/* HUD */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 18px", background:"rgba(0,0,0,0.7)", borderBottom:`1px solid ${RADAR_COLOR}22` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:10, letterSpacing:"0.22em", color: RADAR_COLOR, textTransform:"uppercase" }}>Radar Press</span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>SCENARIO {idx+1} / {SCENARIOS.length}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{
            width:7, height:7, borderRadius:"50%", display:"inline-block",
            background: phase==="scanning" ? RADAR_COLOR : phase==="deciding" ? "#fff" : "#2ead3c",
            boxShadow: phase==="scanning" ? `0 0 6px ${RADAR_COLOR}` : "none",
          }}/>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.18em" }}>
            {phase==="scanning" ? "Scanning…" : phase==="deciding" ? "Decide" : "Feedback"}
          </span>
        </div>
        <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{results.length} / {SCENARIOS.length} done</span>
      </div>

      {/* Instruction panel — docked (never over the play area during motion).
          Feedback stays as a centred overlay inside the canvas wrapper below
          because that phase is paused, which is exempt from the rule. */}
      {(() => {
        const panel = (phase === "scanning" || phase === "deciding") ? (
          <div style={{
            border: `1px solid ${phase === "scanning" ? `${RADAR_COLOR}33` : "rgba(255,255,255,0.1)"}`,
            borderLeft: `3px solid ${phase === "scanning" ? RADAR_COLOR : "#dc1e28"}`,
            background: "rgba(0,0,0,0.85)",
            padding: "10px 16px",
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {phase === "scanning" ? (
              <>
                <p style={{ fontSize:9, letterSpacing:"0.25em", color: RADAR_COLOR, margin:"0 0 6px", textTransform:"uppercase" }}>
                  Scenario {idx+1} · {sc.sweeps === 1 ? "One sweep only" : `${sc.sweeps} sweeps`}
                </p>
                <p style={{ fontSize:15, fontWeight:900, color:"#fff", margin:"0 0 4px", textTransform:"uppercase" }}>{sc.title}</p>
                <p style={{ fontSize:10, color:"rgba(255,255,255,0.4)", margin:0 }}>{sc.subtitle}</p>
              </>
            ) : (
              <>
                <p style={{ fontSize:9, letterSpacing:"0.22em", color:"#dc1e28", margin:"0 0 4px", textTransform:"uppercase" }}>Decide</p>
                <p style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0, textTransform:"uppercase", letterSpacing:"0.02em" }}>{sc.question}</p>
              </>
            )}
          </div>
        ) : null;

        // Canvas wrapper — position:relative anchors the spatial option
        // badges (positioned via % from badgePos()) and the paused-phase
        // feedback modal (inset:0). Nothing that lives here counts as
        // "instructional overlay" during motion: badges are gameplay,
        // feedback is paused. Canvas itself is width:100% + aspect-ratio so
        // it never forces the container taller than the viewport.
        const canvasWrapper = (
          <div style={{ position:"relative", width:"100%" }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              style={{
                display:"block",
                width:"100%",
                height:"auto",
                aspectRatio: `${W} / ${H}`,
                maxWidth: W,
                margin: "0 auto",
              }}
            />

            {phase === "deciding" && sc.options.map(opt => {
              const pos = badgePos(opt.badgeAngle, opt.badgeDist);
              const col = OPT_COLORS[opt.key];
              return (
                <button key={opt.key} onClick={() => handlePick(opt)} style={{
                  position:"absolute", ...pos,
                  transform:"translate(-50%,-50%)",
                  display:"flex", alignItems:"stretch",
                  border:`2px solid ${col}`, background:"rgba(0,0,0,0.94)",
                  borderRadius:0, overflow:"hidden", padding:0,
                  cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
                  boxShadow:`0 0 12px ${col}44`,
                }}>
                  <span style={{ background:col, color:opt.key==="B"?"#000":"#fff", fontWeight:900, fontSize:15, padding:"5px 10px" }}>{opt.key}</span>
                  <span style={{ color:"#fff", fontSize:11, fontWeight:700, padding:"5px 11px", textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{opt.short || opt.label}</span>
                </button>
              );
            })}

            {phase === "feedback" && feedback && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.88)", backdropFilter:"blur(8px)" }}>
                <div style={{
                  maxWidth:440, width:"90%", padding:"28px 32px",
                  border:"1px solid rgba(255,255,255,0.07)", background:"#060e07",
                  borderLeft:`3px solid ${feedback.entry.matchesRecommended ? "#2ead3c" : "#dc1e28"}`,
                }}>
                  <p style={{ fontSize:9, letterSpacing:"0.25em", textTransform:"uppercase", margin:"0 0 10px",
                    color: feedback.entry.matchesRecommended ? "#2ead3c" : "#dc1e28" }}>
                    {feedback.entry.matchesRecommended ? "Good read ✓" : "Coach's note"}
                  </p>
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.3)", margin:"0 0 8px", letterSpacing:"0.1em", textTransform:"uppercase" }}>
                    Your call · {feedback.opt.key} — {feedback.opt.label}
                  </p>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,0.85)", lineHeight:1.65, margin:"0 0 0" }}>
                    {feedback.opt.reason}
                  </p>
                  {!feedback.entry.matchesRecommended && feedback.recommended && (
                    <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:14, marginTop:14 }}>
                      <p style={{ fontSize:9, color:"rgba(255,255,255,0.3)", letterSpacing:"0.18em", textTransform:"uppercase", margin:"0 0 6px" }}>
                        Best read · {feedback.recommended.key} — {feedback.recommended.label}
                      </p>
                      <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", margin:0, lineHeight:1.6 }}>
                        {feedback.recommended.reason}
                      </p>
                    </div>
                  )}
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.18)", marginTop:16 }}>
                    {idx+1 < SCENARIOS.length ? "Next scenario…" : "Calculating score…"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

        return (
          <div style={{ padding: "10px 12px" }}>
            <GameStageLayout canvas={canvasWrapper} panel={panel} panelSide="above" panelWidth={240} />
          </div>
        );
      })()}

      {/* Legend */}
      <div style={{ borderTop:`1px solid ${RADAR_COLOR}15`, padding:"8px 18px", display:"flex", gap:20, alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#ff3333", display:"inline-block" }}/>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.3)", letterSpacing:"0.15em", textTransform:"uppercase" }}>Pressing</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#33aaff", display:"inline-block" }}/>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.3)", letterSpacing:"0.15em", textTransform:"uppercase" }}>Teammate</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.3)", letterSpacing:"0.15em", textTransform:"uppercase" }}>· Blips fade between sweeps — like a real scan</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}