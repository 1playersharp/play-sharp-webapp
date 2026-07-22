import { useEffect, useRef, useState, useCallback } from "react";
import GameStageLayout from "@/components/games/GameStageLayout";

/**
 * MarkingGame — Tight or Touch-Loose? (Foundation tier)
 *
 * You mark a striker while the ball moves around your box. The coaching
 * question: WHEN do you get touch-tight, and when do you give a cushion?
 *
 * The cushion model (what the game teaches):
 *   - Ball FAR + attacker standing        → loose (2–3 gaps): see ball AND man
 *   - Attacker CHECKS SHORT to receive    → touch-tight: kill the turn
 *   - Attacker on your shoulder, ready
 *     to spin IN BEHIND                   → drop half a gap: protect the space
 *   - Ball played toward your man        → INTERCEPT button: step across
 *
 * HYBRID interaction:
 *   - DRAG your defender anywhere (touch/mouse) — live marking.
 *   - INTERCEPT button while a pass is in flight — timing decides outcome.
 */

/* ─── Tokens (match family) ─────────────────────────────────── */
const KIT = {
  home: { fill: "#1e6fd6", stroke: "#fff" },
  opp:  { fill: "#dc1e28", stroke: "#fff" },
  you:  { fill: "#ff7a1f", stroke: "#fff" },
};
const MONO = "'JetBrains Mono', monospace";
const GREEN = "#2ead3c";
const W = 680, H = 520;
const GOAL = { x: W / 2, y: H - 12 };          // you defend the bottom goal
const TIGHT = 34, LOOSE_MIN = 60, LOOSE_MAX = 110, DROP = 78; // px cushions

