import { useState, useEffect, useRef, useMemo } from "react";

/* ─────────────────────────────────────────────
   GLOBAL STYLES (injected once into <head>)
───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap');
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

  .tiq-root { font-family: 'Barlow', sans-serif; width: 100%; max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem 2rem; box-sizing: border-box; }

  /* pitch */
  .tiq-pitch { border-radius: 12px; overflow: hidden; margin-bottom: 1rem; background: #1a5c2a; }
  .tiq-pitch svg { display: block; width: 100%; }
  .p-a { fill: #3b82f6; stroke: #fff; stroke-width: 1.5; }
  .p-b { fill: #ef4444; stroke: #fff; stroke-width: 1.5; }
  .p-gk { fill: #f97316; stroke: #fff; stroke-width: 1.5; }
  .tiq-ball { fill: #facc15; stroke: #92400e; stroke-width: 1; }
  .anim-dash { animation: tiq-dash 1.5s linear infinite; }

  @keyframes tiq-dash { to { stroke-dashoffset: -200; } }
  @keyframes tiq-sdot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }
  @keyframes tiq-press1a { 0%{cy:120} 50%{cy:155} 100%{cy:155} }
  @keyframes tiq-press1b { 0%{cx:380;cy:120} 50%{cx:330;cy:145} 100%{cx:330;cy:145} }
  @keyframes tiq-wing2   { 0%{cx:480;cy:160} 50%{cx:460;cy:80}  100%{cx:460;cy:80}  }
  @keyframes tiq-step4   { 0%{cy:140} 50%{cy:160} 100%{cy:160} }
  @keyframes tiq-gk5     { 0%{cx:80;cy:220} 50%{cx:130;cy:200} 100%{cx:130;cy:200} }
  @keyframes tiq-st6     { 0%{cx:480;cy:120} 50%{cx:560;cy:80} 100%{cx:560;cy:80} }
  @keyframes tiq-press7  { 0%{cx:280;cy:160} 50%{cx:320;cy:130} 100%{cx:320;cy:130} }
  @keyframes tiq-run8    { 0%{cx:380;cy:180} 50%{cx:380;cy:100} 100%{cx:380;cy:100} }
  @keyframes tiq-def9    { 0%{cy:80} 50%{cy:100} 100%{cy:100} }
  @keyframes tiq-run10   { 0%{cx:540;cy:180} 50%{cx:480;cy:120} 100%{cx:480;cy:120} }
  @keyframes tiq-wing11  { 0%{cx:260;cy:100} 50%{cx:180;cy:160} 100%{cx:180;cy:160} }
  @keyframes tiq-scan12  { 0%{transform:rotate(0deg)} 25%{transform:rotate(20deg)} 75%{transform:rotate(-20deg)} 100%{transform:rotate(0deg)} }
  @keyframes tiq-def13   { 0%{cy:130} 50%{cy:100} 100%{cy:100} }
  @keyframes tiq-ball14  { 0%{cx:160;cy:160} 40%{cx:260;cy:130} 70%{cx:400;cy:80} 100%{cx:400;cy:80} }
  @keyframes tiq-ball15  { 0%{cx:220;cy:200} 30%{cx:180;cy:160} 60%{cx:120;cy:180} 80%{cx:80;cy:160} 100%{cx:80;cy:160} }
  @keyframes tiq-ball4   { 0%{cx:200;cy:110} 50%{cx:340;cy:110} 100%{cx:340;cy:110} }
  @keyframes tiq-ball5   { 0%{cx:130;cy:80} 50%{cx:80;cy:110} 100%{cx:80;cy:110} }
  @keyframes tiq-ball6   { 0%{cx:160;cy:160} 60%{cx:480;cy:90} 100%{cx:480;cy:90} }
  @keyframes tiq-ball7   { 0%{cx:380;cy:140} 60%{cx:150;cy:80} 100%{cx:150;cy:80} }
  @keyframes tiq-ball8   { 0%{cx:220;cy:150} 40%{cx:310;cy:110} 80%{cx:380;cy:110} 100%{cx:380;cy:80} }

  /* legend */
  .tiq-legend { display: flex; align-items: center; gap: 12px; padding: .5rem .75rem; background: rgba(0,0,0,.25); border-top: 1px solid rgba(255,255,255,.08); flex-wrap: wrap; }
  .tiq-leg-item { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: rgba(255,255,255,.65); font-family: 'Barlow Condensed', sans-serif; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
  .tiq-leg-dot { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.6); flex-shrink: 0; }

  /* hud */
  .tiq-hud { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
  .tiq-progress-wrap { flex: 1; height: 4px; background: rgba(0,0,0,0.1); border-radius: 2px; overflow: hidden; }
  .tiq-progress-bar { height: 100%; background: #639922; border-radius: 2px; transition: width .4s ease; }
  .tiq-hud-chip { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: .04em; color: #555; }
  .tiq-timer-ring { position: relative; width: 40px; height: 40px; flex-shrink: 0; }
  .tiq-timer-ring svg { transform: rotate(-90deg); }
  .tiq-timer-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; }

  /* scenario hero */
  .tiq-scenario-hero { background: linear-gradient(180deg,#0a2e14,#0d3a1a); border-radius: 12px; padding: 1.25rem 1.25rem .9rem; position: relative; overflow: hidden; margin-bottom: 1rem; }
  .tiq-scenario-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); border-radius: 4px; padding: 3px 9px; font-size: 11px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.75); margin-bottom: .6rem; }
  .tiq-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; animation: tiq-sdot 1.5s ease-in-out infinite; }
  .tiq-scenario-title { font-family: 'Barlow Condensed', sans-serif; font-size: 21px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: .02em; line-height: 1.1; margin-bottom: .4rem; }
  .tiq-scenario-context { font-size: 12.5px; color: rgba(255,255,255,.6); line-height: 1.6; }

  /* question */
  .tiq-question-card { background: #fff; border: 0.5px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 1.1rem 1.2rem; margin-bottom: 1rem; }
  .tiq-question-label { font-size: 11px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #888; margin-bottom: .45rem; }
  .tiq-question-text { font-family: 'Barlow Condensed', sans-serif; font-size: 19px; font-weight: 700; line-height: 1.25; }

  /* options */
  .tiq-options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 1rem; }
  @media(max-width:480px){ .tiq-options-grid { grid-template-columns: 1fr; } }
  .tiq-opt { background: #fff; border: 0.5px solid rgba(0,0,0,0.18); border-radius: 8px; padding: .7rem .9rem; text-align: left; cursor: pointer; transition: all .15s ease; display: flex; align-items: flex-start; gap: 9px; font-family: 'Barlow', sans-serif; font-size: 13.5px; font-weight: 500; line-height: 1.4; min-height: 54px; width: 100%; }
  .tiq-opt:hover:not(:disabled) { border-color: #888; background: #f4f4f0; }
  .tiq-opt:disabled { cursor: default; }
  .tiq-opt.correct { background: #eaf3de; border-color: #639922; color: #27500a; }
  .tiq-opt.chosen  { background: #f4f4f0; border-color: rgba(0,0,0,0.18); color: #888; opacity: .6; }
  .tiq-opt.better  { background: #eaf3de; border-color: #639922; color: #27500a; }
  .tiq-opt-letter { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: #f4f4f0; border: 0.5px solid rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-family: 'Barlow Condensed', sans-serif; color: #555; margin-top: 1px; }
  .tiq-opt.correct .tiq-opt-letter { background: #639922; border-color: #639922; color: #fff; }
  .tiq-opt.chosen  .tiq-opt-letter { background: #aaa; border-color: #aaa; color: #fff; }
  .tiq-opt.better  .tiq-opt-letter { background: #639922; border-color: #639922; color: #fff; }
  .tiq-better-badge { font-size: 10px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; background: #639922; color: #fff; border-radius: 3px; padding: 2px 6px; margin-left: auto; flex-shrink: 0; align-self: center; white-space: nowrap; }

  /* feedback */
  .tiq-feedback { border-radius: 8px; padding: .8rem 1rem; font-size: 13.5px; font-weight: 500; display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; margin-bottom: 1rem; }
  .tiq-feedback.correct { background: #eaf3de; color: #27500a; border: .5px solid #97c459; }
  .tiq-feedback.better  { background: #f0f4ff; color: #1e3a8a; border: .5px solid #93c5fd; }
  .tiq-feedback i { font-size: 17px; flex-shrink: 0; margin-top: 1px; }

  /* primary button */
  .tiq-btn { width: 100%; padding: .85rem; background: #0d3a1a; color: #fff; border: none; border-radius: 8px; font-family: 'Barlow Condensed', sans-serif; font-size: 17px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: background .15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .tiq-btn:hover { background: #17532a; }

  /* start screen */
  .tiq-start-hero { background: linear-gradient(180deg,#0a2e14,#0d3a1a); border-radius: 12px; padding: 2rem 1.5rem; margin-bottom: 1.25rem; position: relative; overflow: hidden; text-align: center; }
  .tiq-start-emblem { width: 58px; height: 58px; border-radius: 50%; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
  .tiq-start-emblem i { font-size: 26px; color: #4ade80; }
  .tiq-start-title { font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: #fff; line-height: 1.05; margin-bottom: .5rem; }
  .tiq-start-sub { font-size: 13px; color: rgba(255,255,255,.55); line-height: 1.6; max-width: 320px; margin: 0 auto; }
  .tiq-info-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 1.25rem; }
  .tiq-info-card { background: #fff; border: .5px solid rgba(0,0,0,0.1); border-radius: 8px; padding: .85rem; text-align: center; }
  .tiq-info-card i { font-size: 19px; color: #555; margin-bottom: 5px; display: block; }
  .tiq-info-val { font-family: 'Barlow Condensed', sans-serif; font-size: 21px; font-weight: 700; display: block; }
  .tiq-info-desc { font-size: 11px; color: #888; margin-top: 1px; }

  /* results */
  .tiq-results { text-align: center; padding: .5rem 0; }
  .tiq-results-badge { display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 50%; background: #0a2e14; margin: 0 auto 1.1rem; }
  .tiq-results-badge i { font-size: 36px; color: #4ade80; }
  .tiq-results-score { font-family: 'Barlow Condensed', sans-serif; font-size: 58px; font-weight: 800; letter-spacing: -1px; line-height: 1; margin-bottom: .2rem; }
  .tiq-results-pct { font-size: 28px; font-weight: 500; color: #888; }
  .tiq-results-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .12em; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; margin-bottom: 1.4rem; }
  .tiq-results-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 1rem; }
  .tiq-results-stat { background: #f4f4f0; border-radius: 8px; padding: .85rem; }
  .tiq-results-stat-num { font-family: 'Barlow Condensed', sans-serif; font-size: 26px; font-weight: 800; }
  .tiq-results-stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .08em; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; margin-top: 2px; }
  .tiq-rating-bar { background: #f4f4f0; border-radius: 8px; padding: 1rem 1.1rem; margin-bottom: 1.25rem; text-align: left; }
  .tiq-rating-title { font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; margin-bottom: .3rem; }
  .tiq-rating-desc { font-size: 13px; color: #555; line-height: 1.6; }
`;

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const TOTAL = 5;
const MAX_TIME = 20;
const W = 580, H = 220;
const LC = "rgba(255,255,255,0.5)";
const LETTERS = ["A", "B", "C", "D"];

/* ─────────────────────────────────────────────
   PITCH SVG HELPERS  (return JSX)
───────────────────────────────────────────── */
function mkArrow(x1, y1, x2, y2, col) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const ex = x2 - ux * 10, ey = y2 - uy * 10;
  const ax = uy * 5, ay = -ux * 5;
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="1.8" strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${ex + ax},${ey + ay} ${ex - ax},${ey - ay}`} fill={col} />
    </>
  );
}

function DashLine({ x1, y1, x2, y2, col, anim }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="1.8" strokeDasharray="6 4" strokeLinecap="round" className={anim ? "anim-dash" : ""} fill="none" />;
}

function Lbl({ x, y, text, col = "rgba(255,255,255,0.85)" }) {
  return <text x={x} y={y} fontSize="10" fill={col} fontFamily="Barlow Condensed,sans-serif" fontWeight="700" textAnchor="middle">{text}</text>;
}

function Pl({ cx, cy, cls, label, style }) {
  return (
    <>
      <circle className={cls} cx={cx} cy={cy} r="7" style={style} />
      {label && <text x={cx} y={cy + 18} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.85)" fontFamily="Barlow Condensed,sans-serif" fontWeight="600">{label}</text>}
    </>
  );
}

function PitchBase({ children, legend }) {
  return (
    <div className="tiq-pitch">
      <svg viewBox={`0 0 ${W} ${H}`} aria-label="Tactical pitch diagram">
        {/* green surface */}
        <rect width={W} height={H} fill="#1a5c2a" />
        {/* markings */}
        <rect x="2" y="2" width={W - 4} height={H - 4} fill="none" stroke={LC} strokeWidth="1" />
        <line x1={W / 2} y1="2" x2={W / 2} y2={H - 2} stroke={LC} strokeWidth="1" />
        <circle cx={W / 2} cy={H / 2} r="30" fill="none" stroke={LC} strokeWidth="1" />
        <circle cx={W / 2} cy={H / 2} r="2" fill={LC} />
        {/* left box */}
        <rect x="2" y={H / 2 - 46} width="72" height="92" fill="none" stroke={LC} strokeWidth="1" />
        <rect x="2" y={H / 2 - 24} width="28" height="48" fill="none" stroke={LC} strokeWidth="1" />
        {/* right box */}
        <rect x={W - 74} y={H / 2 - 46} width="72" height="92" fill="none" stroke={LC} strokeWidth="1" />
        <rect x={W - 30} y={H / 2 - 24} width="28" height="48" fill="none" stroke={LC} strokeWidth="1" />
        {/* goals */}
        <rect x="0" y={H / 2 - 14} width="4" height="28" fill="none" stroke="white" strokeWidth="1.5" />
        <rect x={W - 4} y={H / 2 - 14} width="4" height="28" fill="none" stroke="white" strokeWidth="1.5" />
        {children}
      </svg>
      {legend && (
        <div className="tiq-legend">
          {legend.map((l, i) => (
            <div key={i} className="tiq-leg-item">
              <div className="tiq-leg-dot" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
          <div className="tiq-leg-item" style={{ gap: 8 }}>
            <svg width="26" height="10"><line x1="0" y1="5" x2="26" y2="5" stroke="#facc15" strokeWidth="2" strokeDasharray="5 3" /></svg>
            Pass / movement
          </div>
          <div className="tiq-leg-item" style={{ gap: 8 }}>
            <svg width="26" height="10"><line x1="0" y1="5" x2="26" y2="5" stroke="#ef4444" strokeWidth="1.8" strokeDasharray="4 3" /></svg>
            Press
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   15 UNIQUE PITCH ANIMATIONS
───────────────────────────────────────────── */
const PITCH_ANIMS = [
  // 1 — High press trigger
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Opposition" }, { color: "#f97316", label: "Goalkeeper" }]}>
      <Pl cx={30} cy={110} cls="p-gk" label="GK" />
      <Pl cx={90} cy={80} cls="p-b" label="CB" />
      <Pl cx={90} cy={140} cls="p-b" label="CB" style={{ animation: "tiq-press1a 2s ease-in-out infinite alternate" }} />
      <Pl cx={210} cy={110} cls="p-a" label="ST" style={{ animation: "tiq-press1b 2s ease-in-out infinite alternate" }} />
      <Pl cx={260} cy={60} cls="p-a" label="LW" />
      <Pl cx={260} cy={160} cls="p-a" label="RW" />
      <DashLine x1={30} y1={110} x2={90} y2={140} col="#facc15" anim />
      {mkArrow(210, 110, 110, 140, "#ef4444")}
      <DashLine x1={260} y1={60} x2={200} y2={100} col="#ef4444" anim />
      <DashLine x1={260} y1={160} x2={200} y2={130} col="#ef4444" anim />
      <circle className="tiq-ball" cx="90" cy="140" r="5" />
      <Lbl x={300} y={20} text="Press triggered: CB receives from GK" col="#facc15" />
      <Lbl x={300} y={35} text="Striker presses, wingers block central lanes" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 2 — Wide positioning
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Opposition" }]}>
      <Pl cx={440} cy={60} cls="p-b" label="FB" /><Pl cx={440} cy={100} cls="p-b" label="CB" />
      <Pl cx={440} cy={140} cls="p-b" label="CB" /><Pl cx={440} cy={175} cls="p-b" label="FB" />
      <Pl cx={310} cy={110} cls="p-a" label="CM" />
      <Pl cx={370} cy={80} cls="p-a" label="RW" />
      <Pl cx={480} cy={175} cls="p-a" label="LW" style={{ animation: "tiq-wing2 2.2s ease-in-out infinite alternate" }} />
      <circle className="tiq-ball" cx="370" cy="80" r="5" />
      <DashLine x1={370} y1={80} x2={310} y2={110} col="rgba(255,255,255,0.5)" />
      {mkArrow(490, 175, 550, 175, "rgba(255,255,255,0.8)")}
      <Lbl x={530} y={165} text="Stay wide" />
      <Lbl x={300} y={20} text="Far-side winger: stay wide to stretch defensive shape" col="#facc15" />
      <Lbl x={300} y={35} text="Pins the far FB — creates space centrally" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 3 — Mid-block
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team (mid-block)" }, { color: "#ef4444", label: "Opposition" }]}>
      <Pl cx={270} cy={60} cls="p-a" /><Pl cx={330} cy={60} cls="p-a" /><Pl cx={390} cy={60} cls="p-a" /><Pl cx={450} cy={60} cls="p-a" />
      <Pl cx={300} cy={105} cls="p-a" /><Pl cx={400} cy={105} cls="p-a" />
      <Pl cx={260} cy={145} cls="p-a" /><Pl cx={350} cy={145} cls="p-a" /><Pl cx={440} cy={145} cls="p-a" />
      <Pl cx={350} cy={180} cls="p-a" />
      <Pl cx={110} cy={60} cls="p-b" /><Pl cx={160} cy={100} cls="p-b" /><Pl cx={110} cy={140} cls="p-b" /><Pl cx={160} cy={60} cls="p-b" />
      <circle className="tiq-ball" cx="160" cy="100" r="5" />
      <DashLine x1={300} y1={105} x2={350} y2={145} col="rgba(255,255,255,0.3)" />
      <DashLine x1={400} y1={105} x2={350} y2={145} col="rgba(255,255,255,0.3)" />
      <rect x="255" y="95" width="185" height="60" fill="rgba(250,204,21,0.08)" rx="4" />
      <Lbl x={350} y={20} text="Mid-block: protect central lanes first" col="#facc15" />
      <Lbl x={350} y={35} text="Compact shape — no gaps between lines" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 4 — 4-4-2 gap
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team (4-4-2)" }, { color: "#ef4444", label: "Opposition No.10" }]}>
      <Pl cx={380} cy={50} cls="p-a" /><Pl cx={420} cy={80} cls="p-a" /><Pl cx={420} cy={140} cls="p-a" /><Pl cx={380} cy={170} cls="p-a" />
      <Pl cx={280} cy={50} cls="p-a" /><Pl cx={310} cy={85} cls="p-a" /><Pl cx={310} cy={135} cls="p-a" /><Pl cx={280} cy={170} cls="p-a" />
      <Pl cx={200} cy={95} cls="p-a" /><Pl cx={200} cy={125} cls="p-a" />
      <Pl cx={350} cy={110} cls="p-b" label="10" style={{ animation: "tiq-step4 2s ease-in-out infinite alternate" }} />
      <circle className="tiq-ball" cx="200" cy="110" r="5" style={{ animation: "tiq-ball4 2.5s ease-in-out infinite alternate" }} />
      <rect x="290" y="90" width="110" height="40" fill="rgba(250,204,21,0.12)" stroke="rgba(250,204,21,0.4)" strokeWidth="1" rx="4" />
      <Lbl x={344} y={113} text="GAP" col="rgba(250,204,21,0.9)" />
      <DashLine x1={200} y1={110} x2={340} y2={110} col="#facc15" anim />
      <Lbl x={290} y={20} text="4-4-2 vulnerability: the gap between lines" col="#facc15" />
      <Lbl x={290} y={35} text="No.10 drops here — faces goal with time and space" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 5 — GK sweeper keeper
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Opposition press" }, { color: "#f97316", label: "Goalkeeper (key option)" }]}>
      <Pl cx={130} cy={80} cls="p-a" label="CB" /><Pl cx={130} cy={140} cls="p-a" label="CB" />
      <Pl cx={190} cy={80} cls="p-b" label="ST" /><Pl cx={190} cy={140} cls="p-b" label="ST" />
      <Pl cx={80} cy={110} cls="p-gk" label="GK" style={{ animation: "tiq-gk5 2.2s ease-in-out infinite alternate" }} />
      <Pl cx={220} cy={30} cls="p-a" label="FB" /><Pl cx={220} cy={190} cls="p-a" label="FB" />
      {mkArrow(190, 80, 140, 85, "#ef4444")}{mkArrow(190, 140, 140, 135, "#ef4444")}
      <DashLine x1={130} y1={90} x2={100} y2={105} col="#facc15" anim />
      <DashLine x1={80} y1={110} x2={220} y2={30} col="rgba(255,255,255,0.4)" anim />
      <circle className="tiq-ball" cx="130" cy="80" r="5" style={{ animation: "tiq-ball5 2.5s ease-in-out infinite alternate" }} />
      <Lbl x={300} y={20} text="GK as sweeper-keeper — 3rd man in build-up" col="#facc15" />
      <Lbl x={300} y={35} text="Back pass to GK beats the 2-striker press instantly" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 6 — Counter attack
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Opposition (disorganised)" }]}>
      <Pl cx={200} cy={40} cls="p-b" /><Pl cx={240} cy={55} cls="p-b" /><Pl cx={280} cy={40} cls="p-b" />
      <Pl cx={220} cy={75} cls="p-b" /><Pl cx={260} cy={75} cls="p-b" /><Pl cx={300} cy={75} cls="p-b" />
      <Pl cx={160} cy={160} cls="p-a" label="CM" />
      <Pl cx={480} cy={120} cls="p-a" label="ST" style={{ animation: "tiq-st6 2s ease-in-out infinite alternate" }} />
      <Pl cx={430} cy={100} cls="p-b" label="DEF" />
      <DashLine x1={160} y1={160} x2={520} y2={80} col="#facc15" anim />
      {mkArrow(480, 120, 555, 80, "rgba(255,255,255,0.8)")}
      <circle className="tiq-ball" cx="160" cy="160" r="5" style={{ animation: "tiq-ball6 2.5s ease-in-out infinite alternate" }} />
      <Lbl x={300} y={20} text="Counter attack: play immediately into space behind" col="#facc15" />
      <Lbl x={300} y={35} text="Striker run is live — any delay lets defenders recover" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 7 — Gegenpress
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Opposition" }]}>
      <Pl cx={200} cy={80} cls="p-a" /><Pl cx={250} cy={120} cls="p-a" /><Pl cx={300} cy={160} cls="p-a" />
      <Pl cx={320} cy={130} cls="p-b" label="×" />
      <Pl cx={380} cy={70} cls="p-b" /><Pl cx={420} cy={110} cls="p-b" /><Pl cx={460} cy={150} cls="p-b" />
      <Pl cx={280} cy={100} cls="p-a" label="→" style={{ animation: "tiq-press7 2s ease-in-out infinite alternate" }} />
      {mkArrow(290, 110, 330, 130, "#ef4444")}
      <DashLine x1={380} y1={70} x2={320} y2={130} col="#facc15" anim />
      <circle className="tiq-ball" cx="320" cy="130" r="5" style={{ animation: "tiq-ball7 2s ease-in-out infinite alternate" }} />
      <Lbl x={300} y={20} text="Gegenpress: nearest player must press immediately" col="#facc15" />
      <Lbl x={300} y={35} text="5-second window — pressure buys recovery time" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 8 — Third man run
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Defensive line" }]}>
      <Pl cx={220} cy={150} cls="p-a" label="A" />
      <Pl cx={310} cy={110} cls="p-a" label="B" />
      <Pl cx={380} cy={175} cls="p-a" label="C" style={{ animation: "tiq-run8 2s ease-in-out infinite alternate" }} />
      <Pl cx={390} cy={90} cls="p-b" /><Pl cx={430} cy={120} cls="p-b" /><Pl cx={350} cy={60} cls="p-b" />
      <DashLine x1={220} y1={150} x2={310} y2={110} col="#facc15" anim />
      <DashLine x1={310} y1={110} x2={220} y2={150} col="rgba(255,255,255,0.4)" />
      {mkArrow(380, 175, 380, 100, "rgba(255,255,255,0.85)")}
      <circle className="tiq-ball" cx="220" cy="150" r="5" style={{ animation: "tiq-ball8 2.5s ease-in-out infinite alternate" }} />
      <Lbl x={300} y={20} text="Third man run: arrive beyond the defensive line" col="#facc15" />
      <Lbl x={300} y={35} text="Defenders watch the ball — runner arrives unmarked" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 9 — Corner zonal
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team (zonal)" }, { color: "#ef4444", label: "Opposition corners" }]}>
      <rect x="2" y={H / 2 - 24} width="28" height="48" fill="rgba(255,255,255,0.05)" />
      <Pl cx={2} cy={10} cls="p-b" label="CT" />
      <Pl cx={60} cy={100} cls="p-a" label="Z1" /><Pl cx={90} cy={70} cls="p-a" label="Z2" />
      <Pl cx={100} cy={140} cls="p-a" label="Z3" />
      <Pl cx={130} cy={110} cls="p-a" label="Z4" style={{ animation: "tiq-def9 2s ease-in-out infinite alternate" }} />
      <Pl cx={75} cy={115} cls="p-b" /><Pl cx={110} cy={85} cls="p-b" />
      <Pl cx={130} cy={150} cls="p-b" label="RUN" />
      <DashLine x1={2} y1={10} x2={130} y2={110} col="#facc15" anim />
      {mkArrow(130, 110, 130, 85, "rgba(255,255,255,0.9)")}
      <Lbl x={300} y={20} text="Zonal defending: back post defender attacks the ball" col="#facc15" />
      <Lbl x={300} y={35} text="Do not hold zone statically — claim and clear far post" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 10 — Back post runner
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Opposition" }, { color: "#f97316", label: "Goalkeeper (off line)" }]}>
      <Pl cx={30} cy={110} cls="p-gk" label="GK" />
      <Pl cx={70} cy={80} cls="p-a" label="NP" />
      <Pl cx={540} cy={180} cls="p-a" label="BP" style={{ animation: "tiq-run10 2.2s ease-in-out infinite alternate" }} />
      <Pl cx={470} cy={120} cls="p-b" label="DEF" />
      <Pl cx={560} cy={30} cls="p-a" label="CR" />
      <DashLine x1={560} y1={30} x2={480} y2={110} col="#facc15" anim />
      {mkArrow(480, 120, 30, 70, "rgba(255,255,255,0.85)")}
      <Lbl x={180} y={55} text="Far post shot" col="rgba(255,255,255,0.8)" />
      <Lbl x={300} y={20} text="Back post runner: arrive at pace, shoot far post first-time" col="#facc15" />
      <Lbl x={300} y={35} text="GK off line — commit fully, cross quality decides the outcome" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 11 — Pressing trap
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team pressing" }, { color: "#ef4444", label: "Opposition trapped" }]}>
      <Pl cx={260} cy={170} cls="p-a" label="ST" />
      <Pl cx={200} cy={130} cls="p-a" label="RW" style={{ animation: "tiq-wing11 2s ease-in-out infinite alternate" }} />
      <Pl cx={300} cy={120} cls="p-a" label="CM" />
      <Pl cx={130} cy={170} cls="p-b" label="CB" />
      <Pl cx={110} cy={200} cls="p-b" label="FB" />
      <line x1="2" y1="215" x2={W - 2} y2="215" stroke="white" strokeWidth="2" />
      {mkArrow(200, 130, 130, 185, "#ef4444")}
      {mkArrow(260, 170, 140, 175, "#ef4444")}
      <DashLine x1={300} y1={120} x2={220} y2={145} col="#ef4444" anim />
      <circle className="tiq-ball" cx="110" cy="200" r="5" />
      <Lbl x={350} y={25} text="Pressing trap: 3-player mechanism on the wide channel" col="#facc15" />
      <Lbl x={350} y={40} text="Winger closes, striker covers CB, CM blocks inside lane" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 12 — Pre-scan
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Pressers" }]}>
      <g style={{ transformOrigin: "280px 150px", animation: "tiq-scan12 2.5s ease-in-out infinite" }}>
        <circle className="p-a" cx="280" cy="150" r="7" />
        <path d="M 280 150 L 310 130 A 35 35 0 0 1 310 170 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      </g>
      <Pl cx={200} cy={150} cls="p-a" label="P" />
      <Pl cx={340} cy={130} cls="p-b" /><Pl cx={360} cy={160} cls="p-b" />
      <Pl cx={300} cy={90} cls="p-a" label="FREE" />
      <DashLine x1={200} y1={150} x2={280} y2={150} col="#facc15" anim />
      <DashLine x1={280} y1={150} x2={310} y2={120} col="rgba(255,255,255,0.35)" />
      <DashLine x1={280} y1={150} x2={310} y2={175} col="rgba(255,255,255,0.35)" />
      <Lbl x={300} y={20} text="Pre-scan before receiving: know your picture early" col="#facc15" />
      <Lbl x={300} y={35} text="Shoulder check 1-2x before ball arrives — faster decision" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 13 — Offside trap
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your defensive line" }, { color: "#ef4444", label: "Opposition" }]}>
      <Pl cx={380} cy={50} cls="p-a" label="FB" />
      <Pl cx={400} cy={90} cls="p-a" label="CB" style={{ animation: "tiq-def13 2s ease-in-out infinite alternate" }} />
      <Pl cx={400} cy={130} cls="p-a" label="CB" style={{ animation: "tiq-def13 2s ease-in-out infinite alternate" }} />
      <Pl cx={380} cy={170} cls="p-a" label="FB" />
      <Pl cx={340} cy={110} cls="p-b" label="ST" />
      <Pl cx={180} cy={110} cls="p-b" label="CB" />
      <DashLine x1={180} y1={110} x2={440} y2={80} col="#facc15" anim />
      {mkArrow(400, 110, 470, 110, "rgba(255,255,255,0.9)")}
      <Lbl x={510} y={110} text="Step!" />
      <line x1="400" y1="20" x2="400" y2={H - 10} stroke="rgba(250,204,21,0.4)" strokeWidth="1" strokeDasharray="4 3" />
      <Lbl x={425} y={30} text="Offside line" col="rgba(250,204,21,0.7)" />
      <Lbl x={290} y={18} text="Offside trap: step at the moment of the pass — not before" col="#facc15" />
      <Lbl x={290} y={33} text="Read the CB kicking motion as your trigger" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 14 — Switch of play
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Opposition (overcommitted)" }]}>
      <Pl cx={160} cy={160} cls="p-a" /><Pl cx={190} cy={175} cls="p-a" /><Pl cx={220} cy={155} cls="p-a" />
      <Pl cx={230} cy={155} cls="p-b" /><Pl cx={250} cy={175} cls="p-b" /><Pl cx={270} cy={155} cls="p-b" /><Pl cx={250} cy={130} cls="p-b" />
      <Pl cx={300} cy={130} cls="p-a" label="DM" />
      <Pl cx={490} cy={80} cls="p-a" label="RB" />
      <rect x="130" y="130" width="150" height="60" fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.2)" strokeWidth="1" rx="4" />
      <Lbl x={205} y={195} text="Overloaded" col="rgba(239,68,68,0.7)" />
      <circle className="tiq-ball" cx="160" cy="160" r="5" style={{ animation: "tiq-ball14 2.8s ease-in-out infinite alternate" }} />
      <DashLine x1={160} y1={160} x2={300} y2={130} col="rgba(255,255,255,0.5)" />
      <DashLine x1={300} y1={130} x2={490} y2={80} col="#facc15" anim />
      <Lbl x={490} y={68} text="FREE" />
      <Lbl x={300} y={20} text="Switch when opposition fully commits — max space far side" col="#facc15" />
      <Lbl x={300} y={35} text="Play through DM to keep possession secure during switch" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
  // 15 — Game management
  () => (
    <PitchBase legend={[{ color: "#3b82f6", label: "Your team" }, { color: "#ef4444", label: "Opposition chasing" }, { color: "#f97316", label: "Goalkeeper (safe outlet)" }]}>
      <Pl cx={60} cy={110} cls="p-gk" label="GK" />
      <Pl cx={160} cy={70} cls="p-a" label="CB" /><Pl cx={160} cy={150} cls="p-a" label="CB" />
      <Pl cx={130} cy={40} cls="p-a" label="FB" /><Pl cx={130} cy={180} cls="p-a" label="FB" />
      <Pl cx={220} cy={200} cls="p-a" label="CM" />
      <circle className="tiq-ball" cx="220" cy="200" r="5" style={{ animation: "tiq-ball15 3s ease-in-out infinite alternate" }} />
      <Pl cx={310} cy={80} cls="p-b" /><Pl cx={350} cy={120} cls="p-b" /><Pl cx={370} cy={60} cls="p-b" />
      <Pl cx={290} cy={160} cls="p-b" label="FB" /><Pl cx={300} cy={110} cls="p-b" label="FB" />
      <Pl cx={480} cy={110} cls="p-a" label="ST" />
      <DashLine x1={220} y1={200} x2={160} y2={150} col="rgba(255,255,255,0.5)" />
      <DashLine x1={160} y1={150} x2={60} y2={110} col="rgba(255,255,255,0.5)" />
      <DashLine x1={60} y1={110} x2={160} y2={70} col="rgba(255,255,255,0.5)" />
      <Lbl x={300} y={20} text="Game management: use possession to run down the clock" col="#facc15" />
      <Lbl x={300} y={35} text="Recycle through team and GK — force opposition to chase" col="rgba(255,255,255,0.7)" />
    </PitchBase>
  ),
];

/* ─────────────────────────────────────────────
   QUESTION BANK
───────────────────────────────────────────── */
const QUESTION_BANK = [
  { id: 1, phase: "Out of Possession", formation: "4-3-3", scenario: "High Press Trigger", context: "Your team is in a 4-3-3 pressing from the front. The opposition centre-back has just received the ball from the goalkeeper with their back to goal under no immediate pressure.", question: "What is the correct pressing trigger in this moment?", options: ["Ball played to the fullback — press immediately to force backward pass", "Wait until the CB turns and drives forward before applying pressure", "Drop into a mid-block and invite the opposition to play through midfield", "Striker presses the CB while wingers tuck inside to block central passes"], correct: 3, explanation: "Pressing the CB alone achieves nothing — the striker must show the press while wingers close central passing lanes simultaneously, trapping the CB with no safe outlet." },
  { id: 2, phase: "Attacking", formation: "4-3-3", scenario: "Wide Attacking Positioning", context: "Your team wins the ball back in midfield. The right winger is on the ball and the opposition fullback is closing at pace. The near-side central midfielder is free in the half-space.", question: "Where should the left winger position themselves in this moment?", options: ["Drift centrally to create an overload in the half-space near the ball", "Stay wide on the far side to stretch the defensive shape", "Drop into midfield to offer a recycle option to the holding midfielder", "Overlap the right winger to create a 2v1 on that side"], correct: 1, explanation: "Width is the left winger's primary job in transition. Staying wide pins the opposition fullback, prevents the defence from compacting, and creates space for the ball carrier and half-space runner." },
  { id: 3, phase: "Defending", formation: "4-2-3-1", scenario: "Mid-Block Shape", context: "Your team is sitting in an organised mid-block at 1-0 up with 20 minutes to go. The opposition is recycling possession looking to play through your shape.", question: "What is the primary defensive priority in this structure?", options: ["Step and press the ball aggressively to force mistakes", "Protect the central lanes and deny penetrating passes in behind the lines", "Push fullbacks high to prevent wide combinations", "Man-mark the opposition striker tightly to restrict hold-up play"], correct: 1, explanation: "In a mid-block the first priority is always to protect central zones. Conceding to the outside is acceptable — a well-organised block forces wide and waits for a mistake, never pressing recklessly." },
  { id: 4, phase: "Defending", formation: "4-4-2", scenario: "Compactness & The 10 Space", context: "The opposition are recycling the ball across the back four. Your 4-4-2 is in shape 25 metres from goal. The ball is played to the right centre-back who has time on the ball.", question: "What is the main structural vulnerability of a flat 4-4-2 block in this situation?", options: ["The space between the defensive and midfield lines — the '10 space'", "The goalkeeper being caught off their line", "Too many bodies in central areas causing congestion", "The striker pairing being too far forward to help defensively"], correct: 0, explanation: "The gap between the two lines is the 4-4-2's biggest weakness. A technically gifted number 10 receiving in that space, facing goal with time, can unlock the entire block." },
  { id: 5, phase: "Possession", formation: "Build-up Phase", scenario: "Beating the Press — GK as Sweeper-Keeper", context: "You are building from the back. The opposition's two strikers are pressing your centre-backs. Your goalkeeper is 8 metres behind the ball unmarked. Both fullbacks are pushed high.", question: "What is the most effective way to break the two-striker press in this moment?", options: ["Play long immediately to relieve pressure", "Pass back to the goalkeeper to use them as an extra outfield player and shift the angle", "Force a pass through the press into the feet of the holding midfielder", "Dribble forward into the press to draw a foul"], correct: 1, explanation: "The goalkeeper as a third centre-back is the modern solution to two-striker presses. The GK receives, shifts the ball wide, and instantly makes the press redundant by changing the angle." },
  { id: 6, phase: "Attacking Transition", formation: "Counter Attack", scenario: "Exploiting Space in Behind", context: "You have just won the ball back in your own half. The opposition are disorganised with 6 players caught ahead of the ball. Your striker is making a run in behind the last defender.", question: "As the player in possession in your own half, what is the correct first action?", options: ["Drive forward with the ball to advance the attack yourself", "Recycle possession sideways to buy time and let runners re-set", "Play the ball immediately in behind the defensive line for the striker's run", "Look to combine short with the nearest midfielder before switching"], correct: 2, explanation: "Transition moments are time-sensitive. Any delay allows defenders to recover. The first pass must exploit the space in behind immediately while the striker's run is live." },
  { id: 7, phase: "Defending", formation: "Counter Press", scenario: "Gegenpressing After Losing Possession", context: "Your team has just lost the ball in the opposition's half. Three opposition players are now in space. Your nearest player to the ball is 3 metres away.", question: "What is the correct immediate action from the player closest to the ball?", options: ["Sprint back to re-organise into a defensive shape immediately", "Apply immediate pressure on the ball carrier to delay the attack", "Track the nearest opposition runner and stay goal-side", "Signal to team-mates to drop into a low block"], correct: 1, explanation: "The 5-second counter-press rule: the player nearest the ball must apply immediate pressure to slow the attack. Sprinting away from the ball before pressure is applied gives the opposition an uncontested transition." },
  { id: 8, phase: "Possession", formation: "Positional Play", scenario: "Creating Overloads — The 3rd Man Run", context: "Your team is working the ball through midfield. Player A passes to Player B in the half-space. Player B plays back to Player A. A third midfielder is making a late run beyond Player B.", question: "What is the purpose of the third man's run in this combination?", options: ["To create a numerical overload in midfield and recycle possession", "To arrive beyond the second line of pressure in the moment defenders focus on the ball exchange", "To offer an emergency pass option if Player A is pressed", "To draw opposition players wide and free up central space"], correct: 1, explanation: "The third man run is a fundamental concept in positional play — the runner moves when defenders focus on the ball. By the time the ball is ready to be played forward the runner is beyond the line, impossible to track." },
  { id: 9, phase: "Set Piece — Defending", formation: "Corner Defence", scenario: "Defending Corners — Zonal Marking", context: "Your team defends corners with a zonal marking system. An opposition player has peeled to the back post unmarked. Your defenders are holding their zones.", question: "What is the defensive responsibility of the back post zonal defender?", options: ["Hold the zone rigidly and wait for the ball to enter the zone before reacting", "Man-mark the runner peeling to the back post, leaving the zone", "Step to intercept the low cutback pass from the corner taker", "Attack the flight of the ball and clear beyond the far post"], correct: 3, explanation: "In a zonal system, the back post defender's job is to attack the ball — not guard a static space. Standing and waiting invites a header or flick-on at close range. Claim it aggressively and clear far post." },
  { id: 10, phase: "Attacking", formation: "Final Third", scenario: "Decision Making in the Box", context: "A cross is delivered from wide right. You are arriving at the back post at pace. A team-mate is at the near post. The goalkeeper is off their line. One defender is between you and goal.", question: "As the back post runner, what is the best decision?", options: ["Arrive at full pace and shoot first-time if the ball reaches you, aiming far post", "Check your run to keep the ball in play if the cross is over-hit", "Call for the cutback — shield from the near post team-mate to pull the defender", "Pull away toward the penalty spot to create space for the near post attacker"], correct: 0, explanation: "Arriving at pace and attacking the ball first-time far post exploits the goalkeeper being caught in no man's land. Checking the run collapses the timing. The back post runner must commit fully." },
  { id: 11, phase: "Pressing", formation: "4-3-3", scenario: "Pressing Trap — Wide Channel", context: "Your high press has forced the opposition to play the ball to their left fullback. The fullback has received with their back to goal near the touchline. Your right winger is closing.", question: "What is the team's collective job at this moment to maximise the pressing trap?", options: ["The striker drops to block the backward pass, the winger presses, midfielders hold shape", "The right winger presses, the striker covers the near CB, and the right CM covers the inside passing lane", "All three forwards press simultaneously to overwhelm the fullback", "Drop into a mid-block — the press has done its job getting the ball wide"], correct: 1, explanation: "A pressing trap is a 3-player mechanism: winger closes to remove time, striker covers the back-pass to near CB, CM cuts off the inside lane. The fullback has no safe outlet — forced into a mistake or risky long ball." },
  { id: 12, phase: "Possession", formation: "Receiving", scenario: "Pre-Scanning Before Receiving", context: "A midfielder is about to receive a pass under pressure. Before the ball arrives, they take no visual check of their surroundings. After controlling, they are immediately closed and lose possession.", question: "What is the key technical habit that would have changed the outcome?", options: ["Receiving with a heavier first touch to buy distance from the presser", "Checking your shoulder 1–2 times before the ball arrives to know what's behind you and plan the next pass", "Always moving toward the ball to arrive on the half-turn", "Calling for the ball louder so the passer knows to play it into feet"], correct: 1, explanation: "Pre-scanning (shoulder checks before receiving) is one of the most studied habits in elite football. It creates a mental picture before the first touch, allowing faster decision-making under pressure." },
  { id: 13, phase: "Defending", formation: "High Line", scenario: "Offside Trap Timing", context: "Your team plays a high defensive line. The opposition striker is making a diagonal run from the left channel. The opposition CB is about to play the ball. Your defensive line must decide when to step.", question: "When is the correct moment for the defensive line to step up and spring the offside trap?", options: ["As soon as the striker begins their run — cut it off early", "The moment the opposition CB begins their kicking motion to play the ball", "When the ball is clearly going to go over the top — react to the ball's trajectory", "Hold shape and only step when the striker is clearly beyond the last defender"], correct: 1, explanation: "The offside trap is triggered at the moment of the pass. Stepping too early means the striker is onside. Stepping too late allows them through. Reading the passer's kicking motion is the key timing cue." },
  { id: 14, phase: "Attacking", formation: "Switch of Play", scenario: "When to Switch — Identifying Overloads", context: "Your team has created a 3v2 overload on the left side. The opposition are compacting, pulling four players across. Your right back is unmarked with acres of space on the far side.", question: "What is the trigger moment to switch the play?", options: ["Immediately — switch as soon as the overload is created on the left", "When the opposition has fully committed four players across and far side space is at maximum — switch through the holding midfielder", "Play through the overload on the left first to test the defence before switching", "Switch only when a player makes a specific run on the far side to signal they're ready"], correct: 1, explanation: "The switch becomes most dangerous when the opposition is fully committed. Switching too early allows recovery. Play through the DM to keep possession secure during the switch." },
  { id: 15, phase: "Game Management", formation: "Closing Out a Result", scenario: "Protecting a 1-0 Lead — Final 10 Minutes", context: "Your team leads 1-0 with 10 minutes left. The opposition has pushed their fullbacks forward and is throwing numbers at you. You have just won possession in your own defensive third.", question: "What is the most tactically intelligent decision from the player in possession?", options: ["Play direct to the striker immediately to relieve pressure and try to score a second", "Clear the ball long — remove the danger first regardless of possession", "Carry the ball forward and invite pressure to win a free-kick", "Recycle possession calmly through the team, use the goalkeeper as an option, and run down the clock"], correct: 3, explanation: "In game management, possession is the weapon. Recycling through the team — including the GK — forces the opposition to chase, expends energy, and uses the clock. Panic clears gift possession back." },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function getRating(pct) {
  if (pct === 100) return { title: "Elite Tactical IQ", desc: "Exceptional reading of the game. You understand football at the highest level — every decision was correct.", color: "#639922" };
  if (pct >= 80) return { title: "Advanced Analyst", desc: "Strong tactical awareness across all phases. A few moments to sharpen but your understanding is well above average.", color: "#3b6d11" };
  if (pct >= 60) return { title: "Developing Tactician", desc: "Solid foundation in the basics. Work on pressing triggers and positional play to reach the next level.", color: "#ba7517" };
  if (pct >= 40) return { title: "Learning the Game", desc: "You're building your tactical vocabulary. Focus on defensive shape and transition principles.", color: "#d85a30" };
  return { title: "Back to the Training Ground", desc: "The game has many layers to discover. Keep studying — every elite player started here.", color: "#e24b4a" };
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function TimerRing({ timeLeft }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - timeLeft / MAX_TIME);
  const color = timeLeft <= 5 ? "#e24b4a" : timeLeft <= 9 ? "#ef9f27" : "#4ade80";
  return (
    <div className="tiq-timer-ring">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s linear", strokeLinecap: "round" }} />
      </svg>
      <div className="tiq-timer-num" style={{ color: timeLeft <= 5 ? "#e24b4a" : undefined }}>
        {timeLeft}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREENS
───────────────────────────────────────────── */
function StartScreen({ onStart }) {
  return (
    <div>
      <div className="tiq-start-hero">
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .07, pointerEvents: "none" }} viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
          <rect x="1" y="1" width="398" height="198" fill="none" stroke="white" strokeWidth="1.5" />
          <line x1="200" y1="1" x2="200" y2="199" stroke="white" strokeWidth="1.5" />
          <circle cx="200" cy="100" r="35" fill="none" stroke="white" strokeWidth="1.5" />
          <rect x="1" y="60" width="75" height="80" fill="none" stroke="white" strokeWidth="1.5" />
          <rect x="324" y="60" width="75" height="80" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="200" cy="100" r="3" fill="white" />
        </svg>
        <div className="tiq-start-emblem"><i className="ti ti-clipboard-list" aria-hidden="true" /></div>
        <div className="tiq-start-title">Tactical IQ<br />Challenge</div>
        <div className="tiq-start-sub">Academy football scenarios — test your reading of the game across all phases of play</div>
      </div>
      <div className="tiq-info-grid">
        <div className="tiq-info-card"><i className="ti ti-stack-2" aria-hidden="true" /><span className="tiq-info-val">5</span><div className="tiq-info-desc">Scenarios per session</div></div>
        <div className="tiq-info-card"><i className="ti ti-clock" aria-hidden="true" /><span className="tiq-info-val">20s</span><div className="tiq-info-desc">Per question</div></div>
        <div className="tiq-info-card"><i className="ti ti-database" aria-hidden="true" /><span className="tiq-info-val">15</span><div className="tiq-info-desc">Question bank</div></div>
      </div>
      <button className="tiq-btn" onClick={onStart}>
        <i className="ti ti-player-play" aria-hidden="true" /> Start Session
      </button>
    </div>
  );
}

function QuestionScreen({ question, qIndex, timeLeft, optionStates, feedback, answered, onSelect, onNext }) {
  const AnimComponent = PITCH_ANIMS[question.id - 1] || PITCH_ANIMS[0];
  const isLast = qIndex + 1 >= TOTAL;
  return (
    <div>
      {/* HUD */}
      <div className="tiq-hud">
        <div className="tiq-progress-wrap">
          <div className="tiq-progress-bar" style={{ width: `${(qIndex / TOTAL) * 100}%` }} />
        </div>
        <span className="tiq-hud-chip">{qIndex + 1} / {TOTAL}</span>
        <TimerRing timeLeft={timeLeft} />
      </div>

      {/* Scenario hero */}
      <div className="tiq-scenario-hero">
        <div className="tiq-scenario-tag">
          <div className="tiq-dot" /> {question.phase} · {question.formation}
        </div>
        <div className="tiq-scenario-title">{question.scenario}</div>
        <div className="tiq-scenario-context">{question.context}</div>
      </div>

      {/* Pitch animation */}
      <AnimComponent />

      {/* Question */}
      <div className="tiq-question-card">
        <div className="tiq-question-label">
          <i className="ti ti-help-circle" aria-hidden="true" style={{ fontSize: 12, verticalAlign: -1, marginRight: 4 }} />
          Question
        </div>
        <div className="tiq-question-text">{question.question}</div>
      </div>

      {/* Options */}
      <div className="tiq-options-grid">
        {question.options.map((opt, i) => (
          <button
            key={i}
            className={`tiq-opt ${optionStates[i] || ""}`}
            onClick={() => onSelect(i)}
            disabled={answered}
            aria-label={`Option ${LETTERS[i]}: ${opt}`}
          >
            <span className="tiq-opt-letter">{LETTERS[i]}</span>
            <span style={{ flex: 1 }}>{opt}</span>
            {optionStates[i] === "better" && <span className="tiq-better-badge">Better answer</span>}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`tiq-feedback ${feedback.type}`} role="alert">
          <i className={`ti ${feedback.type === "correct" ? "ti-circle-check" : "ti-bulb"}`} aria-hidden="true" />
          <div>
            <strong>{feedback.type === "correct" ? "Spot on." : "Better alternative highlighted."}</strong> {question.explanation}
          </div>
        </div>
      )}

      {/* Next button */}
      {answered && (
        <button className="tiq-btn" onClick={onNext}>
          <i className={`ti ${isLast ? "ti-flag-check" : "ti-arrow-right"}`} aria-hidden="true" />
          {isLast ? "See Final Result" : "Next Scenario"}
        </button>
      )}
    </div>
  );
}

function ResultsScreen({ correct, score, onRestart }) {
  const pct = Math.round((correct / TOTAL) * 100);
  const rating = getRating(pct);
  return (
    <div className="tiq-results">
      <div className="tiq-results-badge"><i className="ti ti-award" aria-hidden="true" /></div>
      <div className="tiq-results-score">{pct}<span className="tiq-results-pct">%</span></div>
      <div className="tiq-results-label">Tactical IQ Score</div>
      <div className="tiq-results-grid">
        <div className="tiq-results-stat"><div className="tiq-results-stat-num">{correct}/{TOTAL}</div><div className="tiq-results-stat-label">Correct</div></div>
        <div className="tiq-results-stat"><div className="tiq-results-stat-num">{score}</div><div className="tiq-results-stat-label">Points</div></div>
        <div className="tiq-results-stat"><div className="tiq-results-stat-num">{TOTAL - correct}</div><div className="tiq-results-stat-label">To Review</div></div>
      </div>
      <div className="tiq-rating-bar">
        <div className="tiq-rating-title" style={{ color: rating.color }}>{rating.title}</div>
        <div className="tiq-rating-desc">{rating.desc}</div>
      </div>
      <button className="tiq-btn" onClick={onRestart}>
        <i className="ti ti-refresh" aria-hidden="true" /> New Session
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function TacticalIQQuiz() {
  const [screen, setScreen] = useState("start"); // start | question | results
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME);
  const [answered, setAnswered] = useState(false);
  const [optionStates, setOptionStates] = useState({}); // { index: "correct"|"chosen"|"better" }
  const [feedback, setFeedback] = useState(null); // { type: "correct"|"better" }
  const timerRef = useRef(null);

  // inject global CSS once
  useEffect(() => {
    const id = "tiq-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
  }, []);

  // timer
  useEffect(() => {
    if (screen !== "question" || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, qIndex, answered]);

  function handleTimeout() {
    const q = questions[qIndex];
    setAnswered(true);
    setOptionStates({ [q.correct]: "better" });
    setFeedback({ type: "better" });
  }

  function startQuiz() {
    const qs = shuffle(QUESTION_BANK).slice(0, TOTAL);
    setQuestions(qs);
    setQIndex(0);
    setScore(0);
    setCorrect(0);
    setTimeLeft(MAX_TIME);
    setAnswered(false);
    setOptionStates({});
    setFeedback(null);
    setScreen("question");
  }

  function selectAnswer(i) {
    if (answered) return;
    clearInterval(timerRef.current);
    const q = questions[qIndex];
    const ok = i === q.correct;
    setAnswered(true);
    if (ok) {
      setScore(s => s + 20);
      setCorrect(c => c + 1);
      setOptionStates({ [i]: "correct" });
      setFeedback({ type: "correct" });
    } else {
      setOptionStates({ [i]: "chosen", [q.correct]: "better" });
      setFeedback({ type: "better" });
    }
  }

  function nextQuestion() {
    const next = qIndex + 1;
    if (next >= questions.length) {
      setScreen("results");
    } else {
      setQIndex(next);
      setTimeLeft(MAX_TIME);
      setAnswered(false);
      setOptionStates({});
      setFeedback(null);
    }
  }

  function restartQuiz() {
    setScreen("start");
  }

  return (
    <div className="tiq-root">
      {screen === "start" && <StartScreen onStart={startQuiz} />}
      {screen === "question" && questions[qIndex] && (
        <QuestionScreen
          question={questions[qIndex]}
          qIndex={qIndex}
          timeLeft={timeLeft}
          optionStates={optionStates}
          feedback={feedback}
          answered={answered}
          onSelect={selectAnswer}
          onNext={nextQuestion}
        />
      )}
      {screen === "results" && <ResultsScreen correct={correct} score={score} onRestart={restartQuiz} />}
    </div>
  );
}