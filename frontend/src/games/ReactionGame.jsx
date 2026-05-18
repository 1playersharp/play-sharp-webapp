import { set } from "date-fns";
import { useEffect, useRef, useState, useCallback } from "react";

/**
 * ReactionGame — Enhanced
 *
 * Improvements over original Phaser version:
 *  1. Pure React + Canvas — no Phaser, consistent with ScanningGame / DecisionGame
 *  2. Pitch background with stripes and markings for footballing context
 *  3. Target appears as a glowing circle with pulse animation
 *  4. Countdown ring shrinks around the target — adds urgency without pressure
 *  5. Miss feedback — if you tap and miss, a red ripple shows the target location
 *  6. Reaction time colour coded: ≤220ms green, ≤350ms amber, >350ms red
 *  7. End screen sparkline of all 5 round times
 *  8. Scoring 0–100 consistent with other games (not arbitrary 0–1000)
 *  9. False start shows exactly why (brief overlay, not a camera flash)
 */

const TOTAL_ROUNDS    = 5;
const MIN_WAIT_MS     = 900;
const MAX_WAIT_MS     = 2400;
const TARGET_R        = 28;   // target radius px (on 680-wide canvas)
const MAX_VISIBLE_MS  = 1200; // countdown ring empties after this long
const FALSE_START_PEN = 40;   // ms penalty per false start

const PITCH = { bg: "#0c2e17", stripeA: "#103e1f", stripeB: "#0a2515" };

/* reaction time → colour */
function rtColor(ms) {
  if (ms <= 220) return "#2ead3c";
  if (ms <= 350) return "#f5a623";
  return "#dc1e28";
}


/* ─── Pitch drawing ── */
function drawPitch(ctx, W, H) {
  ctx.fillStyle = PITCH.bg;
  ctx.fillRect(0, 0, W, H);
  const sh = H / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? PITCH.stripeA : PITCH.stripeB;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, i * sh, W, sh);
    ctx.globalAlpha = 1;
  }

  // halfway line + centre circle (subtle)
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 52, 0, Math.PI * 2); ctx.stroke();

  // penalty boxes top + bottom
  const bw = Math.min(320, W * 0.44), bh = 90;
  ctx.strokeRect(W / 2 - bw / 2, 0, bw, bh);
  ctx.strokeRect(W / 2 - bw / 2, H - bh, bw, bh);
}



