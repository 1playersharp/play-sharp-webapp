import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * ScanningGame — peripheral awareness drill.
 *
 * V1.6:
 *  - Labels sit BELOW the player circle.
 *  - YOU is highlighted in orange.
 *  - Scan window bumped to 5 seconds with a visible countdown overlay.
 *  - Recall answers are presented as 3 clickable BADGES placed on the
 *    curtained pitch in the spatial zone they refer to (left/centre/right,
 *    gap location, outlet target, etc.). No more A/B/C button row.
 *
 * Coord convention: x [0,1] left→right; y [0,1] TOP → BOTTOM.
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
    you: 0xff7a1f,
    youStroke: 0xffffff,
    ball: 0xffffff,
};

const OPT_COLOR = {
    A: 0xdc1e28,
    B: 0xffffff,
    C: 0x2ead3c,
};

const SCAN_MS = 5000;

/* ============ Scans ============ */

const SCANS = [
    {
        id: "teammates_ahead",
        title: "Teammates ahead of the ball",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.60, label: "CM", hasBall: true },
            { id: "t1", kit: "home", x: 0.28, y: 0.40, label: "LM" },
            { id: "t2", kit: "home", x: 0.72, y: 0.42, label: "RM" },
            { id: "t3", kit: "home", x: 0.50, y: 0.32, label: "ST" },
            { id: "t4", kit: "home", x: 0.45, y: 0.78, label: "CB" },
            { id: "o1", kit: "opp", x: 0.30, y: 0.32, label: "LB" },
            { id: "o2", kit: "opp", x: 0.50, y: 0.26, label: "CB" },
            { id: "o3", kit: "opp", x: 0.70, y: 0.32, label: "RB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "How many teammates were ahead of the ball?",
        // Badges spread horizontally in the lower-middle band of the curtain.
        options: [
            { key: "A", label: "2 teammates", short: "2 ahead", badge: { x: 0.25, y: 0.50 } },
            { key: "B", label: "3 teammates", short: "3 ahead", correct: true, badge: { x: 0.50, y: 0.50 } },
            { key: "C", label: "4 teammates", short: "4 ahead", badge: { x: 0.75, y: 0.50 } },
        ],
        explain: "Three red shirts were ahead of you: LM, RM, ST. The CB sits behind the ball and doesn't count.",
    },
    {
        id: "free_teammate_side",
        title: "Location of the unmarked teammate",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.55, label: "CM", hasBall: true },
            { id: "tl", kit: "home", x: 0.22, y: 0.40, label: "LW" },
            { id: "ol_mark", kit: "opp", x: 0.23, y: 0.41, label: "RB" },
            { id: "tc", kit: "home", x: 0.50, y: 0.34, label: "ST" },
            { id: "oc_mark", kit: "opp", x: 0.51, y: 0.33, label: "CB" },
            { id: "tr", kit: "home", x: 0.78, y: 0.40, label: "RW" },
            { id: "or_mark", kit: "opp", x: 0.58, y: 0.42, label: "LCB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "Which teammate was unmarked?",
        options: [
            { key: "A", label: "Left wing", short: "Left wing", badge: { x: 0.22, y: 0.42 } },
            { key: "B", label: "Centre striker", short: "Centre striker", badge: { x: 0.50, y: 0.36 } },
            { key: "C", label: "Right wing", short: "Right wing", correct: true, badge: { x: 0.78, y: 0.42 } },
        ],
        explain: "The right winger had daylight — the nearest defender (LCB) was two zones away. Both left-wing and striker had a shadow on them.",
    },
    {
        id: "overload_side",
        title: "Numerical overload",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.55, label: "CM", hasBall: true },
            { id: "tl1", kit: "home", x: 0.18, y: 0.42, label: "LW" },
            { id: "tl2", kit: "home", x: 0.28, y: 0.30, label: "LM" },
            { id: "tl3", kit: "home", x: 0.22, y: 0.62, label: "LB" },
            { id: "ol1", kit: "opp", x: 0.25, y: 0.46, label: "RB" },
            { id: "tr1", kit: "home", x: 0.78, y: 0.40, label: "RW" },
            { id: "or1", kit: "opp", x: 0.72, y: 0.42, label: "LB" },
            { id: "or2", kit: "opp", x: 0.80, y: 0.52, label: "LM" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "Which side had the numerical overload?",
        options: [
            { key: "A", label: "Left (3 v 1)", short: "Left 3v1", correct: true, badge: { x: 0.22, y: 0.50 } },
            { key: "B", label: "Centre", short: "Centre", badge: { x: 0.50, y: 0.34 } },
            { key: "C", label: "Right (1 v 2)", short: "Right 1v2", badge: { x: 0.80, y: 0.50 } },
        ],
        explain: "Left had three red shirts against one black — classic 3-v-1 overload. Right was actually short-handed.",
    },
    {
        id: "defensive_gap",
        title: "Gap in the defensive line",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.62, label: "CM", hasBall: true },
            { id: "t_st", kit: "home", x: 0.50, y: 0.44, label: "ST" },
            { id: "lb", kit: "opp", x: 0.22, y: 0.38, label: "LB" },
            { id: "lcb", kit: "opp", x: 0.42, y: 0.38, label: "LCB" },
            { id: "rb", kit: "opp", x: 0.78, y: 0.38, label: "RB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "Where was the gap in the defensive line?",
        options: [
            { key: "A", label: "Left (between LB & LCB)", short: "Left gap", badge: { x: 0.30, y: 0.50 } },
            { key: "B", label: "Centre-right (between LCB & RB)", short: "Centre-right gap", correct: true, badge: { x: 0.60, y: 0.50 } },
            { key: "C", label: "Right (outside RB)", short: "Outside RB", badge: { x: 0.88, y: 0.50 } },
        ],
        explain: "The RCB was missing — a huge corridor between LCB and RB. That's your through-ball lane.",
    },
    {
        id: "press_outlet",
        title: "Safest outlet under press",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.58, label: "CM", hasBall: true },
            { id: "press1", kit: "opp", x: 0.45, y: 0.62, label: "CM" },
            { id: "press2", kit: "opp", x: 0.55, y: 0.54, label: "AM" },
            { id: "left_mate", kit: "home", x: 0.20, y: 0.55, label: "LB" },
            { id: "cb_behind", kit: "home", x: 0.50, y: 0.80, label: "CB" },
            { id: "right_mate", kit: "home", x: 0.80, y: 0.55, label: "RB" },
            { id: "right_marker", kit: "opp", x: 0.78, y: 0.52, label: "LW" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        question: "Two pressers closing you down — where is the safest outlet?",
        options: [
            { key: "A", label: "Back-pass to CB", short: "Back to CB", correct: true, badge: { x: 0.50, y: 0.82 } },
            { key: "B", label: "Right to RB", short: "Right to RB", badge: { x: 0.80, y: 0.58 } },
            { key: "C", label: "Through the press centrally", short: "Through middle", badge: { x: 0.20, y: 0.58 } },
        ],
        explain: "The CB behind had acres of space; RB was tightly marked; going through the press is how you give it away.",
    },
];

