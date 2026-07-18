import { useEffect, useRef, useState, useCallback } from "react";
import GameStageLayout from "@/components/games/GameStageLayout";

/**
 * DecisionGame — Enhanced
 *
 * Changes from original Phaser version:
 *  1. Pure React + Canvas (no Phaser dependency) — consistent with ScanningGame
 *  2. Jersey silhouettes instead of circles (same drawJersey as ScanningGame)
 *  3. Player animations via requestAnimationFrame tweens (ease-in-out)
 *  4. Arrow options drawn on canvas, badges as positioned HTML buttons
 *     (better touch target size + hover states via CSS)
 *  5. Offside line animated — steps forward with the defensive line
 *  6. "Coach recommended" feedback now has a green left border vs red
 *  7. Decision timer shown during "deciding" phase (urgency = realism)
 *  8. Arrow pulse animation on deciding phase to draw the eye
 */

/* ─── Design tokens ─────────────────────────────────────────── */
const PITCH = { bg: "#0c2e17", stripeA: "#103e1f", stripeB: "#0a2515" };
const KIT = {
  home:   { fill: "#dc1e28", stroke: "#ffffff" },
  opp:    { fill: "#0a0a0a", stroke: "#ffffff" },
  keeper: { fill: "#f4c430", stroke: "#0a0a0a" },
  you:    { fill: "#ff7a1f", stroke: "#ffffff" },
};
const OPT_COLORS = { A: "#dc1e28", B: "#ffffff", C: "#2ead3c", D: "#3aa3ff" };

const easeInOut = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
const ANIM_MS   = 1600; // player movement duration