/* ─── Target (glowing ball) ─── */
function drawTarget(ctx, x, y, progress /* 0→1 ring progress */, pulse) {
  ctx.save();

  // outer glow
  const glow = ctx.createRadialGradient(x, y, TARGET_R * 0.3, x, y, TARGET_R * 2.2);
  glow.addColorStop(0, "rgba(46,173,60,0.35)");
  glow.addColorStop(1, "rgba(46,173,60,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, TARGET_R * 2.2, 0, Math.PI * 2); ctx.fill();

  // main circle — pulse scale
  const sc = 1 + 0.06 * Math.sin(Date.now() / 160);
  ctx.beginPath(); ctx.arc(x, y, TARGET_R * (pulse ? sc : 1), 0, Math.PI * 2);
  ctx.fillStyle = "#2ead3c"; ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.stroke();

  // inner highlight
  ctx.beginPath(); ctx.arc(x - TARGET_R * 0.28, y - TARGET_R * 0.28, TARGET_R * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fill();

  // countdown ring (shrinks from full to empty)
  const angle = -Math.PI / 2;
  const endAngle = angle + Math.PI * 2 * (1 - progress);
  ctx.beginPath();
  ctx.arc(x, y, TARGET_R + 9, angle, endAngle);
  ctx.strokeStyle = progress > 0.7 ? "#dc1e28" : progress > 0.4 ? "#f5a623" : "#2ead3c";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

/* ─── Miss ripple ─── */
function drawMiss(ctx, x, y, age /* 0→1 */) {
  ctx.save();
  ctx.globalAlpha = 1 - age;
  ctx.strokeStyle = "#dc1e28";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, TARGET_R + age * 40, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, TARGET_R * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(220,30,40,0.25)"; ctx.fill();
  ctx.restore();
}

/* ─── Sparkline ─── */
function Sparkline({ times }) {
  const max = Math.max(...times, 600);
  const min = Math.min(...times, 150);
  const W = 220, H = 48;
  const px = (i) => (i / (times.length - 1)) * (W - 20) + 10;
  const py = (t) => H - 8 - ((t - min) / (max - min + 1)) * (H - 16);

  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <polyline
        points={times.map((t, i) => `${px(i)},${py(t)}`).join(" ")}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
      />
      {times.map((t, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(t)} r={4} fill={rtColor(t)} />
          <text x={px(i)} y={py(t) - 8} textAnchor="middle"
            style={{ fontSize: 9, fill: rtColor(t), fontFamily: "JetBrains Mono, monospace" }}>
            {Math.round(t)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function ReactionGame({ onComplete }) {
  const canvasRef  = useRef(null);
  const animRef    = useRef(null);
  const stateRef   = useRef({
    phase: "idle",       // idle | waiting | go | shown | done
    waitStart: 0,
    waitDelay: 0,
    goStart: 0,
    target: { x: 0, y: 0 },
    miss: null,          // { x, y, born } — ripple position
    times: [],
    falseStarts: 0,
    round: 0,
  });

  const [uiState, setUiState] = useState({
    phase: "idle",
    round: 0,
    lastTime: null,
    falseStarts: 0,
    times: [],
    avg: null,
  });

  const W = 680, H = 420;

  /* ── schedule the GO signal ── */
  const scheduleGo = useCallback(() => {
    const st = stateRef.current;
    const delay = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    st.waitStart = performance.now();
    st.waitDelay = delay;
    st.phase = "waiting";
    setUiState(u => ({ ...u, phase: "waiting" }));
  }, []);

  /* ── show target ── */
  const showTarget = useCallback(() => {
    const st = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const margin = TARGET_R + 32;
    const tx = margin + Math.random() * (W - margin * 2);
    const ty = margin + Math.random() * (H - margin * 2);
    st.target = { x: tx, y: ty };
    st.goStart = performance.now();
    st.phase = "go";
    st.miss = null;
    setUiState(u => ({ ...u, phase: "go" }));
  }, []);

  /* ── handle click/tap ── */
  const handleCanvasClick = useCallback((e) => {
    const st = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top)  * scaleY;

    if (st.phase === "idle") {
      scheduleGo();
      return;
    }

    if (st.phase === "waiting") {
      st.falseStarts += 1;
      st.phase = "idle";
      setUiState(u => ({ ...u, phase: "falsestart", falseStarts: st.falseStarts }));
      setTimeout(() => {
        setUiState(u => ({ ...u, phase: "idle" }));
      }, 1200);
      return;
    }

    if (st.phase === "go") {
      const ms = performance.now() - st.goStart;
      const dx = cx - st.target.x, dy = cy - st.target.y;
      const hit = Math.hypot(dx, dy) <= TARGET_R + 14;

      if (!hit) {
        // miss — show ripple at target, still record time
        st.miss = { x: st.target.x, y: st.target.y, born: performance.now() };
      }

      st.times.push(ms);
      st.round += 1;
      st.phase = "shown";

      const newTimes = [...st.times];
      setUiState(u => ({ ...u, phase: "shown", round: st.round, lastTime: ms, times: newTimes }));

      if (st.round >= TOTAL_ROUNDS) {
        setTimeout(() => finishGame(), 1400);
      } else {
        setTimeout(() => {
        // automatically start next scenario
          scheduleGo();
          setUiState(u => ({ 
            ...u, 
            phase: "waiting", 
        }));
        }, 1200);
      }
    }
  }, [scheduleGo]);

  /* ── finish ── */
  const finishGame = useCallback(() => {
    const st = stateRef.current;
    st.phase = "done";
    const avg = st.times.reduce((a,b)=>a+b,0) / st.times.length;
    const adjusted = avg + st.falseStarts * FALSE_START_PEN;
    const clamped = Math.max(200, Math.min(600, adjusted));
    const score = Math.round(((600 - clamped) / 400) * 100);
    setUiState(u => ({ ...u, phase: "done", avg }));
    onComplete?.({ score: Math.max(0, score), reactionTime: avg, falseStarts: st.falseStarts });
  }, [onComplete]);

  /* ── check if waiting period has elapsed ── */
  const checkWait = useCallback(() => {
    const st = stateRef.current;
    if (st.phase === "waiting") {
      const elapsed = performance.now() - st.waitStart;
      if (elapsed >= st.waitDelay) {
        showTarget();
      }
    }
  }, [showTarget]);

  /* ── render loop ── */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const st = stateRef.current;
    const now = performance.now();

    checkWait();
    ctx.clearRect(0, 0, W, H);
    drawPitch(ctx, W, H);

    // target
    if (st.phase === "go") {
      const elapsed = now - st.goStart;
      const progress = Math.min(elapsed / MAX_VISIBLE_MS, 1);
      drawTarget(ctx, st.target.x, st.target.y, progress, true);

      // auto-miss if took too long
      if (elapsed > MAX_VISIBLE_MS + 200 && !st.miss) {
        st.miss = { x: st.target.x, y: st.target.y, born: now };
        st.times.push(MAX_VISIBLE_MS + 200);
        st.round += 1;
        st.phase = "shown";
        const newTimes = [...st.times];
        setUiState(u => ({ ...u, phase: "shown", round: st.round, lastTime: MAX_VISIBLE_MS + 200, times: newTimes }));
        if (st.round >= TOTAL_ROUNDS) setTimeout(finishGame, 1400);
        else setTimeout(() => { scheduleGo(); setUiState(u => ({ ...u, phase: "waiting" })); }, 1200);
      }
    }

    // miss ripple
    if (st.miss) {
      const age = Math.min((now - st.miss.born) / 600, 1);
      drawMiss(ctx, st.miss.x, st.miss.y, age);
      if (age >= 1) st.miss = null;
    }

    // vignette
    const grad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.7);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    animRef.current = requestAnimationFrame(render);
  }, [checkWait, finishGame]);

  /* ── boot ── */
  useEffect(() => {
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  const { phase, round, lastTime, falseStarts, times, avg } = uiState;

  const rtCol = lastTime != null ? rtColor(lastTime) : "#fff";

  return (
    <div style={{ fontFamily:"'JetBrains Mono',monospace", background:"#050e08", borderRadius:8, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)" }}>

      {/* HUD */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 18px", background:"rgba(0,0,0,0.6)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:10, letterSpacing:"0.22em", color:"#dc1e28", textTransform:"uppercase" }}>Reaction Drill</span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>
            ROUND {String(round).padStart(2,"0")} / {String(TOTAL_ROUNDS).padStart(2,"0")}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {lastTime != null && (
            <span style={{ fontSize:12, color: rtCol, fontVariantNumeric:"tabular-nums" }}>
              LAST {Math.round(lastTime)}ms
            </span>
          )}
          {falseStarts > 0 && (
            <span style={{ fontSize:10, color:"#dc1e28" }}>
              ⚠ {falseStarts} FALSE {falseStarts === 1 ? "START" : "STARTS"}
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position:"relative" }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          style={{ display:"block", width:"100%", height:H, cursor: phase==="go"?"crosshair":"pointer" }}
          onClick={handleCanvasClick}
        />

        {/* Idle overlay */}
        {(phase === "idle" || phase === "falsestart") && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <div style={{
              border:`1px solid ${phase==="falsestart"?"#dc1e28":"rgba(255,255,255,0.14)"}`,
              borderLeft:`3px solid ${phase==="falsestart"?"#dc1e28":"#2ead3c"}`,
              background:"rgba(0,0,0,0.84)", padding:"18px 36px", textAlign:"center",
            }}>
              {phase === "falsestart" ? (
                <>
                  <p style={{ fontSize:22, fontWeight:900, color:"#dc1e28", margin:"0 0 6px", textTransform:"uppercase", letterSpacing:"0.04em" }}>False Start</p>
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.4)", margin:0, letterSpacing:"0.18em" }}>Wait for the green circle</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize:22, fontWeight:900, color:"#fff", margin:"0 0 6px", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                    {round === 0 ? "Tap to Start" : "Get Ready"}
                  </p>
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.4)", margin:0, letterSpacing:"0.18em", textTransform:"uppercase",}}>
                    {round === 0 ? "Reaction speed test rounds continnue automatically" : "Next target loading..."}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Waiting overlay */}
        {phase === "waiting" && (
          <div style={{ position:"absolute", top:14, left:"50%", transform:"translateX(-50%)", pointerEvents:"none" }}>
            <div style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.75)", padding:"8px 20px", textAlign:"center" }}>
              <p style={{ fontSize:10, color:"rgba(255,255,255,0.45)", margin:0, letterSpacing:"0.22em", textTransform:"uppercase" }}>
                Wait… don't tap yet
              </p>
            </div>
          </div>
        )}

        {/* Shown — result flash */}
        {phase === "shown" && lastTime != null && (
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none", textAlign:"center" }}>
            <p style={{ fontSize:52, fontWeight:900, color: rtCol, margin:0, lineHeight:1, fontVariantNumeric:"tabular-nums", textShadow:`0 0 24px ${rtCol}` }}>
              {Math.round(lastTime)}
            </p>
            <p style={{ fontSize:10, color:"rgba(255,255,255,0.45)", margin:"4px 0 0", letterSpacing:"0.18em" }}>MS</p>
          </div>
        )}

        {/* Done overlay */}
        {phase === "done" && avg != null && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.82)", backdropFilter:"blur(6px)" }}>
            <div style={{ border:"1px solid rgba(255,255,255,0.08)", borderLeft:`3px solid ${rtColor(avg)}`, background:"#080e0a", padding:"28px 36px", textAlign:"center", maxWidth:360 }}>
              <p style={{ fontSize:9, letterSpacing:"0.25em", color: rtColor(avg), textTransform:"uppercase", margin:"0 0 10px" }}>Drill Complete</p>
              <p style={{ fontSize:48, fontWeight:900, color: rtColor(avg), margin:"0 0 4px", lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
                {Math.round(avg)}ms
              </p>
              <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", margin:"0 0 20px", letterSpacing:"0.14em" }}>
                average · {falseStarts} false {falseStarts===1?"start":"starts"}
              </p>

              {/* Sparkline */}
              <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
                <Sparkline times={times} />
              </div>

              {/* Rating */}
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.6)", margin:0 }}>
                {avg <= 220 ? "Elite reflexes — pro-level reaction." :
                 avg <= 300 ? "Sharp — well above average." :
                 avg <= 380 ? "Solid — typical amateur range." :
                              "Work on anticipation — watch the ball, not the player."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"8px 18px", fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.18em", textTransform:"uppercase" }}>
        <span style={{ color:"#2ead3c" }}>●</span> Tap the green circle as fast as you can · {TOTAL_ROUNDS} rounds
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}