/* ============ Pitch + player rendering ============ */

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

function getKit(p) {
    if (p.id === "you") return { fill: KIT.you, stroke: KIT.youStroke };
    if (p.kit === "keeper") return { fill: KIT.keeper, stroke: KIT.keeperStroke };
    if (p.kit === "opp") return { fill: KIT.opp, stroke: KIT.oppStroke };
    return { fill: KIT.home, stroke: KIT.homeStroke };
}

function placePlayer(scene, p, w, h) {
    const { fill, stroke } = getKit(p);
    const isYou = p.id === "you";
    const radius = isYou ? 16 : 14;
    const strokeW = isYou ? 3 : 2;

    const x = p.x * w;
    const y = p.y * h;
    const container = scene.add.container(x, y);
    const shadow = scene.add.ellipse(0, 14, 28, 8, 0x000000, 0.4);
    const circle = scene.add.circle(0, 0, radius, fill).setStrokeStyle(strokeW, stroke, 1);

    // Position label BELOW the player, on a dark pill so it stays legible
    // against the pitch. The user's own player is labelled "YOU" in orange.
    const labelTxt = isYou ? "YOU" : p.label;
    const fontSize = isYou ? 13 : 11;
    const pillY = radius + 14;
    const pillW = Math.max(30, labelTxt.length * 8 + 10);
    const pillBg = scene.add
        .rectangle(0, pillY, pillW, 18, 0x000000, 0.78)
        .setStrokeStyle(1, isYou ? KIT.you : 0xffffff, 0.85);
    const label = scene.add
        .text(0, pillY, labelTxt, {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: `${fontSize}px`,
            color: isYou ? "#FF7A1F" : "#FFFFFF",
            fontStyle: "bold",
        })
        .setOrigin(0.5);

    container.add([shadow, circle, pillBg, label]);
    if (p.hasBall) {
        const ball = scene.add.circle(8, -8, 4.5, KIT.ball).setStrokeStyle(1, 0x000000, 0.5);
        container.add(ball);
    }
    return container;
}

