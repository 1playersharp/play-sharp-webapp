<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tactical IQ Challenge</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --green-dark:#0a2e14;--green-mid:#0d3a1a;--green-light:#17532a;
      --pitch:#1a5c2a;--pitch-line:rgba(255,255,255,0.55);
      --team-a:#3b82f6;--team-b:#ef4444;--ball:#facc15;
      --bg:#f4f4f0;--card:#fff;--border:rgba(0,0,0,0.1);--border-mid:rgba(0,0,0,0.18);
      --txt:#1a1a1a;--txt2:#555550;--txt3:#888880;
      --correct-bg:#eaf3de;--correct-border:#639922;--correct-txt:#27500a;
      --wrong-bg:#fcebeb;--wrong-border:#e24b4a;--wrong-txt:#501313;
      --radius:8px;--radius-lg:12px;
    }
    @media(prefers-color-scheme:dark){:root{
      --bg:#1c1c1a;--card:#252522;--border:rgba(255,255,255,0.08);--border-mid:rgba(255,255,255,0.16);
      --txt:#f0eeea;--txt2:#a8a89e;--txt3:#6a6a62;
    }}
    body{font-family:'Barlow',sans-serif;background:var(--bg);color:var(--txt);min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:1.5rem 1rem}
    .root{width:100%;max-width:640px}

    /* ── Pitch animation container ── */
    .pitch-wrap{border-radius:var(--radius-lg);overflow:hidden;margin-bottom:1rem;position:relative;background:#1a5c2a}
    .pitch-wrap svg{display:block;width:100%}

    /* Player dots */
    .p-a{fill:var(--team-a);stroke:#fff;stroke-width:1.5}
    .p-b{fill:var(--team-b);stroke:#fff;stroke-width:1.5}
    .p-gk{fill:#f97316;stroke:#fff;stroke-width:1.5}
    .ball{fill:var(--ball);stroke:#92400e;stroke-width:1}

    /* Arrow styles */
    .pass-line{fill:none;stroke:var(--ball);stroke-width:2;stroke-dasharray:6 4;stroke-dashoffset:0}
    .press-line{fill:none;stroke:#ef4444;stroke-width:1.8;stroke-dasharray:5 3;stroke-dashoffset:0}
    .run-line{fill:none;stroke:rgba(255,255,255,0.5);stroke-width:1.5;stroke-dasharray:4 3;stroke-dashoffset:0}

    /* CSS animations for pitch elements */
    @keyframes dash{to{stroke-dashoffset:-200}}
    @keyframes dash-rev{to{stroke-dashoffset:200}}
    @keyframes pulse{0%,100%{r:7}50%{r:9}}
    @keyframes ball-move-1{0%{cx:80;cy:180}40%{cx:170;cy:130}100%{cx:170;cy:130}}
    @keyframes ball-move-2{0%{cx:300;cy:80}50%{cx:380;cy:150}100%{cx:480;cy:90}}
    @keyframes ball-move-3{0%{cx:300;cy:160}60%{cx:220;cy:200}100%{cx:220;cy:200}}
    @keyframes ball-move-4{0%{cx:340;cy:100}50%{cx:340;cy:160}100%{cx:340;cy:160}}
    @keyframes ball-move-5{0%{cx:80;cy:180}45%{cx:80;cy:80}100%{cx:80;cy:80}}
    @keyframes ball-move-6{0%{cx:160;cy:200}50%{cx:300;cy:120}100%{cx:480;cy:80}}
    @keyframes ball-move-7{0%{cx:380;cy:140}50%{cx:280;cy:100}100%{cx:150;cy:80}}
    @keyframes ball-move-8{0%{cx:300;cy:180}40%{cx:300;cy:120}80%{cx:380;cy:80}100%{cx:380;cy:80}}
    @keyframes ball-move-9{0%{cx:120;cy:80}50%{cx:200;cy:150}100%{cx:200;cy:150}}
    @keyframes ball-move-10{0%{cx:480;cy:100}50%{cx:360;cy:150}100%{cx:360;cy:150}}
    @keyframes ball-move-11{0%{cx:200;cy:160}45%{cx:120;cy:200}100%{cx:120;cy:200}}
    @keyframes ball-move-12{0%{cx:280;cy:200}50%{cx:280;cy:150}100%{cx:280;cy:150}}
    @keyframes ball-move-13{0%{cx:200;cy:220}50%{cx:340;cy:120}100%{cx:340;cy:120}}
    @keyframes ball-move-14{0%{cx:160;cy:160}50%{cx:260;cy:130}80%{cx:400;cy:80}100%{cx:400;cy:80}}
    @keyframes ball-move-15{0%{cx:220;cy:200}50%{cx:180;cy:160}100%{cx:180;cy:160}}

    @keyframes player-press-1a{0%{cy:120}50%{cy:155}100%{cy:155}}
    @keyframes player-press-1b{0%{cx:380;cy:120}50%{cx:330;cy:145}100%{cx:330;cy:145}}
    @keyframes winger-run-2{0%{cx:480;cy:160}50%{cx:460;cy:80}100%{cx:460;cy:80}}
    @keyframes player-drop-3{0%{cy:90}50%{cy:115}100%{cy:115}}
    @keyframes player-step-4{0%{cy:140}50%{cy:160}100%{cy:160}}
    @keyframes gk-step-5{0%{cx:80;cy:220}50%{cx:130;cy:200}100%{cx:130;cy:200}}
    @keyframes striker-run-6{0%{cx:480;cy:120}50%{cx:560;cy:80}100%{cx:560;cy:80}}
    @keyframes press-player-7{0%{cx:280;cy:160}50%{cx:320;cy:130}100%{cx:320;cy:130}}
    @keyframes runner-3rd-8{0%{cx:380;cy:180}50%{cx:380;cy:100}100%{cx:380;cy:100}}
    @keyframes defender-step-9{0%{cy:80}50%{cy:100}100%{cy:100}}
    @keyframes runner-10{0%{cx:540;cy:180}50%{cx:480;cy:120}100%{cx:480;cy:120}}
    @keyframes press-wing-11{0%{cx:260;cy:100}50%{cx:180;cy:160}100%{cx:180;cy:160}}
    @keyframes scan-player-12{0%{transform:rotate(0deg)}25%{transform:rotate(20deg)}75%{transform:rotate(-20deg)}100%{transform:rotate(0deg)}}
    @keyframes def-step-13{0%{cy:130}50%{cy:100}100%{cy:100}}
    @keyframes ball-wide-14{0%{cx:160;cy:160}40%{cx:260;cy:130}70%{cx:400;cy:80}100%{cx:400;cy:80}}
    @keyframes recycle-15{0%{cx:220;cy:200}30%{cx:180;cy:160}60%{cx:120;cy:180}80%{cx:80;cy:160}100%{cx:80;cy:160}}

    .anim-dash{animation:dash 1.5s linear infinite}
    .anim-dash-rev{animation:dash-rev 1.5s linear infinite}

    /* ── HUD & layout ── */
    .hud{display:flex;align-items:center;gap:12px;margin-bottom:1rem}
    .progress-wrap{flex:1;height:4px;background:var(--border);border-radius:2px;overflow:hidden}
    .progress-bar{height:100%;background:#639922;border-radius:2px;transition:width .4s ease}
    .hud-chip{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:.04em;color:var(--txt2)}
    .timer-ring{position:relative;width:40px;height:40px;flex-shrink:0}
    .timer-ring svg{transform:rotate(-90deg)}
    .timer-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:var(--txt)}

    /* ── Scenario hero ── */
    .scenario-hero{background:linear-gradient(180deg,#0a2e14,#0d3a1a);border-radius:var(--radius-lg);padding:1.25rem 1.25rem .9rem;position:relative;overflow:hidden;margin-bottom:1rem}
    .scenario-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:4px;padding:3px 9px;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-bottom:.6rem}
    .scenario-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;animation:sdot 1.5s ease-in-out infinite}
    @keyframes sdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}
    .scenario-title{font-family:'Barlow Condensed',sans-serif;font-size:21px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.02em;line-height:1.1;margin-bottom:.4rem}
    .scenario-context{font-size:12.5px;color:rgba(255,255,255,.6);line-height:1.6}

    /* ── Legend ── */
    .legend{display:flex;align-items:center;gap:12px;padding:.5rem .75rem;background:rgba(0,0,0,.25);border-top:1px solid rgba(255,255,255,.08);flex-wrap:wrap}
    .legend-item{display:flex;align-items:center;gap:5px;font-size:10.5px;color:rgba(255,255,255,.65);font-family:'Barlow Condensed',sans-serif;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .leg-dot{width:9px;height:9px;border-radius:50%;border:1.5px solid rgba(255,255,255,.6)}

    /* ── Question & options ── */
    .question-card{background:var(--card);border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:1.1rem 1.2rem;margin-bottom:1rem}
    .question-label{font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt3);margin-bottom:.45rem}
    .question-text{font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;color:var(--txt);line-height:1.25}
    .options-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:1rem}
    @media(max-width:480px){.options-grid{grid-template-columns:1fr}}
    .opt{background:var(--card);border:0.5px solid var(--border-mid);border-radius:var(--radius);padding:.7rem .9rem;text-align:left;cursor:pointer;transition:all .15s ease;display:flex;align-items:flex-start;gap:9px;color:var(--txt);font-family:'Barlow',sans-serif;font-size:13.5px;font-weight:500;line-height:1.4;min-height:54px}
    .opt:hover:not(:disabled){border-color:var(--txt3);background:var(--bg)}
    .opt.correct{background:var(--correct-bg);border-color:var(--correct-border);color:var(--correct-txt)}
    .opt.chosen{background:var(--bg);border-color:var(--border-mid);color:var(--txt3);opacity:.6}
    .opt.better{background:var(--correct-bg);border-color:var(--correct-border);color:var(--correct-txt)}
    .opt.better::after{content:'Better answer';font-size:10px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:#639922;color:#fff;border-radius:3px;padding:2px 6px;margin-left:auto;flex-shrink:0;align-self:center;white-space:nowrap}
    .opt-letter{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--bg);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:var(--txt2);margin-top:1px}
    .opt.correct .opt-letter{background:#639922;border-color:#639922;color:#fff}
    .opt.chosen .opt-letter{background:var(--border-mid);border-color:var(--border-mid);color:#fff}
    .opt.better .opt-letter{background:#639922;border-color:#639922;color:#fff}

    /* ── Feedback ── */
    .feedback{border-radius:var(--radius);padding:.8rem 1rem;font-size:13.5px;font-weight:500;display:none;align-items:flex-start;gap:10px;line-height:1.5;margin-bottom:1rem}
    .feedback.correct{background:var(--correct-bg);color:var(--correct-txt);border:.5px solid #97c459;display:flex}
    .feedback.better{background:#f0f4ff;color:#1e3a8a;border:.5px solid #93c5fd;display:flex}
    @media(prefers-color-scheme:dark){.feedback.better{background:#1e2a4a;color:#bfdbfe;border-color:#3b5f9e}}

    /* ── Buttons ── */
    .primary-btn{width:100%;padding:.85rem;background:var(--green-mid);color:#fff;border:none;border-radius:var(--radius);font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:center;gap:8px}
    .primary-btn:hover{background:var(--green-light)}

    /* ── Start screen ── */
    .start-hero{background:linear-gradient(180deg,#0a2e14,#0d3a1a);border-radius:var(--radius-lg);padding:2rem 1.5rem;margin-bottom:1.25rem;position:relative;overflow:hidden;text-align:center}
    .start-emblem{width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
    .start-emblem i{font-size:26px;color:#4ade80}
    .start-title{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#fff;line-height:1.05;margin-bottom:.5rem}
    .start-sub{font-size:13px;color:rgba(255,255,255,.55);line-height:1.6;max-width:320px;margin:0 auto}
    .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1.25rem}
    .info-card{background:var(--card);border:.5px solid var(--border);border-radius:var(--radius);padding:.85rem;text-align:center}
    .info-card i{font-size:19px;color:var(--txt2);margin-bottom:5px;display:block}
    .info-card-val{font-family:'Barlow Condensed',sans-serif;font-size:21px;font-weight:700;color:var(--txt);display:block}
    .info-card-desc{font-size:11px;color:var(--txt3);margin-top:1px}

    /* ── Results ── */
    .results-wrap{text-align:center;padding:.5rem 0}
    .results-badge{display:inline-flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;background:#0a2e14;margin:0 auto 1.1rem}
    .results-badge i{font-size:36px;color:#4ade80}
    .results-score{font-family:'Barlow Condensed',sans-serif;font-size:58px;font-weight:800;letter-spacing:-1px;color:var(--txt);line-height:1;margin-bottom:.2rem}
    .results-pct{font-size:28px;font-weight:500;color:var(--txt3)}
    .results-label{font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.12em;font-family:'Barlow Condensed',sans-serif;font-weight:700;margin-bottom:1.4rem}
    .results-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1rem}
    .results-stat{background:var(--bg);border-radius:var(--radius);padding:.85rem}
    .results-stat-num{font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800;color:var(--txt)}
    .results-stat-label{font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em;font-family:'Barlow Condensed',sans-serif;font-weight:700;margin-top:2px}
    .rating-bar{background:var(--bg);border-radius:var(--radius);padding:1rem 1.1rem;margin-bottom:1.25rem;text-align:left}
    .rating-title{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:.3rem}
    .rating-desc{font-size:13px;color:var(--txt2);line-height:1.6}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  </style>
</head>
<body>
<div class="root" id="app">
  <h2 class="sr-only">Football Tactical IQ Quiz</h2>
</div>

<script>
/* ═══════════════════════════════════════════════════
   PITCH ANIMATION BUILDER
   Each question has a unique animated SVG diagram
═══════════════════════════════════════════════════ */

const W = 580, H = 220;
const PITCH_GREEN = '#1a5c2a';
const LINE_COL = 'rgba(255,255,255,0.5)';

function pitchBase(extraContent='', legend=[]) {
  const legHTML = legend.length ? `
    <div class="legend">
      ${legend.map(l=>`<div class="legend-item"><div class="leg-dot" style="background:${l.color}"></div>${l.label}</div>`).join('')}
      <div class="legend-item" style="gap:8px"><svg width="26" height="10"><line x1="0" y1="5" x2="26" y2="5" stroke="#facc15" stroke-width="2" stroke-dasharray="5 3"/></svg>Pass / movement</div>
      <div class="legend-item" style="gap:8px"><svg width="26" height="10"><line x1="0" y1="5" x2="26" y2="5" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="4 3"/></svg>Press</div>
    </div>` : '';

  return `<div class="pitch-wrap">
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-label="Tactical pitch diagram">
      <rect width="${W}" height="${H}" fill="${PITCH_GREEN}"/>
      <!-- pitch markings -->
      <rect x="2" y="2" width="${W-4}" height="${H-4}" rx="0" fill="none" stroke="${LINE_COL}" stroke-width="1"/>
      <line x1="${W/2}" y1="2" x2="${W/2}" y2="${H-2}" stroke="${LINE_COL}" stroke-width="1"/>
      <circle cx="${W/2}" cy="${H/2}" r="30" fill="none" stroke="${LINE_COL}" stroke-width="1"/>
      <circle cx="${W/2}" cy="${H/2}" r="2" fill="${LINE_COL}"/>
      <!-- left box -->
      <rect x="2" y="${H/2-46}" width="72" height="92" fill="none" stroke="${LINE_COL}" stroke-width="1"/>
      <rect x="2" y="${H/2-24}" width="28" height="48" fill="none" stroke="${LINE_COL}" stroke-width="1"/>
      <!-- right box -->
      <rect x="${W-74}" y="${H/2-46}" width="72" height="92" fill="none" stroke="${LINE_COL}" stroke-width="1"/>
      <rect x="${W-30}" y="${H/2-24}" width="28" height="48" fill="none" stroke="${LINE_COL}" stroke-width="1"/>
      <!-- goals -->
      <rect x="0" y="${H/2-14}" width="4" height="28" fill="none" stroke="white" stroke-width="1.5"/>
      <rect x="${W-4}" y="${H/2-14}" width="4" height="28" fill="none" stroke="white" stroke-width="1.5"/>
      ${extraContent}
    </svg>
    ${legHTML}
  </div>`;
}

function player(cx,cy,cls,label='',anim=''){
  const labelEl = label ? `<text x="${cx}" y="${cy+18}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.85)" font-family="Barlow Condensed,sans-serif" font-weight="600">${label}</text>` : '';
  return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="7" ${anim}/>${labelEl}`;
}

function ball(cx,cy,animName,dur=2.5){
  return `<circle class="ball" cx="${cx}" cy="${cy}" r="5" style="animation:${animName} ${dur}s ease-in-out infinite alternate"/>`;
}

function dashLine(x1,y1,x2,y2,col,klass=''){
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" fill="none" stroke="${col}" stroke-width="1.8" stroke-dasharray="6 4" stroke-linecap="round" class="${klass}"/>`;
}

function arrow(x1,y1,x2,y2,col){
  const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
  const ux=dx/len,uy=dy/len;
  const ex=x2-ux*10,ey=y2-uy*10;
  const ax=uy*5,ay=-ux*5;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="1.8" stroke-linecap="round"/>
  <polygon points="${x2},${y2} ${ex+ax},${ey+ay} ${ex-ax},${ey-ay}" fill="${col}"/>`;
}

function label(x,y,text,col='rgba(255,255,255,0.85)'){
  return `<text x="${x}" y="${y}" font-size="10" fill="${col}" font-family="Barlow Condensed,sans-serif" font-weight="700" text-anchor="middle">${text}</text>`;
}

/* ── 15 unique scenario animations ── */
function anim1(){ // 4-3-3 High Press Trigger — CB receives from GK
  return pitchBase(`
    <!-- GK -->
    ${player(30,110,'p-gk','GK')}
    <!-- CBs (opposition) in red -->
    ${player(90,80,'p-b','CB')}
    ${player(90,140,'p-b','CB', 'style="animation:player-press-1a 2s ease-in-out infinite alternate"')}
    <!-- Pressing striker -->
    ${player(210,110,'p-a','ST', 'style="animation:player-press-1b 2s ease-in-out infinite alternate"')}
    <!-- Wingers tucking -->
    ${player(260,60,'p-a','LW')}
    ${player(260,160,'p-a','RW')}
    <!-- Pass line: GK to CB -->
    ${dashLine(30,110,90,140,'#facc15','anim-dash')}
    <!-- Press arrow -->
    ${arrow(210,110,110,140,'#ef4444')}
    <!-- Press lines from wingers cutting central -->
    ${dashLine(260,60,200,100,'#ef4444','anim-dash')}
    ${dashLine(260,160,200,130,'#ef4444','anim-dash')}
    <!-- Ball at CB -->
    <circle class="ball" cx="90" cy="140" r="5"/>
    ${label(300,20,'Press triggered: CB receives from GK','#facc15')}
    ${label(300,35,'Striker presses, wingers block central lanes','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Opposition'},{color:'#f97316',label:'Goalkeeper'}]);
}

function anim2(){ // Wide positioning — far-side winger must stay wide
  return pitchBase(`
    <!-- opposition defence -->
    ${player(440,60,'p-b','FB')}${player(440,100,'p-b','CB')}${player(440,140,'p-b','CB')}${player(440,175,'p-b','FB')}
    <!-- your team -->
    ${player(310,110,'p-a','CM')}
    ${player(370,80,'p-a','RW')} <!-- ball carrier -->
    ${player(480,175,'p-a','LW','style="animation:winger-run-2 2.2s ease-in-out infinite alternate"')}
    <!-- Ball at RW -->
    <circle class="ball" cx="370" cy="80" r="5"/>
    <!-- Pass option -->
    ${dashLine(370,80,310,110,'rgba(255,255,255,0.5)','')}
    <!-- LW width arrow -->
    ${arrow(490,175,550,175,'rgba(255,255,255,0.8)')}
    ${label(530,165,'Stay wide','rgba(255,255,255,0.85)')}
    ${label(300,20,'Far-side winger: stay wide to stretch defensive shape','#facc15')}
    ${label(300,35,'Pins the far FB — creates space centrally','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Opposition'}]);
}

function anim3(){ // Mid-block 4-2-3-1 — protect central lanes
  return pitchBase(`
    <!-- Your defensive shape (4-2-3-1) -->
    ${player(270,60,'p-a')}${player(330,60,'p-a')}${player(390,60,'p-a')}${player(450,60,'p-a')} <!-- back 4 -->
    ${player(300,105,'p-a')}${player(400,105,'p-a')} <!-- double pivot -->
    ${player(260,145,'p-a')}${player(350,145,'p-a')}${player(440,145,'p-a')} <!-- AM line -->
    ${player(350,180,'p-a')} <!-- striker -->
    <!-- Opposition probing -->
    ${player(110,60,'p-b')}${player(160,100,'p-b')}${player(110,140,'p-b')}${player(160,60,'p-b')}
    <circle class="ball" cx="160" cy="100" r="5"/>
    <!-- Block arrows showing central protection -->
    ${dashLine(300,105,350,145,'rgba(255,255,255,0.3)','')}
    ${dashLine(400,105,350,145,'rgba(255,255,255,0.3)','')}
    ${label(350,20,'Mid-block: protect central lanes first','#facc15')}
    ${label(350,35,'Compact shape — no gaps between lines','rgba(255,255,255,0.7)')}
    <!-- shaded central zone -->
    <rect x="255" y="95" width="185" height="60" fill="rgba(250,204,21,0.08)" rx="4"/>
  `, [{color:'#3b82f6',label:'Your team (mid-block)'},{color:'#ef4444',label:'Opposition'}]);
}

function anim4(){ // 4-4-2 vulnerability — the 10 space
  return pitchBase(`
    <!-- 4-4-2 back 4 -->
    ${player(380,50,'p-a')}${player(420,80,'p-a')}${player(420,140,'p-a')}${player(380,170,'p-a')}
    <!-- Midfield 4 -->
    ${player(280,50,'p-a')}${player(310,85,'p-a')}${player(310,135,'p-a')}${player(280,170,'p-a')}
    <!-- Striker pair -->
    ${player(200,95,'p-a')}${player(200,125,'p-a')}
    <!-- Opposition 10 dropping into gap -->
    ${player(350,110,'p-b','10','style="animation:player-step-4 2s ease-in-out infinite alternate"')}
    <circle class="ball" cx="200" cy="110" r="5" style="animation:ball-move-4 2.5s ease-in-out infinite alternate"/>
    <!-- The gap zone highlighted -->
    <rect x="290" y="90" width="110" height="40" fill="rgba(250,204,21,0.12)" stroke="rgba(250,204,21,0.4)" stroke-width="1" rx="4"/>
    ${label(344,113,'GAP','rgba(250,204,21,0.9)')}
    ${dashLine(200,110,340,110,'#facc15','anim-dash')}
    ${label(290,20,'4-4-2 vulnerability: the gap between lines','#facc15')}
    ${label(290,35,'No.10 drops here — faces goal with time and space','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team (4-4-2)'},{color:'#ef4444',label:'Opposition No.10'}]);
}

function anim5(){ // GK as sweeper keeper vs 2-striker press
  return pitchBase(`
    <!-- Your CBs being pressed -->
    ${player(130,80,'p-a','CB')}${player(130,140,'p-a','CB')}
    <!-- Two opposition strikers pressing -->
    ${player(190,80,'p-b','ST')}${player(190,140,'p-b','ST')}
    <!-- GK stepping out as option -->
    ${player(80,110,'p-gk','GK','style="animation:gk-step-5 2.2s ease-in-out infinite alternate"')}
    <!-- Fullbacks high -->
    ${player(220,30,'p-a','FB')}${player(220,190,'p-a','FB')}
    <!-- Press arrows -->
    ${arrow(190,80,140,85,'#ef4444')}${arrow(190,140,140,135,'#ef4444')}
    <!-- GK option line -->
    ${dashLine(130,90,100,105,'#facc15','anim-dash')}
    ${dashLine(80,110,220,30,'rgba(255,255,255,0.4)','anim-dash')}
    <circle class="ball" cx="130" cy="80" r="5" style="animation:ball-move-5 2.5s ease-in-out infinite alternate"/>
    ${label(300,20,'GK as sweeper-keeper — 3rd man in build-up','#facc15')}
    ${label(300,35,'Back pass to GK beats the 2-striker press instantly','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Opposition press'},{color:'#f97316',label:'Goalkeeper (key option)'}]);
}

function anim6(){ // Counter attack — exploit space in behind
  return pitchBase(`
    <!-- 6 opp players caught high -->
    ${player(200,40,'p-b')}${player(240,55,'p-b')}${player(280,40,'p-b')}
    ${player(220,75,'p-b')}${player(260,75,'p-b')}${player(300,75,'p-b')}
    <!-- Your player in own half with ball -->
    ${player(160,160,'p-a','CM')}
    <!-- Striker running in behind -->
    ${player(480,120,'p-a','ST','style="animation:striker-run-6 2s ease-in-out infinite alternate"')}
    <!-- Last defender -->
    ${player(430,100,'p-b','DEF')}
    <!-- Through-ball line -->
    ${dashLine(160,160,520,80,'#facc15','anim-dash')}
    <!-- Run arrow -->
    ${arrow(480,120,555,80,'rgba(255,255,255,0.8)')}
    <circle class="ball" cx="160" cy="160" r="5" style="animation:ball-move-6 2.5s ease-in-out infinite alternate"/>
    ${label(300,20,'Counter attack: play immediately into space behind','#facc15')}
    ${label(300,35,'Striker run is live — any delay lets defenders recover','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Opposition (disorganised)'}]);
}

function anim7(){ // Gegenpressing — immediate counter-press
  return pitchBase(`
    <!-- Your players recovering -->
    ${player(200,80,'p-a')}${player(250,120,'p-a')}${player(300,160,'p-a')}
    <!-- Ball winner -->
    ${player(320,130,'p-b','×')} <!-- who just took the ball -->
    <!-- 3 opposition in space -->
    ${player(380,70,'p-b')}${player(420,110,'p-b')}${player(460,150,'p-b')}
    <!-- Your nearest player pressing immediately -->
    ${player(280,100,'p-a','→','style="animation:press-player-7 2s ease-in-out infinite alternate"')}
    <!-- Press arrow -->
    ${arrow(290,110,330,130,'#ef4444')}
    ${dashLine(380,70,320,130,'#facc15','anim-dash')}
    <circle class="ball" cx="320" cy="130" r="5" style="animation:ball-move-7 2s ease-in-out infinite alternate"/>
    ${label(300,20,'Gegenpress: nearest player must press immediately','#facc15')}
    ${label(300,35,'5-second window — pressure buys recovery time','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Opposition'}]);
}

function anim8(){ // Third man run
  return pitchBase(`
    <!-- Player A -->
    ${player(220,150,'p-a','A')}
    <!-- Player B in half-space -->
    ${player(310,110,'p-a','B')}
    <!-- Third man runner -->
    ${player(380,175,'p-a','C','style="animation:runner-3rd-8 2s ease-in-out infinite alternate"')}
    <!-- Opposition mid line -->
    ${player(390,90,'p-b')}${player(430,120,'p-b')}${player(350,60,'p-b')}
    <!-- Pass A→B then B→A -->
    ${dashLine(220,150,310,110,'#facc15','anim-dash')}
    ${dashLine(310,110,220,150,'rgba(255,255,255,0.4)','')}
    <!-- Third man run into space -->
    ${arrow(380,175,380,100,'rgba(255,255,255,0.85)')}
    <circle class="ball" cx="300" cy="180" r="5" style="animation:ball-move-8 2.5s ease-in-out infinite alternate"/>
    ${label(300,20,'Third man run: arrive beyond the defensive line','#facc15')}
    ${label(300,35,'Defenders watch the ball — runner arrives unmarked','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Defensive line'}]);
}

function anim9(){ // Corner defence — zonal back post
  return pitchBase(`
    <!-- Goal area -->
    <rect x="2" y="${H/2-24}" width="28" height="48" fill="rgba(255,255,255,0.05)"/>
    <!-- Corner taker -->
    ${player(2,10,'p-b','CT')}
    <!-- Zonal defenders -->
    ${player(60,100,'p-a','Z1')}${player(90,70,'p-a','Z2')}${player(100,140,'p-a','Z3')}${player(130,110,'p-a','Z4','style="animation:defender-step-9 2s ease-in-out infinite alternate"')}
    <!-- Attackers in box -->
    ${player(75,115,'p-b')}${player(110,85,'p-b')}
    <!-- Runner to back post -->
    ${player(130,150,'p-b','RUN')}
    <!-- Corner flight -->
    ${dashLine(2,10,130,110,'#facc15','anim-dash')}
    <!-- Back post defender attacks ball -->
    ${arrow(130,110,130,85,'rgba(255,255,255,0.9)')}
    ${label(300,20,'Zonal defending: back post defender attacks the ball','#facc15')}
    ${label(300,35,'Do not hold zone statically — claim and clear far post','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team (zonal)'},{color:'#ef4444',label:'Opposition corners'}]);
}

function anim10(){ // Back post runner decision
  return pitchBase(`
    <!-- Goalkeeper off line -->
    ${player(30,110,'p-gk','GK')}
    <!-- Near post attacker -->
    ${player(70,80,'p-a','NP')}
    <!-- Back post runner arriving -->
    ${player(540,180,'p-a','BP','style="animation:runner-10 2.2s ease-in-out infinite alternate"')}
    <!-- Defender -->
    ${player(470,120,'p-b','DEF')}
    <!-- Cross from wide right -->
    ${player(560,30,'p-a','CR')}
    ${dashLine(560,30,480,110,'#facc15','anim-dash')}
    <!-- Shot to far post -->
    ${arrow(480,120,30,70,'rgba(255,255,255,0.85)')}
    ${label(180,55,'Far post shot','rgba(255,255,255,0.8)')}
    ${label(300,20,'Back post runner: arrive at pace, shoot far post first-time','#facc15')}
    ${label(300,35,'GK off line — commit fully, cross quality decides the outcome','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Opposition'},{color:'#f97316',label:'Goalkeeper (off line)'}]);
}

function anim11(){ // Pressing trap wide channel
  return pitchBase(`
    <!-- Your press shape -->
    ${player(260,170,'p-a','ST')} <!-- covers back pass to CB -->
    ${player(200,130,'p-a','RW','style="animation:press-wing-11 2s ease-in-out infinite alternate"')} <!-- closing FB -->
    ${player(300,120,'p-a','CM')} <!-- cuts inside lane -->
    <!-- Opposition -->
    ${player(130,170,'p-b','CB')}
    ${player(110,200,'p-b','FB')} <!-- fullback trapped -->
    <!-- Touchline -->
    <line x1="2" y1="215" x2="${W-2}" y2="215" stroke="white" stroke-width="2"/>
    <!-- Press arrows -->
    ${arrow(200,130,130,185,'#ef4444')}
    ${arrow(260,170,140,175,'#ef4444')}
    ${dashLine(300,120,220,145,'#ef4444','anim-dash')}
    <!-- No outlets shown -->
    <circle class="ball" cx="110" cy="200" r="5"/>
    ${label(350,25,'Pressing trap: 3-player mechanism on the wide channel','#facc15')}
    ${label(350,40,'Winger closes, striker covers CB, CM blocks inside lane','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team pressing'},{color:'#ef4444',label:'Opposition trapped'}]);
}

function anim12(){ // Pre-scanning — shoulder check
  return pitchBase(`
    <!-- Player about to receive -->
    <g style="transform-origin:280px 150px;animation:scan-player-12 2.5s ease-in-out infinite">
      <circle class="p-a" cx="280" cy="150" r="7"/>
      <!-- Scan arc visual -->
      <path d="M 280 150 L 310 130 A 35 35 0 0 1 310 170 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    </g>
    <!-- Passer -->
    ${player(200,150,'p-a','P')}
    <!-- Pressers -->
    ${player(340,130,'p-b')}${player(360,160,'p-b')}
    <!-- Open team-mate -->
    ${player(300,90,'p-a','FREE')}
    <!-- Pass incoming -->
    ${dashLine(200,150,280,150,'#facc15','anim-dash')}
    <!-- Scan lines -->
    ${dashLine(280,150,310,120,'rgba(255,255,255,0.35)','')}
    ${dashLine(280,150,310,175,'rgba(255,255,255,0.35)','')}
    ${label(300,20,'Pre-scan before receiving: know your picture early','#facc15')}
    ${label(300,35,'Shoulder check 1–2× before ball arrives — faster decision','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Pressers'}]);
}

function anim13(){ // Offside trap timing
  return pitchBase(`
    <!-- High defensive line -->
    ${player(380,50,'p-a','FB')}
    ${player(400,90,'p-a','CB','style="animation:def-step-13 2s ease-in-out infinite alternate"')}
    ${player(400,130,'p-a','CB','style="animation:def-step-13 2s ease-in-out infinite alternate"')}
    ${player(380,170,'p-a','FB')}
    <!-- Opposition striker running -->
    ${player(340,110,'p-b','ST')}
    <!-- Opposition CB about to play ball -->
    ${player(180,110,'p-b','CB')}
    ${dashLine(180,110,440,80,'#facc15','anim-dash')}
    <!-- Step timing arrow -->
    ${arrow(400,110,470,110,'rgba(255,255,255,0.9)')}
    ${label(510,110,'Step!','rgba(255,255,255,0.9)')}
    <!-- offside line -->
    <line x1="400" y1="20" x2="400" y2="${H-10}" stroke="rgba(250,204,21,0.4)" stroke-width="1" stroke-dasharray="4 3"/>
    ${label(410,30,'Offside line','rgba(250,204,21,0.7)')}
    ${label(300,18,'Offside trap: step at the moment of the pass — not before','#facc15')}
    ${label(300,33,'Read the CB kicking motion as your trigger','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your defensive line'},{color:'#ef4444',label:'Opposition'}]);
}

function anim14(){ // Switch of play
  return pitchBase(`
    <!-- Your team overloading left -->
    ${player(160,160,'p-a')}${player(190,175,'p-a')}${player(220,155,'p-a')}
    <!-- 4 opposition shifted across left -->
    ${player(230,155,'p-b')}${player(250,175,'p-b')}${player(270,155,'p-b')}${player(250,130,'p-b')}
    <!-- Holding midfielder receiving recycle -->
    ${player(300,130,'p-a','DM')}
    <!-- Far side right back totally free -->
    ${player(490,80,'p-a','RB')}
    <!-- Congestion zone shaded -->
    <rect x="130" y="130" width="150" height="60" fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.2)" stroke-width="1" rx="4"/>
    ${label(205,195,'Overloaded','rgba(239,68,68,0.7)')}
    <!-- Switch line through DM -->
    <circle class="ball" cx="160" cy="160" r="5" style="animation:ball-wide-14 2.8s ease-in-out infinite alternate"/>
    ${dashLine(160,160,300,130,'rgba(255,255,255,0.5)','')}
    ${dashLine(300,130,490,80,'#facc15','anim-dash')}
    ${label(490,68,'FREE','rgba(255,255,255,0.9)')}
    ${label(300,20,'Switch when opposition fully commits — max space far side','#facc15')}
    ${label(300,35,'Play through DM to keep possession secure during switch','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Opposition (overcommitted)'}]);
}

function anim15(){ // Game management — recycle possession
  return pitchBase(`
    <!-- Your back 4 and GK -->
    ${player(60,110,'p-gk','GK')}
    ${player(160,70,'p-a','CB')}${player(160,150,'p-a','CB')}
    ${player(130,40,'p-a','FB')}${player(130,180,'p-a','FB')}
    <!-- Midfielder recycling -->
    ${player(220,200,'p-a','CM')}
    <!-- Ball recycling through team -->
    <circle class="ball" cx="220" cy="200" r="5" style="animation:recycle-15 3s ease-in-out infinite alternate"/>
    <!-- Opp throwing forward -->
    ${player(310,80,'p-b')}${player(350,120,'p-b')}${player(370,60,'p-b')}
    ${player(290,160,'p-b','FB')}${player(300,110,'p-b','FB')}
    <!-- Isolated striker -->
    ${player(480,110,'p-a','ST')}
    <!-- Recycle arrows -->
    ${dashLine(220,200,160,150,'rgba(255,255,255,0.5)','')}
    ${dashLine(160,150,60,110,'rgba(255,255,255,0.5)','')}
    ${dashLine(60,110,160,70,'rgba(255,255,255,0.5)','')}
    ${label(300,20,'Game management: use possession to run down the clock','#facc15')}
    ${label(300,35,'Recycle through team and GK — force opposition to chase','rgba(255,255,255,0.7)')}
  `, [{color:'#3b82f6',label:'Your team'},{color:'#ef4444',label:'Opposition chasing'},{color:'#f97316',label:'Goalkeeper (safe outlet)'}]);
}

const ANIMATIONS = [anim1,anim2,anim3,anim4,anim5,anim6,anim7,anim8,anim9,anim10,anim11,anim12,anim13,anim14,anim15];

/* ═══════════════════════════════════════════════════
   QUESTION BANK
═══════════════════════════════════════════════════ */
const QUESTION_BANK = [
  {id:1,phase:"Out of Possession",formation:"4-3-3",scenario:"High Press Trigger",context:"Your team is in a 4-3-3 pressing from the front. The opposition centre-back has just received the ball from the goalkeeper with their back to goal under no immediate pressure.",question:"What is the correct pressing trigger in this moment?",options:["Ball played to the fullback — press immediately to force backward pass","Wait until the CB turns and drives forward before applying pressure","Drop into a mid-block and invite the opposition to play through midfield","Striker presses the CB while wingers tuck inside to block central passes"],correct:3,explanation:"Pressing the CB alone achieves nothing — the striker must show the press while wingers close central passing lanes simultaneously, trapping the CB with no safe outlet."},
  {id:2,phase:"Attacking",formation:"4-3-3",scenario:"Wide Attacking Positioning",context:"Your team wins the ball back in midfield. The right winger is on the ball and the opposition fullback is closing at pace. The near-side central midfielder is free in the half-space.",question:"Where should the left winger position themselves in this moment?",options:["Drift centrally to create an overload in the half-space near the ball","Stay wide on the far side to stretch the defensive shape","Drop into midfield to offer a recycle option to the holding midfielder","Overlap the right winger to create a 2v1 on that side"],correct:1,explanation:"Width is the left winger's primary job in transition. Staying wide pins the opposition fullback, prevents the defence from compacting, and creates space for the ball carrier and half-space runner."},
  {id:3,phase:"Defending",formation:"4-2-3-1",scenario:"Mid-Block Shape",context:"Your team is sitting in an organised mid-block at 1-0 up with 20 minutes to go. The opposition is recycling possession looking to play through your shape.",question:"What is the primary defensive priority in this structure?",options:["Step and press the ball aggressively to force mistakes","Protect the central lanes and deny penetrating passes in behind the lines","Push fullbacks high to prevent wide combinations","Man-mark the opposition striker tightly to restrict hold-up play"],correct:1,explanation:"In a mid-block the first priority is always to protect central zones. Conceding to the outside is acceptable — a well-organised block forces wide and waits for a mistake, never pressing recklessly."},
  {id:4,phase:"Defending",formation:"4-4-2",scenario:"Compactness & The 10 Space",context:"The opposition are recycling the ball across the back four. Your 4-4-2 is in shape 25 metres from goal. The ball is played to the right centre-back who has time on the ball.",question:"What is the main structural vulnerability of a flat 4-4-2 block in this situation?",options:["The space between the defensive and midfield lines — the '10 space'","The goalkeeper being caught off their line","Too many bodies in central areas causing congestion","The striker pairing being too far forward to help defensively"],correct:0,explanation:"The gap between the two lines is the 4-4-2's biggest weakness. A technically gifted number 10 receiving in that space, facing goal with time, can unlock the entire block."},
  {id:5,phase:"Possession",formation:"Build-up Phase",scenario:"Beating the Press — GK as Sweeper-Keeper",context:"You are building from the back. The opposition's two strikers are pressing your centre-backs. Your goalkeeper is 8 metres behind the ball unmarked. Both fullbacks are pushed high.",question:"What is the most effective way to break the two-striker press in this moment?",options:["Play long immediately to relieve pressure","Pass back to the goalkeeper to use them as an extra outfield player and shift the angle","Force a pass through the press into the feet of the holding midfielder","Dribble forward into the press to draw a foul"],correct:1,explanation:"The goalkeeper as a third centre-back is the modern solution to two-striker presses. The GK receives, shifts the ball wide, and instantly makes the press redundant by changing the angle."},
  {id:6,phase:"Attacking Transition",formation:"Counter Attack",scenario:"Exploiting Space in Behind",context:"You have just won the ball back in your own half. The opposition are disorganised with 6 players caught ahead of the ball. Your striker is making a run in behind the last defender.",question:"As the player in possession in your own half, what is the correct first action?",options:["Drive forward with the ball to advance the attack yourself","Recycle possession sideways to buy time and let runners re-set","Play the ball immediately in behind the defensive line for the striker's run","Look to combine short with the nearest midfielder before switching"],correct:2,explanation:"Transition moments are time-sensitive. Any delay allows defenders to recover. The first pass must exploit the space in behind immediately while the striker's run is live."},
  {id:7,phase:"Defending",formation:"Counter Press",scenario:"Gegenpressing After Losing Possession",context:"Your team has just lost the ball in the opposition's half. Three opposition players are now in space. Your nearest player to the ball is 3 metres away.",question:"What is the correct immediate action from the player closest to the ball?",options:["Sprint back to re-organise into a defensive shape immediately","Apply immediate pressure on the ball carrier to delay the attack","Track the nearest opposition runner and stay goal-side","Signal to team-mates to drop into a low block"],correct:1,explanation:"The 5-second counter-press rule: the player nearest the ball must apply immediate pressure to slow the attack. Sprinting away from the ball before pressure is applied gives the opposition an uncontested transition."},
  {id:8,phase:"Possession",formation:"Positional Play",scenario:"Creating Overloads — The 3rd Man Run",context:"Your team is working the ball through midfield. Player A passes to Player B in the half-space. Player B plays back to Player A. A third midfielder is making a late run beyond Player B.",question:"What is the purpose of the third man's run in this combination?",options:["To create a numerical overload in midfield and recycle possession","To arrive beyond the second line of pressure in the moment defenders focus on the ball exchange","To offer an emergency pass option if Player A is pressed","To draw opposition players wide and free up central space"],correct:1,explanation:"The third man run is a fundamental concept in positional play — the runner moves when defenders focus on the ball. By the time the ball is ready to be played forward the runner is beyond the line, impossible to track."},
  {id:9,phase:"Set Piece — Defending",formation:"Corner Defence",scenario:"Defending Corners — Zonal Marking",context:"Your team defends corners with a zonal marking system. An opposition player has peeled to the back post unmarked. Your defenders are holding their zones.",question:"What is the defensive responsibility of the back post zonal defender?",options:["Hold the zone rigidly and wait for the ball to enter the zone before reacting","Man-mark the runner peeling to the back post, leaving the zone","Step to intercept the low cutback pass from the corner taker","Attack the flight of the ball and clear beyond the far post"],correct:3,explanation:"In a zonal system, the back post defender's job is to attack the ball — not guard a static space. Standing and waiting invites a header or flick-on at close range. Claim it aggressively and clear far post."},
  {id:10,phase:"Attacking",formation:"Final Third",scenario:"Decision Making in the Box",context:"A cross is delivered from wide right. You are arriving at the back post at pace. A team-mate is at the near post. The goalkeeper is off their line. One defender is between you and goal.",question:"As the back post runner, what is the best decision?",options:["Arrive at full pace and shoot first-time if the ball reaches you, aiming far post","Check your run to keep the ball in play if the cross is over-hit","Call for the cutback — shield from the near post team-mate to pull the defender","Pull away toward the penalty spot to create space for the near post attacker"],correct:0,explanation:"Arriving at pace and attacking the ball first-time far post exploits the goalkeeper being caught in no man's land. Checking the run collapses the timing. The back post runner must commit fully."},
  {id:11,phase:"Pressing",formation:"4-3-3",scenario:"Pressing Trap — Wide Channel",context:"Your high press has forced the opposition to play the ball to their left fullback. The fullback has received with their back to goal near the touchline. Your right winger is closing.",question:"What is the team's collective job at this moment to maximise the pressing trap?",options:["The striker drops to block the backward pass, the winger presses, midfielders hold shape","The right winger presses, the striker covers the near CB, and the right CM covers the inside passing lane","All three forwards press simultaneously to overwhelm the fullback","Drop into a mid-block — the press has done its job getting the ball wide"],correct:1,explanation:"A pressing trap is a 3-player mechanism: winger closes to remove time, striker covers the back-pass to near CB, CM cuts off the inside lane. The fullback has no safe outlet — forced into a mistake or risky long ball."},
  {id:12,phase:"Possession",formation:"Receiving",scenario:"Pre-Scanning Before Receiving",context:"A midfielder is about to receive a pass under pressure. Before the ball arrives, they take no visual check of their surroundings. After controlling, they are immediately closed and lose possession.",question:"What is the key technical habit that would have changed the outcome?",options:["Receiving with a heavier first touch to buy distance from the presser","Checking your shoulder 1–2 times before the ball arrives to know what's behind you and plan the next pass","Always moving toward the ball to arrive on the half-turn","Calling for the ball louder so the passer knows to play it into feet"],correct:1,explanation:"Pre-scanning (shoulder checks before receiving) is one of the most studied habits in elite football. It creates a mental picture before the first touch, allowing faster decision-making under pressure."},
  {id:13,phase:"Defending",formation:"High Line",scenario:"Offside Trap Timing",context:"Your team plays a high defensive line. The opposition striker is making a diagonal run from the left channel. The opposition CB is about to play the ball. Your defensive line must decide when to step.",question:"When is the correct moment for the defensive line to step up and spring the offside trap?",options:["As soon as the striker begins their run — cut it off early","The moment the opposition CB begins their kicking motion to play the ball","When the ball is clearly going to go over the top — react to the ball's trajectory","Hold shape and only step when the striker is clearly beyond the last defender"],correct:1,explanation:"The offside trap is triggered at the moment of the pass. Stepping too early means the striker is onside. Stepping too late allows them through. Reading the passer's kicking motion is the key timing cue."},
  {id:14,phase:"Attacking",formation:"Switch of Play",scenario:"When to Switch — Identifying Overloads",context:"Your team has created a 3v2 overload on the left side. The opposition are compacting, pulling four players across. Your right back is unmarked with acres of space on the far side.",question:"What is the trigger moment to switch the play?",options:["Immediately — switch as soon as the overload is created on the left","When the opposition has fully committed four players across and far side space is at maximum — switch through the holding midfielder","Play through the overload on the left first to test the defence before switching","Switch only when a player makes a specific run on the far side to signal they're ready"],correct:1,explanation:"The switch becomes most dangerous when the opposition is fully committed. Switching too early allows recovery. Play through the DM to keep possession secure during the switch."},
  {id:15,phase:"Game Management",formation:"Closing Out a Result",scenario:"Protecting a 1-0 Lead — Final 10 Minutes",context:"Your team leads 1-0 with 10 minutes left. The opposition has pushed their fullbacks forward and is throwing numbers at you. You have just won possession in your own defensive third.",question:"What is the most tactically intelligent decision from the player in possession?",options:["Play direct to the striker immediately to relieve pressure and try to score a second","Clear the ball long — remove the danger first regardless of possession","Carry the ball forward and invite pressure to win a free-kick","Recycle possession calmly through the team, use the goalkeeper as an option, and run down the clock"],correct:3,explanation:"In game management, possession is the weapon. Recycling through the team — including the GK — forces the opposition to chase, expends energy, and uses the clock. Panic clears gift possession back."},
];

/* ═══════════════════════════════════════════════════
   GAME STATE
═══════════════════════════════════════════════════ */
const TOTAL=5, MAX_TIME=20;
let questions=[],qIndex=0,score=0,correct=0,timeLeft=MAX_TIME,timerInterval=null,answered=false;

function shuffle(a){return[...a].sort(()=>Math.random()-.5)}
function pick(){return shuffle(QUESTION_BANK).slice(0,TOTAL)}

function getRating(pct){
  if(pct===100)return{title:"Elite Tactical IQ",desc:"Exceptional reading of the game. You understand football at the highest level — every decision was correct.",color:"#639922"};
  if(pct>=80)return{title:"Advanced Analyst",desc:"Strong tactical awareness across all phases. A few moments to sharpen but your understanding is well above average.",color:"#3b6d11"};
  if(pct>=60)return{title:"Developing Tactician",desc:"Solid foundation in the basics. Work on pressing triggers and positional play to reach the next level.",color:"#ba7517"};
  if(pct>=40)return{title:"Learning the Game",desc:"You're building your tactical vocabulary. Focus on defensive shape and transition principles.",color:"#d85a30"};
  return{title:"Back to the Training Ground",desc:"The game has many layers to discover. Keep studying — every elite player started here.",color:"#e24b4a"};
}

function startTimer(){
  clearInterval(timerInterval);
  timerInterval=setInterval(()=>{
    timeLeft--;updateTimerUI();
    if(timeLeft<=0){clearInterval(timerInterval);if(!answered)autoTimeout();}
  },1000);
}

function autoTimeout(){
  answered=true;
  const q=questions[qIndex];
  document.querySelectorAll('.opt').forEach((btn,i)=>{btn.disabled=true;if(i===q.correct)btn.classList.add('better')});
  showFeedback(false,q);
}

function updateTimerUI(){
  const n=document.getElementById('tnum'),r=document.getElementById('tring');
  if(!n||!r)return;
  n.textContent=timeLeft;
  const circ=2*Math.PI*16;
  r.style.strokeDashoffset=circ*(1-timeLeft/MAX_TIME);
  r.style.stroke=timeLeft<=5?'#e24b4a':timeLeft<=9?'#ef9f27':'#4ade80';
  n.style.color=timeLeft<=5?'#e24b4a':'';
}

function showFeedback(isCorrect,q){
  const fb=document.getElementById('fb'),nb=document.getElementById('nxt');
  if(!fb)return;
  if(isCorrect){
    fb.className='feedback correct';
    fb.innerHTML=`<i class="ti ti-circle-check" style="font-size:17px;flex-shrink:0;margin-top:1px" aria-hidden="true"></i><div><strong>Spot on.</strong> ${q.explanation}</div>`;
  } else {
    fb.className='feedback better';
    fb.innerHTML=`<i class="ti ti-bulb" style="font-size:17px;flex-shrink:0;margin-top:1px" aria-hidden="true"></i><div><strong>Better alternative highlighted.</strong> ${q.explanation}</div>`;
  }
  if(nb)nb.style.display='flex';
}

function selectAnswer(i){
  if(answered)return;
  answered=true;clearInterval(timerInterval);
  const q=questions[qIndex];const ok=i===q.correct;
  if(ok){score+=20;correct++;}
  document.querySelectorAll('.opt').forEach((btn,idx)=>{
    btn.disabled=true;
    if(idx===i&&ok)btn.classList.add('correct');
    else if(idx===i&&!ok)btn.classList.add('chosen');
    if(!ok&&idx===q.correct)btn.classList.add('better');
  });
  showFeedback(ok,q);
}

function nextQuestion(){qIndex++;if(qIndex>=questions.length)showResults();else renderQuestion();}

function renderQuestion(){
  const q=questions[qIndex];
  answered=false;timeLeft=MAX_TIME;
  const animFn=ANIMATIONS[q.id-1]||anim1;
  const circ=2*Math.PI*16;
  const LETTERS=['A','B','C','D'];

  document.getElementById('app').innerHTML=`
    <h2 class="sr-only">Question ${qIndex+1} of ${TOTAL}</h2>
    <div class="hud">
      <div class="progress-wrap"><div class="progress-bar" style="width:${(qIndex/TOTAL)*100}%"></div></div>
      <div style="display:flex;align-items:center;gap:12px">
        <span class="hud-chip">${qIndex+1} / ${TOTAL}</span>
        <div class="timer-ring">
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border-mid)" stroke-width="3"/>
            <circle id="tring" cx="20" cy="20" r="16" fill="none" stroke="#4ade80" stroke-width="3"
              stroke-dasharray="${circ}" stroke-dashoffset="0"
              style="transition:stroke-dashoffset .9s linear;stroke-linecap:round;"/>
          </svg>
          <div class="timer-num" id="tnum">${MAX_TIME}</div>
        </div>
      </div>
    </div>

    <div class="scenario-hero">
      <div class="scenario-tag"><div class="scenario-dot"></div>${q.phase} · ${q.formation}</div>
      <div class="scenario-title">${q.scenario}</div>
      <div class="scenario-context">${q.context}</div>
    </div>

    ${animFn()}

    <div class="question-card">
      <div class="question-label"><i class="ti ti-help-circle" aria-hidden="true" style="font-size:12px;vertical-align:-1px;margin-right:4px"></i>Question</div>
      <div class="question-text">${q.question}</div>
    </div>

    <div class="options-grid">
      ${q.options.map((opt,i)=>`
        <button class="opt" onclick="selectAnswer(${i})" aria-label="Option ${LETTERS[i]}: ${opt}">
          <span class="opt-letter">${LETTERS[i]}</span><span>${opt}</span>
        </button>`).join('')}
    </div>

    <div id="fb" class="feedback" role="alert"></div>
    <button id="nxt" class="primary-btn" onclick="nextQuestion()" style="display:none">
      <i class="ti ${qIndex+1<TOTAL?'ti-arrow-right':'ti-flag-check'}" aria-hidden="true"></i>
      ${qIndex+1<TOTAL?'Next Scenario':'See Final Result'}
    </button>
  `;
  startTimer();
}

function showResults(){
  clearInterval(timerInterval);
  const pct=Math.round((correct/TOTAL)*100);
  const r=getRating(pct);
  document.getElementById('app').innerHTML=`
    <h2 class="sr-only">Quiz results</h2>
    <div class="results-wrap">
      <div class="results-badge"><i class="ti ti-award" aria-hidden="true"></i></div>
      <div class="results-score">${pct}<span class="results-pct">%</span></div>
      <div class="results-label">Tactical IQ Score</div>
      <div class="results-grid">
        <div class="results-stat"><div class="results-stat-num">${correct}/${TOTAL}</div><div class="results-stat-label">Correct</div></div>
        <div class="results-stat"><div class="results-stat-num">${score}</div><div class="results-stat-label">Points</div></div>
        <div class="results-stat"><div class="results-stat-num">${TOTAL-correct}</div><div class="results-stat-label">To Review</div></div>
      </div>
      <div class="rating-bar">
        <div class="rating-title" style="color:${r.color}">${r.title}</div>
        <div class="rating-desc">${r.desc}</div>
      </div>
      <button class="primary-btn" onclick="restartQuiz()">
        <i class="ti ti-refresh" aria-hidden="true"></i>New Session
      </button>
    </div>
  `;
}

function restartQuiz(){questions=pick();qIndex=0;score=0;correct=0;answered=false;renderQuestion();}

function showStart(){
  document.getElementById('app').innerHTML=`
    <h2 class="sr-only">Football Tactical IQ Quiz — Start screen</h2>
    <div class="start-hero">
      <svg style="position:absolute;inset:0;width:100%;height:100%;opacity:.07;pointer-events:none" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
        <rect x="1" y="1" width="398" height="198" rx="0" fill="none" stroke="white" stroke-width="1.5"/>
        <line x1="200" y1="1" x2="200" y2="199" stroke="white" stroke-width="1.5"/>
        <circle cx="200" cy="100" r="35" fill="none" stroke="white" stroke-width="1.5"/>
        <rect x="1" y="60" width="75" height="80" fill="none" stroke="white" stroke-width="1.5"/>
        <rect x="324" y="60" width="75" height="80" fill="none" stroke="white" stroke-width="1.5"/>
        <circle cx="200" cy="100" r="3" fill="white"/>
      </svg>
      <div class="start-emblem"><i class="ti ti-clipboard-list" aria-hidden="true"></i></div>
      <div class="start-title">Tactical IQ<br>Challenge</div>
      <div class="start-sub">Academy football scenarios — test your reading of the game across all phases of play</div>
    </div>
    <div class="info-grid">
      <div class="info-card"><i class="ti ti-stack-2" aria-hidden="true"></i><span class="info-card-val">5</span><div class="info-card-desc">Scenarios per session</div></div>
      <div class="info-card"><i class="ti ti-clock" aria-hidden="true"></i><span class="info-card-val">20s</span><div class="info-card-desc">Per question</div></div>
      <div class="info-card"><i class="ti ti-database" aria-hidden="true"></i><span class="info-card-val">15</span><div class="info-card-desc">Question bank</div></div>
    </div>
    <button class="primary-btn" onclick="startQuiz()">
      <i class="ti ti-player-play" aria-hidden="true"></i>Start Session
    </button>
  `;
}

function startQuiz(){questions=pick();qIndex=0;score=0;correct=0;answered=false;renderQuestion();}

showStart();
</script>
</body>
</html>