/* ─── Scenarios ─────────────────────────────────────────────── */
const SCENARIOS = [
  {
    id: "channel_runner",
    title: "Channel Runner",
    subtitle: "Striker bending from onside into the channel between LB and LCB",
    panFrom: { x: 0.35, y: 0.35 },
    panTo:   { x: 0.50, y: 0.55 },
    setup: [
      { id: "you",     kit: "you",    x: 0.50, y: 0.62, label: "CM",  hasBall: true },
      { id: "striker", kit: "home",   x: 0.34, y: 0.50, label: "ST" },
      { id: "winger",  kit: "home",   x: 0.78, y: 0.55, label: "RW" },
      { id: "lb",      kit: "opp",    x: 0.20, y: 0.42, label: "LB" },
      { id: "lcb",     kit: "opp",    x: 0.40, y: 0.40, label: "LCB" },
      { id: "rcb",     kit: "opp",    x: 0.60, y: 0.40, label: "RCB" },
      { id: "rb",      kit: "opp",    x: 0.80, y: 0.42, label: "RB" },
      { id: "gk",      kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
    ],
    offside: { y: 0.42 },
    anim: [
      { id: "striker", waypoints: [{ x: 0.30, y: 0.45 }, { x: 0.28, y: 0.36 }, { x: 0.30, y: 0.30 }] },
      { id: "winger",  waypoints: [{ x: 0.80, y: 0.50 }] },
    ],
    offsideAnim: null,
    question: "Pick your action.",
    options: [
      {
        key: "A", label: "Slide a through-ball into the channel", short: "Through-ball",
        recommended: true,
        reason: "He started behind the back line and bent his run perfectly. Ball into the corridor — he runs onto it the right side of the offside trap.",
        arrow: { path: [{ x:.50,y:.62 },{ x:.42,y:.48 },{ x:.32,y:.34 }], badge:{ x:.36,y:.56 } },
      },
      {
        key: "B", label: "Square pass to the right winger", short: "Square pass",
        reason: "Winger is wide but stationary — square balls don't beat the line. Striker's curved run is the higher-value option.",
        arrow: { path: [{ x:.50,y:.62 },{ x:.78,y:.55 }], badge:{ x:.64,y:.66 } },
      },
      {
        key: "C", label: "Hold the ball and let CMs join", short: "Hold / wait",
        reason: "Kills the timing. The runner timed his bend off your body shape — wait too long and LCB recovers the channel.",
        arrow: { path: [{ x:.50,y:.62 },{ x:.50,y:.46 }], badge:{ x:.56,y:.52 } },
      },
    ],
  },
  {
    id: "wide_overload",
    title: "Wide Overload",
    subtitle: "Their full-back stepped out, your overlap is sprinting in behind",
    questionPosition: "bottom",
    panFrom: { x: 0.22, y: 0.55 },
    panTo:   { x: 0.38, y: 0.40 },
    setup: [
      { id: "you",      kit: "you",    x: 0.22, y: 0.45, label: "LM",  hasBall: true },
      { id: "fb_overlap",kit:"home",   x: 0.22, y: 0.62, label: "LB" },
      { id: "ifw",      kit: "home",   x: 0.42, y: 0.42, label: "IF" },
      { id: "striker",  kit: "home",   x: 0.55, y: 0.30, label: "ST" },
      { id: "opp_fb",   kit: "opp",    x: 0.22, y: 0.38, label: "RB" },
      { id: "opp_lcb",  kit: "opp",    x: 0.42, y: 0.34, label: "LCB" },
      { id: "opp_rcb",  kit: "opp",    x: 0.58, y: 0.34, label: "RCB" },
      { id: "opp_lb",   kit: "opp",    x: 0.78, y: 0.36, label: "LB" },
      { id: "gk",       kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
    ],
    offside: { y: 0.36 },
    anim: [
      { id: "opp_fb",    waypoints: [{ x: 0.20, y: 0.44 }] },
      { id: "fb_overlap",waypoints: [{ x: 0.22, y: 0.30 }] },
      { id: "ifw",       waypoints: [{ x: 0.40, y: 0.45 }] },
    ],
    offsideAnim: null,
    question: "Their right-back has committed. Your LB is overlapping into the gap.",
    options: [
      {
        key: "A", label: "Slip it to your overlapping LB", short: "Overlap pass",
        recommended: true,
        reason: "Classic 2v1. RB has bitten, CBs are holding shape — your LB arrives with momentum into a gold-channel cross opportunity.",
        arrow: { path: [{ x:.22,y:.45 },{ x:.22,y:.30 }], badge:{ x:.34,y:.40 } },
      },
      {
        key: "B", label: "Cross immediately into the box", short: "Cross now",
        reason: "Premature. You're not at the byline yet and the angle is too tight. Use the overlap first to break the line.",
        arrow: { path: [{ x:.22,y:.45 },{ x:.32,y:.30 },{ x:.42,y:.20 },{ x:.50,y:.18 }], badge:{ x:.52,y:.22 } },
      },
      {
        key: "C", label: "Drive infield with the ball", short: "Drive inside",
        reason: "Both CBs are holding compact — driving inside walks straight into them. The free space is on the outside.",
        arrow: { path: [{ x:.22,y:.45 },{ x:.36,y:.50 },{ x:.46,y:.48 }], badge:{ x:.52,y:.56 } },
      },
    ],
  },
  {
    id: "defensive_shape",
    title: "Defensive Shape",
    subtitle: "Compact back four. Striker is onside, threatening depth.",
    panFrom: { x: 0.50, y: 0.65 },
    panTo:   { x: 0.50, y: 0.50 },
    setup: [
      { id: "you",      kit: "you",    x: 0.50, y: 0.70, label: "CM",  hasBall: true },
      { id: "striker",  kit: "home",   x: 0.50, y: 0.42, label: "ST" },
      { id: "lw",       kit: "home",   x: 0.20, y: 0.55, label: "LW" },
      { id: "rw",       kit: "home",   x: 0.80, y: 0.55, label: "RW" },
      { id: "opp_lb",   kit: "opp",    x: 0.30, y: 0.38, label: "LB" },
      { id: "opp_lcb",  kit: "opp",    x: 0.44, y: 0.38, label: "LCB" },
      { id: "opp_rcb",  kit: "opp",    x: 0.56, y: 0.38, label: "RCB" },
      { id: "opp_rb",   kit: "opp",    x: 0.70, y: 0.38, label: "RB" },
      { id: "gk",       kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
    ],
    offside: { y: 0.38 },
    anim: [
      { id: "striker",  waypoints: [{ x: 0.50, y: 0.30 }] },
      { id: "opp_lb",   waypoints: [{ x: 0.30, y: 0.40 }] },
      { id: "opp_lcb",  waypoints: [{ x: 0.44, y: 0.40 }] },
      { id: "opp_rcb",  waypoints: [{ x: 0.56, y: 0.40 }] },
      { id: "opp_rb",   waypoints: [{ x: 0.70, y: 0.40 }] },
    ],
    // offside line steps up with the defensive line
    offsideAnim: { fromY: 0.38, toY: 0.40 },
    question: "Compact line. Your striker timed his depth run from onside.",
    options: [
      {
        key: "A", label: "Drive a through-ball before the line resets", short: "Through-ball",
        recommended: true,
        reason: "Striker started onside and burst depth as the line stepped late. Low vertical ball — he's onto it before they recover.",
        arrow: { path: [{ x:.50,y:.70 },{ x:.50,y:.50 },{ x:.50,y:.30 }], badge:{ x:.58,y:.52 } },
      },
      {
        key: "B", label: "Switch wide to the right winger", short: "Switch RW",
        reason: "Wastes the central momentum — switching gives the back four time to drop and reset the offside trap.",
        arrow: { path: [{ x:.50,y:.70 },{ x:.65,y:.62 },{ x:.80,y:.55 }], badge:{ x:.66,y:.66 } },
      },
      {
        key: "C", label: "Hold and wait for the line to drop", short: "Hold / wait",
        reason: "Compact lines don't drop — they hold and step. Your moment is now, not later.",
        arrow: { path: [{ x:.50,y:.70 },{ x:.50,y:.54 }], badge:{ x:.56,y:.60 } },
      },
      {
        key: "D", label: "Switch wide to the left winger", short: "Switch LW",
        reason: "Long sideways ball lets the back four reset shape and re-trap the striker. The vertical option was open.",
        arrow: { path: [{ x:.50,y:.70 },{ x:.35,y:.62 },{ x:.20,y:.55 }], badge:{ x:.34,y:.66 } },
      },
    ],
  },
  {
    id: "winger_in_box",
    title: "Winger in the Box",
    subtitle: "Three runners attacking near-post, penalty spot, and far-post",
    questionPosition: "bottom",
    // Camera starts wide right (where the ball is) then pulls to show the full box
    panFrom: { x: 0.78, y: 0.20 },
    panTo:   { x: 0.55, y: 0.14 },
    setup: [
      // YOU are on the right byline — near-post is the RIGHT post (high x, closest to you)
      // far-post is the LEFT post (low x, furthest from you)
      { id: "you",     kit: "you",    x: 0.82, y: 0.18, label: "RW",   hasBall: true },
      { id: "near",    kit: "home",   x: 0.64, y: 0.10, label: "NEAR" }, // right / near post — close to you
      { id: "spot",    kit: "home",   x: 0.50, y: 0.16, label: "SPOT" }, // penalty spot
      { id: "far",     kit: "home",   x: 0.36, y: 0.10, label: "FAR"  }, // left / far post — furthest from you
      { id: "opp_cb1", kit: "opp",    x: 0.58, y: 0.13, label: "CB" },
      { id: "opp_cb2", kit: "opp",    x: 0.46, y: 0.13, label: "CB" },
      { id: "opp_fb",  kit: "opp",    x: 0.78, y: 0.20, label: "FB" },
      { id: "gk",      kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
    ],
    offside: null,
    anim: [
      { id: "you",  waypoints: [{ x: 0.86, y: 0.13 }] },           // drives to byline
      { id: "near", waypoints: [{ x: 0.66, y: 0.08 }] },           // attacks near post
      { id: "spot", waypoints: [{ x: 0.50, y: 0.13 }] },           // arrives at spot
      { id: "far",  waypoints: [{ x: 0.34, y: 0.08 }] },           // peels to far post
    ],
    offsideAnim: null,
    question: "You're at the byline on the right. Three runners — near-post, spot, far-post.",
    options: [
      {
        key: "A", label: "Whip in for the near-post run", short: "Near-post whip",
        recommended: true,
        // Near post = right post, closest to the ball carrier at x≈0.86
        reason: "Near-post is the right post — your side. A low whipped ball into that zone is hardest to defend: keeper can't come, the near-CB is dragged wide by your run.",
        arrow: { path: [{ x:.86,y:.13 },{ x:.78,y:.09 },{ x:.70,y:.08 },{ x:.66,y:.08 }], badge:{ x:.76,y:.22 } },
      },
      {
        key: "B", label: "Cut back to the penalty spot", short: "Cut-back",
        reason: "Solid option — runner at the spot has a clear sight of goal. But the near-post delivery is higher percentage from this angle as it's harder for the keeper to claim.",
        arrow: { path: [{ x:.86,y:.13 },{ x:.74,y:.18 },{ x:.62,y:.17 },{ x:.50,y:.16 }], badge:{ x:.66,y:.26 } },
      },
      {
        key: "C", label: "Float to the far-post runner", short: "Far-post float",
        // Far post = left post, furthest from the ball — x≈0.34
        reason: "Far-post is the left post — the furthest point from you. A floated cross travels the full width of the box, giving the keeper and defenders time to track and claim.",
        arrow: { path: [{ x:.86,y:.13 },{ x:.68,y:.06 },{ x:.50,y:.05 },{ x:.34,y:.08 }], badge:{ x:.54,y:.20 } },
      },
    ],
  },
];

/* ─── Canvas drawing helpers ────────────────────────────────── */
function drawPitch(ctx, W, H) {
  ctx.fillStyle = PITCH.bg;
  ctx.fillRect(0, 0, W, H);
  const sh = H / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? PITCH.stripeA : PITCH.stripeB;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, i * sh, W, sh);
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 1.5;

  // halfway
  ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2, H/2, 52, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath(); ctx.arc(W/2, H/2, 3, 0, Math.PI*2); ctx.fill();

  const bw = Math.min(340, W*0.44), bh = 110, sw = bw*0.42, sh2 = 42;
  const goalW = bw * 0.22, goalH = 14;

  // top penalty box
  ctx.strokeRect(W/2-bw/2, 0, bw, bh);
  ctx.strokeRect(W/2-sw/2, 0, sw, sh2);
  ctx.strokeRect(W/2-goalW/2, 0, goalW, goalH);
  // penalty spot + arc
  ctx.fillStyle="rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(W/2, 76, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(W/2, 76, 48, Math.PI*0.18, Math.PI-Math.PI*0.18, true); ctx.stroke();

  // bottom penalty box
  ctx.strokeRect(W/2-bw/2, H-bh, bw, bh);
  ctx.strokeRect(W/2-sw/2, H-sh2, sw, sh2);
  ctx.strokeRect(W/2-goalW/2, H-goalH, goalW, goalH);

  // attack direction indicator
  ctx.strokeStyle = "rgba(220,30,40,0.5)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(22, H-90); ctx.lineTo(22, 110); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16,120); ctx.lineTo(22,108); ctx.lineTo(28,120); ctx.stroke();
  ctx.fillStyle = "rgba(220,30,40,0.6)";
  ctx.font = "bold 8px 'JetBrains Mono', monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText("ATTACK", 22, H-78);
}

function drawOffsideLine(ctx, W, H, yRel) {
  const y = yRel * H;
  ctx.save();
  ctx.strokeStyle = "rgba(220,30,40,0.75)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([14, 6]);
  ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(W-8, y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(220,30,40,0.75)";
  ctx.font = "bold 8px 'JetBrains Mono', monospace";
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText("OFFSIDE LINE", W-10, y-3);
  ctx.restore();
}

function drawJersey(ctx, cx, cy, kitKey, isYou) {
  const { fill, stroke } = KIT[kitKey] || KIT.home;
  const s = isYou ? 1.18 : 1;
  const bw = 18*s, bh = 20*s, sw = 7*s, sh = 9*s, hr = 7*s;
  const hy = cy - bh*0.5 - hr*0.6;

  ctx.save();

  // shadow
  ctx.save(); ctx.scale(1, 0.28);
  ctx.beginPath();
  ctx.ellipse(cx, (cy+bh*0.55)/0.28, bw*0.72, bw*0.32, 0, 0, Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fill();
  ctx.restore();

  // sleeves
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(
      side === -1 ? cx - bw/2 - sw + 2 : cx + bw/2 - 2,
      cy - sh/2, sw, sh, 3*s
    );
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = isYou ? 2 : 1.4; ctx.stroke();
  }

  // body
  ctx.beginPath();
  ctx.roundRect(cx - bw/2, cy - bh*0.42, bw, bh, 4*s);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = isYou ? 2 : 1.4; ctx.stroke();

  // collar V
  ctx.beginPath();
  ctx.moveTo(cx, cy - bh*0.42 + 4*s);
  ctx.lineTo(cx - 4*s, cy - bh*0.42 + 4*s);
  ctx.lineTo(cx, cy - bh*0.42 + 9*s);
  ctx.lineTo(cx + 4*s, cy - bh*0.42 + 4*s);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.28)"; ctx.fill();

  // head
  ctx.beginPath(); ctx.arc(cx, hy, hr, 0, Math.PI*2);
  ctx.fillStyle = "#e8c49a"; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = isYou ? 2.2 : 1.4; ctx.stroke();

  // YOU dashed ring
  if (isYou) {
    ctx.beginPath(); ctx.arc(cx, hy, hr+4, 0, Math.PI*2);
    ctx.strokeStyle = KIT.you.fill; ctx.lineWidth = 2;
    ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawPlayerFull(ctx, px, py, kitKey, label, hasBall, isYou) {
  const s = isYou ? 1.18 : 1;
  const bh = 20*s, hr = 7*s;

  drawJersey(ctx, px, py, kitKey, isYou);

  // label pill
  const txt = isYou ? "YOU" : label;
  ctx.font = `bold ${isYou ? 11 : 9.5}px 'JetBrains Mono', monospace`;
  const tw = ctx.measureText(txt).width;
  const pw = tw+10, ph = 15;
  const pillX = px - pw/2, pillY = py + bh*0.6 + 3;
  ctx.fillStyle = "rgba(0,0,0,0.82)";
  ctx.beginPath(); ctx.roundRect(pillX, pillY, pw, ph, 3); ctx.fill();
  ctx.strokeStyle = isYou ? KIT.you.fill : "rgba(255,255,255,0.55)";
  ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = isYou ? KIT.you.fill : "#fff";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(txt, px, pillY + ph/2);

  // ball
  if (hasBall) {
    const bx = px + (10+hr)*0.8, by = py - bh*0.2;
    ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI*2);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.strokeStyle = "#333"; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, 1.8, 0, Math.PI*2);
    ctx.fillStyle = "#222"; ctx.fill();
  }
}

function drawArrow(ctx, W, H, pathPts, color, pulse) {
  const pts = pathPts.map(p => ({ x: p.x*W, y: p.y*H }));

  // pulsing alpha when deciding
  const alpha = pulse ? 0.7 + 0.25 * Math.sin(Date.now() / 280) : 0.88;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // draw line with white glow
  ctx.shadowColor = color;
  ctx.shadowBlur = pulse ? 10 : 4;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  // arrowhead
  const last = pts[pts.length-1];
  const prev = pts[pts.length-2];
  const ang = Math.atan2(last.y-prev.y, last.x-prev.x);
  const hl = 16;
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(last.x - hl*Math.cos(ang-0.52), last.y - hl*Math.sin(ang-0.52));
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(last.x - hl*Math.cos(ang+0.52), last.y - hl*Math.sin(ang+0.52));
  ctx.stroke();

  ctx.restore();
}

/* ─── Main component ─────────────────────────────────────────── */
export default function DecisionGame({ onComplete }) {
  const canvasRef   = useRef(null);
  const animRef     = useRef(null);
  const stateRef    = useRef({
    players: {},      // { id: { x, y, tx, ty, startX, startY, animStart } }
    offsideY: 0,
    offsideTY: 0,
    offsideAnimStart: 0,
    phase: "panning", // panning | animating | deciding | feedback
    panStart: 0,
    cam: { x: 0.5, y: 0.5, zoom: 1 },
    scenarioIdx: 0,
    decidingStart: 0,
  });

  const [idx,      setIdx]      = useState(0);
  const [phase,    setPhase]    = useState("panning");
  const [feedback, setFeedback] = useState(null);
  const [results,  setResults]  = useState([]);
  const [timer,    setTimer]    = useState(0);
  const timerRef = useRef(null);

  const sc = SCENARIOS[idx];

  /* ── init a scenario into stateRef ── */
  const initScenario = useCallback((i) => {
    const s = SCENARIOS[i];
    const st = stateRef.current;
    st.scenarioIdx = i;
    st.phase = "panning";
    st.panStart = performance.now();
    st.cam = { x: s.panFrom.x, y: s.panFrom.y, zoom: 1.14 };

    // reset player-models to setup positions
    st.players = {};
    s.setup.forEach(p => {
      st.players[p.id] = { x: p.x, y: p.y, tx: p.x, ty: p.y, animStart: null, hasBall: p.hasBall, label: p.label, kit: p.id === "you" ? "you" : p.kit, isYou: p.id === "you" };
    });

    st.offsideY  = s.offside?.y ?? null;
    st.offsideTY = s.offside?.y ?? null;
    st.offsideAnimStart = null;
  }, []);

  /* ── kick off movement animations ── */
  const startAnims = useCallback((i) => {
    const s = SCENARIOS[i];
    const st = stateRef.current;
    const now = performance.now();

    s.anim.forEach(step => {
      const pl = st.players[step.id];
      if (!pl) return;
      // final waypoint is the target
      const final = step.waypoints[step.waypoints.length - 1];
      pl.startX = pl.x; pl.startY = pl.y;
      pl.tx = final.x;  pl.ty = final.y;
      pl.animStart = now;
    });

    // offside line animation
    if (s.offsideAnim) {
      st.offsideY  = s.offsideAnim.fromY;
      st.offsideTY = s.offsideAnim.toY;
      st.offsideAnimStart = now;
    }
  }, []);

  /* ── main render loop ── */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const now = performance.now();
    const st = stateRef.current;
    const s = SCENARIOS[st.scenarioIdx];

    ctx.clearRect(0, 0, W, H);

    /* camera */
    const cam = st.cam;
    ctx.save();
    ctx.translate(W/2, H/2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x*W, -cam.y*H);

    /* pan interpolation */
    if (st.phase === "panning") {
      const t = easeInOut(Math.min((now - st.panStart) / 1600, 1));
      cam.x = s.panFrom.x + (s.panTo.x - s.panFrom.x) * t;
      cam.y = s.panFrom.y + (s.panTo.y - s.panFrom.y) * t;
      cam.zoom = 1.14 - t * 0.14;
    }

    /* player position tweening */
    Object.values(st.players).forEach(pl => {
      if (pl.animStart !== null) {
        const t = easeInOut(Math.min((now - pl.animStart) / ANIM_MS, 1));
        pl.x = pl.startX + (pl.tx - pl.startX) * t;
        pl.y = pl.startY + (pl.ty - pl.startY) * t;
      }
    });

    /* offside line tween */
    if (st.offsideAnimStart !== null && st.offsideY !== null) {
      const t = easeInOut(Math.min((now - st.offsideAnimStart) / ANIM_MS, 1));
      st.offsideY = st.offsideY + (st.offsideTY - st.offsideY) * (1-Math.pow(1-t,3));
    }

    drawPitch(ctx, W, H);
    if (st.offsideY !== null) drawOffsideLine(ctx, W, H, st.offsideY);

    /* draw arrows during deciding */
    if (st.phase === "deciding") {
      s.options.forEach(opt => {
        drawArrow(ctx, W, H, opt.arrow.path, OPT_COLORS[opt.key], true);
      });
    }

    /* draw player-models (opponents under teammates for depth) */
    const order = [...Object.values(st.players)].sort((a,b) => (a.kit==="opp"?0:1) - (b.kit==="opp"?0:1));
    order.forEach(pl => {
      drawPlayerFull(ctx, pl.x*W, pl.y*H, pl.kit, pl.label, pl.hasBall, pl.isYou);
    });

    ctx.restore();

    /* vignette */
    const grad = ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.7);
    grad.addColorStop(0,"transparent");
    grad.addColorStop(1,"rgba(0,0,0,0.4)");
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

    /* feedback dim */
    if (st.phase === "feedback") {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, W, H);
    }

    animRef.current = requestAnimationFrame(render);
  }, []);

  /* ── boot render loop ── */
  useEffect(() => {
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  /* ── scenario lifecycle ── */
  useEffect(() => {
    initScenario(idx);
    setPhase("panning");
    setFeedback(null);
    setTimer(0);

    // pan → animating
    const panTimer = setTimeout(() => {
      stateRef.current.phase = "animating";
      setPhase("animating");
      startAnims(idx);

      // animating → deciding
      const animTimer = setTimeout(() => {
        stateRef.current.phase = "deciding";
        stateRef.current.decidingStart = Date.now();
        setPhase("deciding");

        // decision countdown timer
        timerRef.current = setInterval(() => {
          setTimer(t => t + 1);
        }, 1000);
      }, ANIM_MS + 200);

      return () => clearTimeout(animTimer);
    }, 1700);

    return () => {
      clearTimeout(panTimer);
      clearInterval(timerRef.current);
    };
  }, [idx, initScenario, startAnims]);

  /* ── answer handler ── */
  const handlePick = useCallback((opt) => {
    if (stateRef.current.phase !== "deciding") return;
    clearInterval(timerRef.current);
    stateRef.current.phase = "feedback";
    setPhase("feedback");

    const ms = Date.now() - stateRef.current.decidingStart;
    const recommended = sc.options.find(o => o.recommended);
    const entry = {
      scenarioId: sc.id, scenarioTitle: sc.title,
      picked: opt.key, pickedLabel: opt.label,
      pickedReason: opt.reason,
      recommendedKey: recommended?.key,
      recommendedLabel: recommended?.label,
      matchesRecommended: recommended?.key === opt.key,
      ms,
    };
    const next = [...results, entry];
    setResults(next);
    setFeedback({ opt, entry, recommended });

    setTimeout(() => {
      if (idx + 1 < SCENARIOS.length) {
        setIdx(idx + 1);
      } else {
        const total = SCENARIOS.length;
        const avgTime = next.reduce((a,b)=>a+b.ms,0)/next.length;
        const matchesCoach = next.filter(d=>d.matchesRecommended).length;
        const avgClamped = Math.max(800, Math.min(3200, avgTime));
        const score = Math.round(100 - ((avgClamped-800)/2400)*50);
        onComplete?.({ score, total, avgTime, matchesCoach, decisions: next });
      }
    }, 2400);
  }, [idx, results, sc, onComplete]);

  const W = 680, H = 520;

  return (
    <div style={{ fontFamily:"'JetBrains Mono',monospace", background:"#050e08", borderRadius:8, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)" }}>

      {/* HUD */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 18px", background:"rgba(0,0,0,0.6)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:10, letterSpacing:"0.22em", color:"#dc1e28", textTransform:"uppercase" }}>Decision Drill</span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>SCENARIO {idx+1} / {SCENARIOS.length}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", display:"inline-block",
            background: phase==="animating"?"#dc1e28": phase==="deciding"?"#fff":"#2ead3c",
            animation: (phase==="animating"||phase==="deciding")?"pulse 1s infinite":"none"
          }}/>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.18em" }}>
            {phase==="panning"?"Camera panning…":phase==="animating"?"Play in motion…":phase==="deciding"?"Pick an arrow":"Feedback"}
          </span>
        </div>
        <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>{results.length} / {SCENARIOS.length} done</span>
      </div>

      {/* Docked instruction panel — kept off the play area during motion.
          Spatial arrow badges + paused-phase feedback modal stay inside
          the canvas wrapper (badges are gameplay, feedback is paused). */}
      {(() => {
        let panel = null;
        if (phase === "panning") {
          panel = (
            <div style={{ border:"1px solid rgba(255,255,255,0.14)", borderLeft:"3px solid #dc1e28", background:"rgba(0,0,0,0.82)", padding:"12px 16px", fontFamily:"'JetBrains Mono',monospace" }}>
              <p style={{ fontSize:9, letterSpacing:"0.25em", color:"#dc1e28", margin:"0 0 6px", textTransform:"uppercase" }}>Scenario {idx+1} · Camera sweeping</p>
              <p style={{ fontSize:18, fontWeight:900, color:"#fff", margin:"0 0 4px", textTransform:"uppercase" }}>{sc.title}</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,0.45)", margin:0 }}>{sc.subtitle}</p>
            </div>
          );
        } else if (phase === "deciding") {
          panel = (
            <div style={{ border:"1px solid rgba(255,255,255,0.12)", borderLeft:"3px solid #dc1e28", background:"rgba(0,0,0,0.82)", padding:"10px 16px", fontFamily:"'JetBrains Mono',monospace" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:9, letterSpacing:"0.22em", color:"#dc1e28", textTransform:"uppercase" }}>Question</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontVariantNumeric:"tabular-nums" }}>{timer}s</span>
              </div>
              <p style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0, textTransform:"uppercase", letterSpacing:"0.02em" }}>{sc.question}</p>
            </div>
          );
        }

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
              const col = OPT_COLORS[opt.key];
              return (
                <button key={opt.key} onClick={() => handlePick(opt)} style={{
                  position:"absolute",
                  left: opt.arrow.badge.x * 100 + "%",
                  top:  opt.arrow.badge.y * 100 + "%",
                  transform:"translate(-50%,-50%)",
                  display:"flex", alignItems:"stretch", gap:0,
                  border:`2px solid ${col}`, background:"rgba(0,0,0,0.92)",
                  borderRadius:0, overflow:"hidden", padding:0, cursor:"pointer",
                  fontFamily:"'JetBrains Mono',monospace",
                  transition:"box-shadow 0.15s",
                  boxShadow:`0 0 0 0 ${col}`,
                  animation:"badgePulse 1.8s infinite",
                }}>
                  <span style={{ background:col, color:opt.key==="B"?"#000":"#fff", fontWeight:900, fontSize:16, padding:"5px 10px" }}>{opt.key}</span>
                  <span style={{ color:"#fff", fontSize:12, fontWeight:700, padding:"5px 12px", textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{opt.short || opt.label}</span>
                </button>
              );
            })}

            {phase === "feedback" && feedback && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.84)", backdropFilter:"blur(8px)" }}>
                <div style={{
                  maxWidth:460, width:"90%",
                  border:"1px solid rgba(255,255,255,0.08)", background:"#080e0a", padding:"28px 32px",
                  borderLeft:`3px solid ${feedback.entry.matchesRecommended ? "#2ead3c" : "#dc1e28"}`,
                }}>
                  <p style={{ fontSize:9, letterSpacing:"0.25em", textTransform:"uppercase", margin:"0 0 10px",
                    color: feedback.entry.matchesRecommended ? "#2ead3c" : "#dc1e28" }}>
                    {feedback.entry.matchesRecommended ? "Coach's call ✓" : "Coach's note"}
                  </p>
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", margin:"0 0 8px", letterSpacing:"0.1em", textTransform:"uppercase" }}>
                    Your call · {feedback.opt.key} — {feedback.opt.label}
                  </p>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,0.85)", margin:"0 0 16px", lineHeight:1.65 }}>
                    {feedback.opt.reason}
                  </p>
                  {!feedback.entry.matchesRecommended && feedback.recommended && (
                    <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:14 }}>
                      <p style={{ fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:"0.18em", textTransform:"uppercase", margin:"0 0 6px" }}>
                        Preferred · {feedback.recommended.key} — {feedback.recommended.label}
                      </p>
                      <p style={{ fontSize:12, color:"rgba(255,255,255,0.55)", margin:0, lineHeight:1.6 }}>
                        {feedback.recommended.reason}
                      </p>
                    </div>
                  )}
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.2)", marginTop:16 }}>
                    {idx+1 < SCENARIOS.length ? "Next scenario loading…" : "Calculating score…"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

        return (
          <div style={{ padding:"10px 12px" }}>
            <GameStageLayout
              canvas={canvasWrapper}
              panel={panel}
              panelSide={sc.questionPosition === "bottom" ? "below" : "above"}
              panelWidth={240}
            />
          </div>
        );
      })()}

      {/* Footer */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"8px 18px", fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.18em", textTransform:"uppercase" }}>
        <span style={{ color:"#dc1e28" }}>●</span> {sc.subtitle}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes badgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)} 50%{box-shadow:0 0 8px 2px rgba(255,255,255,0.15)} }
      `}</style>
    </div>
  );
}