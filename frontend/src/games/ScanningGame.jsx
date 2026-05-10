import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * ScanningGame — peripheral awareness drill.
 *
 * Mechanic: 5 rounds. Each round briefly flashes a vertical pitch with
 * players in position (teammates red, opponents black, ball white) for
 * ~1.8 seconds — the "scan window". Then the pitch is blanked and the
 * player answers a single question about what they just saw (A / B / C).
 * Correct answers + speed produce a 0-100 score.
 *
 * Coordinate convention: x [0,1] left→right; y [0,1] TOP (goal we attack)
 * → BOTTOM (own half). Attackers move UP (decreasing y).
 *
 * Props: onComplete({ score, total, correct, avgTime, scans })
 */

const PITCH = { bg: 0x0c2e17, stripeA: 0x103e1f, stripeB: 0x0a2515, line: 0xffffff };
const KIT = {
    home: 0xdc1e28,
    homeStroke: 0xffffff,
    opp: 0x0a0a0a,
    oppStroke: 0xffffff,
    keeper: 0xf4c430,
    keeperStroke: 0x0a0a0a,
    ball: 0xffffff,
};

const SCAN_MS = 1800;

/* ============ Scans — 5 spatial questions ============ */

const SCANS = [
    {
        id: "teammates_ahead",
        title: "Teammates ahead of the ball",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.60, label: "YOU", hasBall: true },
            { id: "t1", kit: "home", x: 0.28, y: 0.40, label: "LM" },
            { id: "t2", kit: "home", x: 0.72, y: 0.42, label: "RM" },
            { id: "t3", kit: "home", x: 0.50, y: 0.32, label: "ST" },
            { id: "t4", kit: "home", x: 0.45, y: 0.78, label: "CM" },
            { id: "o1", kit: "opp", x: 0.30, y: 0.32, label: "LB" },
            { id: "o2", kit: "opp", x: 0.50, y: 0.26, label: "CB" },
            { id: "o3", kit: "opp", x: 0.70, y: 0.32, label: "RB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "How many teammates were ahead of the ball?",
        options: [
            { key: "A", label: "2 teammates" },
            { key: "B", label: "3 teammates", correct: true },
            { key: "C", label: "4 teammates" },
        ],
        explain:
            "Three red shirts ahead of you: LM, RM, ST. CM sits behind the ball and doesn't count.",
    },
    {
        id: "free_teammate_side",
        title: "Location of the unmarked teammate",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.55, label: "YOU", hasBall: true },
            // Left — teammate tightly marked
            { id: "tl", kit: "home", x: 0.22, y: 0.40, label: "LW" },
            { id: "ol_mark", kit: "opp", x: 0.23, y: 0.41, label: "RB" },
            // Centre — teammate tightly marked
            { id: "tc", kit: "home", x: 0.50, y: 0.34, label: "ST" },
            { id: "oc_mark", kit: "opp", x: 0.51, y: 0.33, label: "CB" },
            // Right — teammate FREE (no defender within 12% x)
            { id: "tr", kit: "home", x: 0.78, y: 0.40, label: "RW" },
            { id: "or_mark", kit: "opp", x: 0.58, y: 0.42, label: "LCB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "Which teammate was unmarked?",
        options: [
            { key: "A", label: "Left wing" },
            { key: "B", label: "Centre striker" },
            { key: "C", label: "Right wing", correct: true },
        ],
        explain:
            "The right winger had daylight — the nearest defender (LCB) was two zones away. Both left-wing and striker had a shadow on them.",
    },
    {
        id: "overload_side",
        title: "Numerical overload",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.55, label: "YOU", hasBall: true },
            // Left side: 3 reds vs 1 black = overload
            { id: "tl1", kit: "home", x: 0.18, y: 0.42, label: "LW" },
            { id: "tl2", kit: "home", x: 0.28, y: 0.30, label: "LM" },
            { id: "tl3", kit: "home", x: 0.22, y: 0.62, label: "LB" },
            { id: "ol1", kit: "opp", x: 0.25, y: 0.46, label: "RB" },
            // Right side: 1 red vs 2 black
            { id: "tr1", kit: "home", x: 0.78, y: 0.40, label: "RW" },
            { id: "or1", kit: "opp", x: 0.72, y: 0.42, label: "LB" },
            { id: "or2", kit: "opp", x: 0.80, y: 0.52, label: "LM" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "Which side had the numerical overload?",
        options: [
            { key: "A", label: "Left (3 v 1)", correct: true },
            { key: "B", label: "Centre" },
            { key: "C", label: "Right (1 v 2)" },
        ],
        explain:
            "Left had three red shirts against one black — classic 3-v-1 overload. Right was actually short-handed.",
    },
    {
        id: "defensive_gap",
        title: "Gap in the defensive line",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.62, label: "YOU", hasBall: true },
            { id: "t_st", kit: "home", x: 0.50, y: 0.44, label: "ST" },
            // Defensive line: LB, LCB, RCB, RB — RCB is MISSING (gap between centre and RB)
            { id: "lb", kit: "opp", x: 0.22, y: 0.38, label: "LB" },
            { id: "lcb", kit: "opp", x: 0.42, y: 0.38, label: "LCB" },
            // gap at x≈0.60
            { id: "rb", kit: "opp", x: 0.78, y: 0.38, label: "RB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "Where was the gap in the defensive line?",
        options: [
            { key: "A", label: "Left (between LB/LCB)" },
            { key: "B", label: "Centre-right (between LCB/RB)", correct: true },
            { key: "C", label: "Right (outside RB)" },
        ],
        explain:
            "The RCB was missing — a huge corridor between LCB and RB. That's your through-ball lane.",
    },
    {
        id: "press_outlet",
        title: "Safest outlet under press",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.58, label: "YOU", hasBall: true },
            // 2 opponents pressing you
            { id: "press1", kit: "opp", x: 0.45, y: 0.62, label: "CM" },
            { id: "press2", kit: "opp", x: 0.55, y: 0.54, label: "AM" },
            // Left: teammate is open, defender far
            { id: "left_mate", kit: "home", x: 0.20, y: 0.55, label: "LB" },
            // Centre-back behind you is open
            { id: "cb_behind", kit: "home", x: 0.50, y: 0.80, label: "CB" },
            // Right: teammate is covered tight
            { id: "right_mate", kit: "home", x: 0.80, y: 0.55, label: "RB" },
            { id: "right_marker", kit: "opp", x: 0.78, y: 0.52, label: "LW" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "Two pressers closing you down — where is the safest outlet?",
        options: [
            { key: "A", label: "Back-pass to CB", correct: true },
            { key: "B", label: "Right to RB" },
            { key: "C", label: "Through the press centrally" },
        ],
        explain:
            "The CB behind had acres of space; RB was tightly marked; going through the press is how you give it away.",
    },
];