function drawOptionBadge(scene, w, h, opt, color, onPick) {
    const bx = opt.badge.x * w;
    const by = opt.badge.y * h;
    const labelTxt = (opt.short || opt.label).toUpperCase();
    // Bigger, clearer badges: taller, larger label text, larger key letter.
    const charW = 10;
    const labelWidth = Math.min(260, labelTxt.length * charW + 18);
    const keyW = 44;
    const totalW = labelWidth + keyW;
    const totalH = 44;
    const badge = scene.add.container(bx, by);

    const bg = scene.add.rectangle(0, 0, totalW, totalH, 0x000000, 0.94).setStrokeStyle(2, color, 1);
    const keyBg = scene.add.rectangle(-totalW / 2 + keyW / 2, 0, keyW, totalH, color, 1);
    const keyText = scene.add
        .text(-totalW / 2 + keyW / 2, 0, opt.key, {
            fontFamily: "'Sofia Sans Extra Condensed', sans-serif",
            fontSize: "24px",
            fontStyle: "900",
            color: opt.key === "B" ? "#000000" : "#FFFFFF",
        })
        .setOrigin(0.5);
    const labelText = scene.add
        .text(keyW / 2 + 4, 0, labelTxt, {
            fontFamily: "'Sofia Sans Extra Condensed', sans-serif",
            fontSize: "18px",
            fontStyle: "800",
            color: "#FFFFFF",
        })
        .setOrigin(0.5);

    badge.add([bg, keyBg, keyText, labelText]);
    badge.setSize(totalW, totalH);
    badge.setDepth(20);
    badge.setInteractive({ useHandCursor: true });
    badge.on("pointerover", () => bg.setFillStyle(color, 0.35));
    badge.on("pointerout", () => bg.setFillStyle(0x000000, 0.94));
    badge.on("pointerdown", () => onPick(opt));
    return badge;
}

/* ============ Component ============ */