/* ─── Jersey (same drawing as family, trimmed) ──────────────── */
function drawJersey(ctx, cx, cy, kitKey, isYou, s = 1) {
  const { fill, stroke } = KIT[kitKey];
  const bw = 18 * s, bh = 20 * s, hr = 7 * s;
  const hy = cy - bh * 0.5 - hr * 0.6;
  ctx.save();
  ctx.save(); ctx.scale(1, 0.28);
  ctx.beginPath(); ctx.ellipse(cx, (cy + bh * 0.55) / 0.28, bw * 0.72, bw * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.roundRect(cx - bw / 2, cy - bh * 0.42, bw, bh, 4 * s);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = isYou ? 2 : 1.4; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, hy, hr, 0, Math.PI * 2);
  ctx.fillStyle = "#e8c49a"; ctx.fill(); ctx.stroke();
  if (isYou) {
    ctx.beginPath(); ctx.arc(cx, hy, hr + 4, 0, Math.PI * 2);
    ctx.strokeStyle = KIT.you.fill; ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

/* ─── Scenarios: each is a scripted attacker "movement story" ── */
const SCENARIOS = [
  {
    id: "corner_watch", title: "Ball Far — See Ball AND Man",
    brief: "Ball is out wide. Don't hug your striker — give a cushion so you can watch both.",
    duration: 10, ballFrom: { x: 70, y: 120 },
    timeline: [
      { at: 0, mode: "stand", to: { x: 420, y: 250 } },
      { at: 3.5, mode: "stand", to: { x: 470, y: 300 } },
      { at: 6.5, mode: "pass", passTo: "attacker" },
    ],
  },
  {
    id: "check_short", title: "They Check Short — Get Tight",
    brief: "When your striker drops to receive to feet, be touching them before the ball arrives. No turning.",
    duration: 10, ballFrom: { x: 340, y: 70 },
    timeline: [
      { at: 0, mode: "stand", to: { x: 360, y: 300 } },
      { at: 2.5, mode: "check", to: { x: 340, y: 210 } },
      { at: 5.5, mode: "pass", passTo: "attacker" },
    ],
  },
  {
    id: "spin_behind", title: "On Your Shoulder — Protect Behind",
    brief: "Striker's flat on your shoulder eyeing the space behind. Drop half a yard — take the run away first.",
    duration: 11, ballFrom: { x: 560, y: 90 },
    timeline: [
      { at: 0, mode: "stand", to: { x: 330, y: 330 } },
      { at: 3, mode: "shoulder", to: { x: 330, y: 350 } },
      { at: 6, mode: "spin", to: { x: 360, y: 460 } },
      { at: 6.2, mode: "pass", passTo: "space", spaceAt: { x: 370, y: 440 } },
    ],
  },
  {
    id: "double_move", title: "The Double Move",
    brief: "Check short… then spin. Great strikers sell the first move. Stay balanced — tight, then drop.",
    duration: 12, ballFrom: { x: 160, y: 80 },
    timeline: [
      { at: 0, mode: "stand", to: { x: 380, y: 290 } },
      { at: 2.5, mode: "check", to: { x: 350, y: 200 } },
      { at: 5, mode: "spin", to: { x: 420, y: 450 } },
      { at: 5.3, mode: "pass", passTo: "space", spaceAt: { x: 430, y: 430 } },
    ],
  },
];

const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = t => Math.max(0, Math.min(1, t));

/* ─── Component ─────────────────────────────────────────────── */
export default function MarkingGame({ onComplete }) {
  const canvasRef = useRef(null);
  const interceptRef = useRef(null);   // filled by the sim loop each rep
  const S = useRef(null);
  const [phase, setPhase] = useState("intro");   // intro | live | feedback | done
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const sc = SCENARIOS[idx];

  /* ideal cushion for the attacker's current mode */
  const idealBand = mode =>
    mode === "check" ? [0, TIGHT]
    : mode === "shoulder" || mode === "spin" ? [DROP - 20, DROP + 30]
    : [LOOSE_MIN, LOOSE_MAX];

  const coachFor = (st, outcome) => {
    const worst = Object.entries(st.modeScore)
      .filter(([, v]) => v.t > 0.5)
      .sort((a, b) => a[1].ok / a[1].t - b[1].ok / b[1].t)[0]?.[0];
    const tips = {
      stand: "Ball far away = give a cushion. Split your view — one eye on the ball, one on your striker.",
      check: "When they check short, be TIGHT before the ball arrives. Let them feel you — no turning.",
      shoulder: "Flat on your shoulder means they want the space behind. Drop half a yard and protect it first.",
      spin: "On the spin, your head start comes from the cushion you gave a second earlier.",
    };
    const out = {
      intercept: "You read the pass and stepped across — that's marking turning into defending.",
      contained: "No interception, but you arrived with the ball and denied the turn. Job done.",
      beaten_space: "The ball went in behind you. The cushion was too tight when they were on your shoulder.",
      beaten_turn: "They received and turned — you were too loose when they checked short.",
      late_button: "You went for the interception too late — half a step earlier or stay and contain.",
    };
    const notes = [out[outcome]];
    if (worst && tips[worst]) notes.push(tips[worst]);
    return notes;
  };

  const endScenario = useCallback((outcome) => {
    const st = S.current; if (!st || st.over) return;
    st.over = true;
    // weighted: positioning quality 50 + goal-side 10 + outcome 40
    const posQ = st.tPos > 0 ? st.tPosOk / st.tPos : 0;
    const gsQ = st.tPos > 0 ? st.tGoalSide / st.tPos : 0;
    const outPts = { intercept: 40, contained: 32, late_button: 14, beaten_turn: 8, beaten_space: 8 }[outcome] ?? 0;
    const pts = Math.round(posQ * 50 + gsQ * 10 + outPts);
    const entry = { id: sc.id, title: sc.title, outcome, pts, notes: coachFor(st, outcome) };
    setResults(r => [...r, entry]);
    setFeedback(entry);
    setPhase("feedback");
  }, [sc]);

  /* ── sim + render loop ── */
  useEffect(() => {
    if (phase !== "live") return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const st = S.current = {
      over: false, t0: performance.now(),
      att: { ...sc.timeline[0].to }, mode: "stand",
      you: { x: sc.timeline[0].to.x + 10, y: sc.timeline[0].to.y + LOOSE_MIN },
      ball: { ...sc.ballFrom }, flight: null, buttonUsed: false,
      tPos: 0, tPosOk: 0, tGoalSide: 0,
      modeScore: { stand: { t: 0, ok: 0 }, check: { t: 0, ok: 0 }, shoulder: { t: 0, ok: 0 }, spin: { t: 0, ok: 0 } },
      drag: null, last: performance.now(),
    };

    const toCanvas = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    };
    const down = e => { st.drag = toCanvas(e); canvas.setPointerCapture?.(e.pointerId); };
    const move = e => { if (st.drag) st.drag = toCanvas(e); };
    const up = () => { st.drag = null; };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    const intercept = () => {
      if (st.over || st.buttonUsed) return;
      st.buttonUsed = true;
      if (st.flight) {
        const bp = st.flight.pos;
        const d = dist(st.you, bp);
        if (d < 46 && st.flight.t < 0.85) return endScenario("intercept");
        return endScenario("late_button");
      }
      // pressed with no pass in flight — small cost, keep playing
      st.buttonUsed = false;
    };
    interceptRef.current = intercept;

    let raf;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - st.last) / 1000, 0.05); st.last = now;
      const t = (now - st.t0) / 1000;

      if (!st.over) {
        /* attacker follows the scripted timeline */
        let seg = sc.timeline[0], nextSeg = null;
        for (let i = 0; i < sc.timeline.length; i++) {
          if (t >= sc.timeline[i].at) { seg = sc.timeline[i]; nextSeg = sc.timeline[i + 1]; }
        }
        st.mode = seg.mode === "pass" ? st.mode : seg.mode;
        if (seg.to) {
          const end = nextSeg ? nextSeg.at : sc.duration;
          const p = clamp01((t - seg.at) / Math.max(end - seg.at, 0.1));
          const prev = sc.timeline[sc.timeline.indexOf(seg) - 1]?.to ?? seg.to;
          st.att.x = lerp(prev.x, seg.to.x, p);
          st.att.y = lerp(prev.y, seg.to.y, p);
        }
        /* pass trigger */
        if (seg.mode === "pass" && !st.flight) {
          const target = seg.passTo === "space" ? seg.spaceAt : st.att;
          st.flight = { from: { ...st.ball }, to: { ...target }, t: 0, pos: { ...st.ball }, kind: seg.passTo };
        }
        if (st.flight) {
          st.flight.t += dt / 1.1;
          st.flight.pos.x = lerp(st.flight.from.x, st.flight.to.x, clamp01(st.flight.t));
          st.flight.pos.y = lerp(st.flight.from.y, st.flight.to.y, clamp01(st.flight.t));
          st.ball = st.flight.pos;
          if (st.flight.t >= 1) {
            if (st.flight.kind === "space")
              return endScenario(dist(st.you, st.flight.to) < 55 ? "contained" : "beaten_space");
            return endScenario(dist(st.you, st.att) < TIGHT + 12 ? "contained" : "beaten_turn");
          }
        }

        /* you: drag with speed cap (no teleporting past the striker) */
        if (st.drag) {
          const d = dist(st.you, st.drag);
          const step = Math.min(d, 210 * dt);
          if (d > 1) {
            st.you.x += ((st.drag.x - st.you.x) / d) * step;
            st.you.y += ((st.drag.y - st.you.y) / d) * step;
          }
        }

        /* continuous position scoring */
        const cushion = dist(st.you, st.att);
        const [lo, hi] = idealBand(st.mode);
        const ok = cushion >= lo && cushion <= hi;
        const goalSide = st.you.y > st.att.y - 6 &&
          Math.abs(st.you.x - lerp(st.att.x, GOAL.x, 0.25)) < 70;
        st.tPos += dt; if (ok) st.tPosOk += dt; if (goalSide) st.tGoalSide += dt;
        const m = st.modeScore[st.mode]; if (m) { m.t += dt; if (ok) m.ok += dt; }

        if (t > sc.duration) return endScenario("contained");
      }

      /* ── draw ── */
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0f4d24"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.03)";
        ctx.fillRect(0, i * (H / 8), W, H / 8);
      }
      // box + goal
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 165, H - 132, 330, 132);
      ctx.fillStyle = "#fff"; ctx.fillRect(GOAL.x - 60, H - 10, 120, 6);

      // cushion guide ring around the attacker (the teaching visual)
      const [lo, hi] = idealBand(st.mode);
      ctx.beginPath(); ctx.arc(st.att.x, st.att.y, (lo + hi) / 2, 0, Math.PI * 2);
      ctx.strokeStyle = dist(st.you, st.att) >= lo && dist(st.you, st.att) <= hi
        ? "rgba(46,173,60,0.55)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);

      // ball + pass line
      if (st.flight) {
        ctx.beginPath(); ctx.moveTo(st.flight.from.x, st.flight.from.y);
        ctx.lineTo(st.flight.to.x, st.flight.to.y);
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.setLineDash([3, 5]);
        ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.arc(st.ball.x, st.ball.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1; ctx.stroke();

      drawJersey(ctx, st.att.x, st.att.y, "opp", false, 0.95);
      drawJersey(ctx, st.you.x, st.you.y, "you", true, 1);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      interceptRef.current = null;
    };
  }, [phase, idx, sc, endScenario]);

  const next = () => {
    if (idx + 1 < SCENARIOS.length) { setIdx(i => i + 1); setFeedback(null); setPhase("live"); }
    else {
      const finalResults = results;
      const score = finalResults.length
        ? Math.round(finalResults.reduce((a, r) => a + r.pts, 0) / finalResults.length)
        : 0;
      setPhase("done"); onComplete?.({ score, reps: finalResults });
    }
  };

  const strip = { fontFamily: MONO, background: "rgba(0,0,0,0.85)", borderLeft: `3px solid ${GREEN}`, padding: "10px 16px" };

  const panel = (
    <div style={strip}>
      <p style={{ fontSize: 9, letterSpacing: "0.22em", color: GREEN, margin: "0 0 3px", textTransform: "uppercase" }}>{sc.title}</p>
      <p style={{ fontSize: 11, color: "#ffffffb0", margin: 0, lineHeight: 1.5 }}>{sc.brief}</p>
    </div>
  );

  const canvasWrapper = (
    <>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${W}/${H}`, touchAction: "none" }}
      />
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 14px" }}>
        <button
          onPointerDown={() => interceptRef.current?.()}
          style={{ fontFamily: MONO, fontWeight: 900, fontSize: 15, letterSpacing: "0.14em", padding: "14px 40px", background: "#dc1e28", color: "#fff", border: "2px solid #fff3", cursor: "pointer", touchAction: "none" }}
        >
          INTERCEPT
        </button>
      </div>
    </>
  );

  return (
    <div style={{ fontFamily: MONO, background: "#08160c", border: "1px solid #ffffff12", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #ffffff10" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.22em", color: GREEN, textTransform: "uppercase" }}>Marking — Tight or Loose?</span>
        <span style={{ fontSize: 10, color: "#ffffff55" }}>REP {Math.min(idx + 1, SCENARIOS.length)} / {SCENARIOS.length}</span>
      </div>

      {phase === "intro" && (
        <div style={{ padding: "34px 26px", textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", textTransform: "uppercase", margin: "0 0 10px" }}>Mark The Striker</p>
          <p style={{ fontSize: 12, color: "#ffffff99", lineHeight: 1.7, maxWidth: 460, margin: "0 auto" }}>
            Drag your defender to mark. The dashed ring shows the cushion a coach would want
            RIGHT NOW — it changes as the striker moves. When the pass comes,
            hit <b style={{ color: "#dc1e28" }}>INTERCEPT</b> if you can get there.
            You're scored on decision quality, not just the outcome.
          </p>
          <button onClick={() => setPhase("live")} style={{ marginTop: 16, fontFamily: MONO, fontWeight: 900, fontSize: 13, letterSpacing: "0.1em", padding: "12px 34px", background: GREEN, color: "#08160c", border: "none", cursor: "pointer" }}>START</button>
        </div>
      )}

      {phase === "live" && (
        <div style={{ padding: "10px 12px" }}>
          <GameStageLayout canvas={canvasWrapper} panel={panel} panelSide="above" panelWidth={240} />
        </div>
      )}

      {phase === "feedback" && feedback && (
        <div style={{ padding: "30px 26px", display: "flex", justifyContent: "center" }}>
          <div style={{ maxWidth: 460, width: "100%", borderLeft: `3px solid ${feedback.pts >= 55 ? GREEN : "#dc1e28"}`, background: "#0a1d10", padding: "22px 26px" }}>
            <p style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: feedback.pts >= 55 ? GREEN : "#dc1e28", margin: "0 0 8px" }}>
              {feedback.pts >= 75 ? "Top marking" : feedback.pts >= 55 ? "Solid rep" : "Coach's note"} · {feedback.pts}/100
            </p>
            {feedback.notes.map((n, i) => (
              <p key={i} style={{ fontSize: i === 0 ? 13 : 11, color: i === 0 ? "#ffffffd9" : "#ffffff80", lineHeight: 1.65, margin: "0 0 10px" }}>{n}</p>
            ))}
            <button onClick={next} style={{ marginTop: 6, fontFamily: MONO, fontWeight: 900, fontSize: 12, letterSpacing: "0.1em", padding: "10px 26px", background: GREEN, color: "#08160c", border: "none", cursor: "pointer" }}>
              {idx + 1 < SCENARIOS.length ? "NEXT REP" : "FINISH"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