/* ============ Pitch renderer (reused shape from DecisionGame) ============ */

function drawPitch(scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;

    scene.add.rectangle(w / 2, h / 2, w, h, PITCH.bg);
    const numStripes = 10;
    for (let i = 0; i < numStripes; i++) {
        const stripe = scene.add.rectangle(
            w / 2,
            (h / numStripes) * (i + 0.5),
            w,
            h / numStripes,
            i % 2 === 0 ? PITCH.stripeA : PITCH.stripeB
        );
        stripe.setAlpha(0.55);
    }

    const line = (x1, y1, x2, y2, alpha = 0.3, lw = 2) => {
        const g = scene.add.graphics();
        g.lineStyle(lw, PITCH.line, alpha);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.strokePath();
    };
    line(8, h / 2, w - 8, h / 2);
    scene.add.circle(w / 2, h / 2, 56, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.3);

    const boxW = Math.min(380, w * 0.45);
    const sixW = boxW * 0.42;
    const goalW = boxW * 0.18;

    scene.add.rectangle(w / 2, 60, boxW, 110, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.4);
    scene.add.rectangle(w / 2, 22, sixW, 42, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.5);
    scene.add.circle(w / 2, 76, 2, PITCH.line, 0.7);
    scene.add.rectangle(w / 2 - goalW / 2, 6, 4, 4, PITCH.line);
    scene.add.rectangle(w / 2 + goalW / 2, 6, 4, 4, PITCH.line);
    scene.add.rectangle(w / 2, 8, goalW, 14, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.7);

    scene.add.rectangle(w / 2, h - 60, boxW, 110, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.4);
    scene.add.rectangle(w / 2, h - 22, sixW, 42, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.5);
}