export default function ScanningGame({ onComplete }) {
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const onPickRef = useRef(() => {});
    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState("scanning"); // scanning | answering | feedback
    const [feedback, setFeedback] = useState(null);
    const [results, setResults] = useState([]);
    const [done, setDone] = useState(false);
    const [countdown, setCountdown] = useState(Math.ceil(SCAN_MS / 1000));
    const completedRef = useRef(false);
    const answerAtRef = useRef(Date.now());

    const sc = SCANS[idx];

    useEffect(() => {
        if (!containerRef.current) return;

        const SCENE = {
            key: "ScanningScene",
            create() {
                this._renderScan = (scanIndex, mode /* "scan" | "recall" */) => {
                    const w = this.scale.width;
                    const h = this.scale.height;
                    this.children.removeAll();
                    drawPitch(this);

                    const s = SCANS[scanIndex];
                    // Title + counter live in a centered React overlay during the
                    // scan phase, and as a small top-left tag during recall.
                    if (mode === "recall") {
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
                    }

                    if (mode === "scan") {
                        s.setup.forEach((p) => placePlayer(this, p, w, h));
                    } else {
                        // Recall: dim the pitch then drop clickable answer badges.
                        const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.55);
                        dim.setDepth(10);
                        this.add
                            .text(w / 2, h / 2 - 60, "RECALL", {
                                fontFamily: "'Sofia Sans Extra Condensed', sans-serif",
                                fontSize: "40px",
                                fontStyle: "900",
                                color: "#DC1E28",
                                letterSpacing: "0.2em",
                            })
                            .setOrigin(0.5)
                            .setDepth(11);
                        this.add
                            .text(w / 2, h / 2 - 24, "Pick the badge that matches what you saw", {
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "10px",
                                color: "#FFFFFFAA",
                                letterSpacing: "0.2em",
                            })
                            .setOrigin(0.5)
                            .setDepth(11);

                        s.options.forEach((opt) => {
                            drawOptionBadge(this, w, h, opt, OPT_COLOR[opt.key], (chosen) => {
                                onPickRef.current(chosen);
                            });
                        });
                    }
                };
                this._renderScan(0, "scan");
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
            const { idx: i, mode } = e.detail || {};
            if (typeof i === "number") scene._renderScan(i, mode || "scan");
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

    // Drive scan → recall → answering lifecycle.
    useEffect(() => {
        setPhase("scanning");
        setFeedback(null);
        setCountdown(Math.ceil(SCAN_MS / 1000));
        window.dispatchEvent(new CustomEvent("ps:scanning-redraw", { detail: { idx, mode: "scan" } }));

        const tick = setInterval(() => {
            setCountdown((c) => (c > 0 ? c - 1 : 0));
        }, 1000);

        const t = setTimeout(() => {
            window.dispatchEvent(new CustomEvent("ps:scanning-redraw", { detail: { idx, mode: "recall" } }));
            setPhase("answering");
            answerAtRef.current = Date.now();
        }, SCAN_MS);

        return () => {
            clearInterval(tick);
            clearTimeout(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx]);

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
    onPickRef.current = handlePick;

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
                        {phase === "scanning" ? "Scan the pitch…" : phase === "answering" ? "Recall" : "Feedback"}
                    </span>
                </div>

                {/* Centered scan banner — title + giant countdown so the user
                    immediately sees what they're scanning for and how long
                    they have. Visible only during the scan window. */}
                {phase === "scanning" && (
                    <div
                        data-testid="scanning-countdown"
                        className="pointer-events-none absolute inset-x-0 top-12 flex flex-col items-center"
                    >
                        <div className="mx-auto flex max-w-2xl flex-col items-center border border-white/20 bg-black/75 px-8 py-5 backdrop-blur-sm">
                            <p className="ps-label text-ps-red">
                                Scan {idx + 1} / {SCANS.length} · Memorise the pitch
                            </p>
                            <p className="mt-2 text-center font-display text-2xl font-black uppercase leading-tight text-white md:text-3xl">
                                {sc.title}
                            </p>
                            <div className="mt-3 flex items-baseline gap-3">
                                <span
                                    data-testid="scanning-countdown-value"
                                    className="font-display text-7xl font-black tabular-nums leading-none text-ps-red"
                                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
                                >
                                    {countdown}
                                </span>
                                <span className="font-mono text-xs uppercase tracking-[0.22em] text-white/60">
                                    seconds left
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {phase === "answering" && (
                    <div
                        data-testid="scanning-question"
                        className="pointer-events-none absolute inset-x-0 top-12 px-6"
                    >
                        <div className="mx-auto max-w-3xl border border-white/15 bg-black/65 px-5 py-3 backdrop-blur-sm">
                            <p className="ps-label text-ps-red">Question</p>
                            <p className="mt-1 font-display text-base font-bold uppercase leading-tight text-white md:text-lg">
                                {sc.question}
                            </p>
                        </div>
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

            <div className="border-t border-white/5 px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
                <span className="text-ps-red">●</span> Peripheral awareness · 5-second scan window · click a badge to answer
            </div>

            {/* Off-screen sentinel buttons keep test selectors stable. */}
            <div className="sr-only">
                {sc.options.map((o) => (
                    <button
                        key={o.key}
                        data-testid={`scanning-option-${o.key}`}
                        onClick={() => handlePick(o)}
                        disabled={phase !== "answering" || done}
                    >
                        {o.key} — {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}