function placePlayer(scene, p, w, h) {
    const kit = p.kit === "keeper" ? KIT.keeper : p.kit === "opp" ? KIT.opp : KIT.home;
    const stroke =
        p.kit === "keeper" ? KIT.keeperStroke : p.kit === "opp" ? KIT.oppStroke : KIT.homeStroke;
    const x = p.x * w;
    const y = p.y * h;
    const container = scene.add.container(x, y);
    const shadow = scene.add.ellipse(0, 12, 26, 8, 0x000000, 0.4);
    const circle = scene.add.circle(0, 0, 14, kit).setStrokeStyle(2, stroke, 0.9);
    const label = scene.add.text(0, -26, p.label, {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "9px",
        color: p.id === "you" ? "#FFFFFF" : "#FFFFFFBB",
        letterSpacing: "0.15em",
    }).setOrigin(0.5);
    container.add([shadow, circle, label]);
    if (p.hasBall) {
        const ball = scene.add.circle(8, -8, 4.5, KIT.ball).setStrokeStyle(1, 0x000000, 0.5);
        container.add(ball);
    }
    return container;
}

/* ============ Component ============ */

export default function ScanningGame({ onComplete }) {
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState("intro"); // intro | scanning | answering | feedback
    const [ready, setReady] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [results, setResults] = useState([]);
    const [done, setDone] = useState(false);
    const completedRef = useRef(false);
    const answerAtRef = useRef(Date.now());

    const sc = SCANS[idx];

    useEffect(() => {
        if (!containerRef.current) return;

        const SCENE = {
            key: "ScanningScene",
            create() {
                this._renderScan = (scanIndex, showPlayers) => {
                    const w = this.scale.width;
                    const h = this.scale.height;
                    this.children.removeAll();
                    drawPitch(this);

                    const s = SCANS[scanIndex];
                    // Title overlay
                    this.add.text(20, 14, s.title, {
                        fontFamily: "'Sofia Sans Extra Condensed', 'Barlow Condensed', sans-serif",
                        fontSize: "22px",
                        fontStyle: "700",
                        color: "#FFFFFF",
                    });
                    this.add.text(20, 42, `SCAN ${scanIndex + 1} / ${SCANS.length}`, {
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        color: "#FFFFFF66",
                    });

                    if (showPlayers) {
                        s.setup.forEach((p) => placePlayer(this, p, w, h));
                    } else {
                        // Curtain — pitch visible, players hidden, "recall" overlay
                        const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.55);
                        dim.setDepth(10);
                        this.add
                            .text(w / 2, h / 2 - 18, "RECALL", {
                                fontFamily: "'Sofia Sans Extra Condensed', sans-serif",
                                fontSize: "48px",
                                fontStyle: "900",
                                color: "#DC1E28",
                                letterSpacing: "0.2em",
                            })
                            .setOrigin(0.5)
                            .setDepth(11);
                        this.add
                            .text(w / 2, h / 2 + 28, "What did you see?", {
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "11px",
                                color: "#FFFFFFAA",
                                letterSpacing: "0.25em",
                            })
                            .setOrigin(0.5)
                            .setDepth(11);
                    }
                };
                this._renderScan(0, true);
            },
        };

        const game = new Phaser.Game({
            type: Phaser.AUTO,
            parent: containerRef.current,
            backgroundColor: "#0A0A0A",
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: containerRef.current?.clientWidth || 800,
                height: 540,
            },
            scene: SCENE,
        });
        gameRef.current = game;

        const handler = (e) => {
            const scene = game.scene.getScene("ScanningScene");
            if (!scene || !scene._renderScan) return;
            const { idx: i, show } = e.detail || {};
            if (typeof i === "number") scene._renderScan(i, !!show);
        };
        window.addEventListener("ps:scanning-redraw", handler);

        return () => {
            window.removeEventListener("ps:scanning-redraw", handler);
            try {
                game.destroy(true);
            } catch (err) {
                /* noop */
            }
            gameRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Drive scan → curtain → answering lifecycle when idx changes and the game is ready.
    useEffect(() => {
        if (!ready) return;

        setPhase("scanning");
        setFeedback(null);
        window.dispatchEvent(new CustomEvent("ps:scanning-redraw", { detail: { idx, show: true } }));

        const t = setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent("ps:scanning-redraw", { detail: { idx, show: false } })
            );
            setPhase("answering");
            answerAtRef.current = Date.now();
        }, SCAN_MS);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, ready]);

    const handlePick = (opt) => {
        if (phase !== "answering") return;
        const ms = Date.now() - answerAtRef.current;
        const correctOpt = sc.options.find((o) => o.correct);
        const isCorrect = !!opt.correct;
        const entry = {
            scanId: sc.id,
            scanTitle: sc.title,
            picked: opt.key,
            pickedLabel: opt.label,
            correct: isCorrect,
            correctKey: correctOpt?.key,
            correctLabel: correctOpt?.label,
            explain: sc.explain,
            ms,
        };
        const next = [...results, entry];
        setResults(next);
        setFeedback(entry);
        setPhase("feedback");

        setTimeout(() => {
            if (idx + 1 < SCANS.length) {
                setIdx(idx + 1);
            } else {
                setDone(true);
                const total = SCANS.length;
                const correct = next.filter((x) => x.correct).length;
                const avgTime = next.reduce((a, b) => a + b.ms, 0) / Math.max(1, next.length);
                // Score = 80 pts from correctness (0..80) + 20 pts from speed (0..20).
                // Speed: 20 at avg≤900ms, 0 at avg≥3500ms (linear).
                const speedClamped = Math.max(900, Math.min(3500, avgTime));
                const speedPts = Math.round((1 - (speedClamped - 900) / 2600) * 20);
                const correctnessPts = Math.round((correct / total) * 80);
                const score = Math.max(0, Math.min(100, correctnessPts + speedPts));
                if (!completedRef.current && typeof onComplete === "function") {
                    completedRef.current = true;
                    onComplete({ score, total, correct, avgTime, scans: next });
                }
            }
        }, 1800);
    };

    return (
        <div data-testid="scanning-game" className="border border-white/10 bg-ps-surface">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
                <div className="flex items-center gap-4">
                    <span className="ps-label">Scanning Drill</span>
                    <span className="font-mono text-xs text-white/60" data-testid="scanning-progress">
                        SCAN {idx + 1} / {SCANS.length}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="ps-label hidden md:inline">Answered</span>
                    <span className="font-mono text-xs text-white" data-testid="scanning-count">
                        {results.length} / {SCANS.length}
                    </span>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={containerRef}
                    data-testid="scanning-game-canvas"
                    className="h-[540px] w-full select-none"
                />

                <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2">
                    <span
                        className={[
                            "inline-block h-1.5 w-1.5 rounded-full",
                            phase === "scanning"
                                ? "animate-pulse bg-ps-red"
                                : phase === "answering"
                                    ? "animate-pulse bg-white"
                                    : "bg-ps-turf",
                        ].join(" ")}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
                        {phase === "intro"
                            ? "Click to start"
                            : phase === "scanning"
                                ? "Scan the pitch…"
                                : phase === "answering"
                                    ? "Recall"
                                    : "Feedback"}
                    </span>
                </div>

                {!ready && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 px-6">
                        <button
                            type="button"
                            onClick={() => setReady(true)}
                            className="max-w-sm rounded-3xl border border-white/10 bg-black/70 px-10 py-10 text-center text-white transition hover:bg-white/10"
                        >
                            <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                                SCANNING GAME
                            </p>
                            <p className="mt-4 text-[2.75rem] font-black uppercase tracking-[0.06em] text-white">
                                Click to continue
                            </p>
                            <p className="mt-4 text-sm uppercase tracking-[0.22em] text-white/60">
                                Review the pitch, then recall key details.
                            </p>
                        </button>
                    </div>
                )}

                {phase === "answering" && (
                    <div
                        data-testid="scanning-question"
                        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/75 to-transparent px-6 pb-6 pt-12"
                    >
                        <p className="ps-label text-ps-red">Question</p>
                        <p className="mt-2 max-w-3xl font-display text-xl font-bold uppercase leading-tight text-white md:text-2xl">
                            {sc.question}
                        </p>
                    </div>
                )}

                {phase === "feedback" && feedback && (
                    <div
                        data-testid="scanning-feedback"
                        className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    >
                        <div
                            className="mx-6 max-w-lg border border-white/15 bg-ps-bg p-8"
                            style={{ borderLeft: `3px solid ${feedback.correct ? "#2EAD3C" : "#DC1E28"}` }}
                        >
                            <p
                                className={[
                                    "ps-label",
                                    feedback.correct ? "text-ps-turf" : "text-ps-red",
                                ].join(" ")}
                                data-testid={feedback.correct ? "scanning-verdict-correct" : "scanning-verdict-wrong"}
                            >
                                {feedback.correct ? "Sharp scan" : "Missed detail"}
                            </p>
                            <p className="mt-3 font-display text-xs uppercase tracking-[0.22em] text-white/40">
                                Your answer · {feedback.picked} — {feedback.pickedLabel}
                            </p>
                            {!feedback.correct && feedback.correctLabel && (
                                <p className="mt-3 font-display text-xs uppercase tracking-[0.22em] text-white/55">
                                    Correct · {feedback.correctKey} — {feedback.correctLabel}
                                </p>
                            )}
                            <p className="mt-4 font-body text-sm leading-relaxed text-white/85">
                                {feedback.explain}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-px border-t border-white/10 bg-white/10 md:grid-cols-3">
                {sc.options.map((o, i) => (
                    <button
                        key={`${idx}-${o.key}`}
                        data-testid={`scanning-option-${o.key}`}
                        onClick={() => handlePick(o)}
                        disabled={phase !== "answering" || done}
                        className={[
                            "group flex items-start gap-3 bg-ps-surface px-5 py-5 text-left transition-colors disabled:cursor-not-allowed",
                            phase === "answering" ? "hover:bg-ps-red/10" : "opacity-45",
                        ].join(" ")}
                    >
                        <span
                            className={[
                                "grid h-8 w-8 flex-none place-items-center border font-display text-sm font-black uppercase",
                                phase === "answering"
                                    ? i === 0
                                        ? "border-ps-red bg-ps-red text-white"
                                        : i === 1
                                            ? "border-white bg-white text-black"
                                            : "border-ps-turf bg-ps-turf text-white"
                                    : "border-white/20 bg-white/5 text-white/60",
                            ].join(" ")}
                        >
                            {o.key}
                        </span>
                        <span className="flex-1 font-display text-sm font-bold uppercase leading-tight tracking-[0.08em] text-white md:text-base">
                            {o.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="border-t border-white/5 px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
                <span className="text-ps-red">●</span> Peripheral awareness · {SCAN_MS}ms scan window per round
            </div>
        </div>
    );
}
