import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * DecisionGame — vertical pitch, attacking UPWARD toward the goal at the top.
 *
 * Coordinate convention:
 *   x in [0, 1]  — left → right
 *   y in [0, 1]  — TOP (goal we're attacking) → BOTTOM (own half)
 *
 * Defenders sit between attackers and the top goal (small y).
 * Attackers run UP (decreasing y) toward goal.
 *
 * Offside line is drawn as a horizontal red dashed line at the y-coordinate of
 * the second-last opposition player — i.e. the deepest outfield defender
 * (excluding the keeper, who is closest to y=0). Attackers must be at y >= the
 * offside line at the moment the ball is played to be onside.
 *
 * Props: onComplete({ score, total, avgTime, decisions })
 *
 * Scenarios are strictly advisory — each option carries a reason, and one option
 * is flagged with `recommended: true` (the coach's preferred call). The game
 * never labels a user's pick as "correct" or "wrong".
 */

const PITCH = { bg: 0x0c2e17, stripeA: 0x103e1f, stripeB: 0x0a2515, line: 0xffffff };
const KIT = {
    home: 0xdc1e28, // YOU + teammates — red
    homeStroke: 0xffffff,
    opp: 0x0a0a0a, // opponents — black
    oppStroke: 0xffffff,
    keeper: 0xf4c430, // yellow keeper kit
    keeperStroke: 0x0a0a0a,
    ball: 0xffffff,
};

/* ============ Scenarios — vertical, offside-respecting ============ */

const SCENARIOS = [
    {
        id: "channel_runner",
        title: "Channel Runner",
        subtitle: "Striker bending from onside into the channel between LB and LCB",
        // YOU at center playing the ball, striker bending in from onside
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.62, label: "YOU", hasBall: true },
            { id: "striker", kit: "home", x: 0.34, y: 0.50, label: "ST" },
            { id: "winger", kit: "home", x: 0.78, y: 0.55, label: "RW" },
            { id: "lb", kit: "opp", x: 0.20, y: 0.42, label: "LB" },
            { id: "lcb", kit: "opp", x: 0.40, y: 0.40, label: "LCB" },
            { id: "rcb", kit: "opp", x: 0.60, y: 0.40, label: "RCB" },
            { id: "rb", kit: "opp", x: 0.80, y: 0.42, label: "RB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        // Offside line drawn at y of deepest outfield defender (max y among LB/LCB/RCB/RB)
        offside: { y: 0.42 },
        anim: [
            // striker bends his run: starts onside (y=0.50 > 0.42), curves into channel ending behind line (y=0.32)
            { id: "striker", path: [{ x: 0.31, y: 0.46 }, { x: 0.29, y: 0.43 }, { x: 0.31, y: 0.42 }], duration: 1800 },
            // winger holds wide
            { id: "winger", to: { x: 0.80, y: 0.50 }, duration: 1800 },
        ],
        question: "Striker is bending into the channel between LB and LCB — he was onside when the run started.",
        options: [
            {
                key: "A",
                label: "Slide a through-ball into the channel",
                recommended: true,
                reason: "He started behind the back line and bent his run perfectly. Ball into the corridor between LB and LCB — he runs onto it the right side of the offside trap.",
            },
            {
                key: "B",
                label: "Square pass to the right winger",
                reason: "Winger is wide but stationary — square balls don't beat the line. Striker's curved run is the higher-value option.",
            },
            {
                key: "C",
                label: "Hold the ball and let CMs join",
                reason: "Kills the timing. The runner timed his bend off your body shape — wait too long and the LCB recovers the channel.",
            },
        ],
    },
    {
        id: "wide_overload",
        title: "Wide Overload",
        subtitle: "Their full-back stepped out, your overlap is sprinting in behind",
        setup: [
            { id: "you", kit: "home", x: 0.22, y: 0.45, label: "YOU", hasBall: true },
            { id: "fb_overlap", kit: "home", x: 0.22, y: 0.62, label: "LB" }, // your overlapping full-back
            { id: "ifw", kit: "home", x: 0.42, y: 0.42, label: "IF" }, // inside forward
            { id: "striker", kit: "home", x: 0.55, y: 0.30, label: "ST" }, // striker (onside, just behind line)
            { id: "opp_fb", kit: "opp", x: 0.22, y: 0.38, label: "RB" },
            { id: "opp_lcb", kit: "opp", x: 0.42, y: 0.34, label: "LCB" },
            { id: "opp_rcb", kit: "opp", x: 0.58, y: 0.34, label: "RCB" },
            { id: "opp_lb", kit: "opp", x: 0.78, y: 0.36, label: "LB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        // Once their RB engages the ball, deepest outfield defender becomes the LB at y=0.36
        offside: null,
        anim: [
            // their RB steps OUT to engage ball (moves down/wide toward YOU)
            { id: "opp_fb", to: { x: 0.19, y: 0.44 }, duration: 900 },
            // your overlapping full-back sprints up the wing into the gap (still onside)
            { id: "fb_overlap", to: { x: 0.20, y: 0.37 }, duration: 1600, delay: 180 },
            // CBs hold their depth — the inside forward checks short
            { id: "ifw", to: { x: 0.39, y: 0.44 }, duration: 1100, delay: 120 },
            // striker holds the shoulder of the CBs instead of drifting early
            { id: "striker", to: { x: 0.55, y: 0.31 }, duration: 1300 },
        ],
        question: "Their right-back has committed to the ball. Your LB is overlapping into the gap.",
        options: [
            {
                key: "A",
                label: "Slip it inside the RB to your overlapping LB",
                recommended: true,
                reason: "Classic 2v1. RB has bitten, CBs are holding shape — your full-back arrives with momentum into a gold-channel cross opportunity.",
            },
            {
                key: "B",
                label: "Cross immediately into the box",
                reason: "Premature. You're not at the byline yet and the angle is too tight. Use the overlap first to break the line, then cross.",
            },
            {
                key: "C",
                label: "Drive infield with the ball",
                reason: "Both centre-backs are holding compact — driving inside walks straight into them. The free space is on the outside.",
            },
        ],
    },
    {
        id: "defensive_shape",
        title: "Defensive Shape",
        subtitle: "Compact back four. Striker is onside, threatening depth.",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.70, label: "YOU", hasBall: true },
            { id: "striker", kit: "home", x: 0.50, y: 0.42, label: "ST" }, // onside (y=0.42 > 0.38 line)
            { id: "lw", kit: "home", x: 0.20, y: 0.55, label: "LW" },
            { id: "rw", kit: "home", x: 0.80, y: 0.55, label: "RW" },
            { id: "opp_lb", kit: "opp", x: 0.30, y: 0.38, label: "LB" },
            { id: "opp_lcb", kit: "opp", x: 0.44, y: 0.38, label: "LCB" },
            { id: "opp_rcb", kit: "opp", x: 0.56, y: 0.38, label: "RCB" },
            { id: "opp_rb", kit: "opp", x: 0.70, y: 0.38, label: "RB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        offside: { y: 0.38 },
        anim: [
            // striker bursts depth from onside — runs from y=0.42 (onside) down to y=0.30 (behind line)
            { id: "striker", path: [{ x: 0.49, y: 0.41 },{ x: 0.50, y: 0.39 }, { x: 0.52, y: 0.37}, ], duration: 1400 },
            // back line steps up slightly trying to catch him (compact)
            { id: "opp_lb", to: { x: 0.30, y: 0.39 }, duration: 900, delay: 120 },
            { id: "opp_lcb", to: { x: 0.44, y: 0.39 }, duration: 900, delay: 120 },
            { id: "opp_rcb", to: { x: 0.56, y: 0.39 }, duration: 900, delay: 120 },
            { id: "opp_rb", to: { x: 0.70, y: 0.39 }, duration: 900, delay: 120 },
            // wide players narrow slightly to support the central action
            { id: "lw", to: { x: 0.24, y: 0.52 }, duration: 1200 },
            { id: "rw", to: { x: 0.76, y: 0.52 }, duration: 1200 },
        ],
        question: "Compact line. Your striker timed his depth run from onside.",
        options: [
            {
                key: "A",
                label: "Drive a low through-ball before the line resets",
                recommended: true,
                reason: "Striker started onside and burst depth as the line stepped late. Low first-time vertical ball — he's onto it before they recover.",
            },
            {
                key: "B",
                label: "Switch wide to the winger",
                reason: "Wastes the central momentum. Switching gives the back four time to drop with the striker and reset the offside trap.",
            },
            {
                key: "C",
                label: "Hold and wait for the line to drop",
                reason: "Compact lines don't drop — they hold and rely on stepping. Your moment is now, not later.",
            },
        ],
    },
    {
        id: "winger_in_box",
        title: "Winger in the Box",
        subtitle: "Three runners attacking near-post, penalty spot, and far-post",
        setup: [
            { id: "you", kit: "home", x: 0.82, y: 0.18, label: "YOU", hasBall: true }, // winger near byline
            { id: "near", kit: "home", x: 0.42, y: 0.10, label: "NEAR" }, // near-post run (close to GK side)
            { id: "spot", kit: "home", x: 0.50, y: 0.16, label: "SPOT" }, // penalty spot
            { id: "far", kit: "home", x: 0.66, y: 0.12, label: "FAR" }, // far-post arrival
            { id: "opp_cb1", kit: "opp", x: 0.46, y: 0.13, label: "CB" },
            { id: "opp_cb2", kit: "opp", x: 0.55, y: 0.13, label: "CB" },
            { id: "opp_fb", kit: "opp", x: 0.78, y: 0.20, label: "FB" }, // tracking YOU
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        // GK is highest (y=0.06). Outfield defenders at y around 0.13–0.20.
        // Don't draw an offside line in the box scenario — too many bodies / not relevant.
        offside: null,
        anim: [
            // YOU continues toward byline
            { id: "you", to: { x: 0.87, y: 0.12 }, duration: 1200 },
            // near-post runner attacks 6-yard box
            { id: "near", to: { x: 0.44, y: 0.08 }, duration: 1200, delay: 120 },
            // spot runner arrives on penalty spot
            { id: "spot", to: { x: 0.51, y: 0.14 }, duration: 1350, delay: 220 },
            // far-post runner arrives at back stick
            { id: "far", path: [{ x: 0.64, y: 0.10 },{ x: 0.66, y: 0.09},{ x: 0.68, y: 0.08},], duration: 1450, delay: 320 },

            // defenders recover toward the danger zone
            { id: "opp_cb1", to: { x: 0.47, y: 0.12 }, duration: 1200 },
            { id: "opp_cb2", to: { x: 0.56, y: 0.12 }, duration: 1200 },
            { id: "opp_fb", to: { x: 0.81, y: 0.18 }, duration: 1200 },
        ],
        question: "You're at the byline. Three runners — near-post, spot, far-post — are arriving.",
        options: [
            {
                key: "A",
                label: "Whip across the 6-yard line for the near-post run",
                recommended: true,
                reason: "Near-post run attacks the highest-percentage zone. Whipped ball across the 6-yard line is hardest to defend — keeper rooted, defender beaten by the angle.",
            },
            {
                key: "B",
                label: "Cut back to the penalty spot",
                reason: "Decent option — but slower and lets the keeper reset. Near-post is the elite finish here.",
            },
            {
                key: "C",
                label: "Float a cross to the far-post runner",
                reason: "Lower-percentage. The far-post arrival is late and the ball loses pace — a hung cross gives the GK time to claim or punch.",
            },
        ],
    },
];

/* ============ Helpers ============ */

function drawPitch(scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;

    // Base pitch + horizontal stripes (since attack runs vertically, stripes are horizontal)
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

    const line = (x1, y1, x2, y2, alpha = 0.35, lw = 2) => {
        const g = scene.add.graphics();
        g.lineStyle(lw, PITCH.line, alpha);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.strokePath();
    };

    // Halfway line (horizontal, mid-height)
    line(8, h / 2, w - 8, h / 2, 0.3);
    // Centre circle
    scene.add.circle(w / 2, h / 2, 56, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.3);

    // Top goal area (we're attacking up — goal at top, keeper here)
    const boxW = Math.min(380, w * 0.45);
    const sixW = boxW * 0.42;
    const goalW = boxW * 0.18;

    // 18-yard box
    scene.add
        .rectangle(w / 2, 60, boxW, 110, 0x000000, 0)
        .setStrokeStyle(2, PITCH.line, 0.4);
    // 6-yard box
    scene.add
        .rectangle(w / 2, 22, sixW, 42, 0x000000, 0)
        .setStrokeStyle(2, PITCH.line, 0.5);
    // Penalty spot
    scene.add.circle(w / 2, 76, 2, PITCH.line, 0.7);
    // D-arc
    const arc = scene.add.graphics();
    arc.lineStyle(2, PITCH.line, 0.35);
    arc.beginPath();
    arc.arc(w / 2, 76, 48, Math.PI * 0.18, Math.PI - Math.PI * 0.18, true);
    arc.strokePath();
    // Goal posts (top)
    scene.add.rectangle(w / 2 - goalW / 2, 6, 4, 4, PITCH.line);
    scene.add.rectangle(w / 2 + goalW / 2, 6, 4, 4, PITCH.line);
    // Goal frame
    scene.add
        .rectangle(w / 2, 8, goalW, 14, 0x000000, 0)
        .setStrokeStyle(2, PITCH.line, 0.7);

    // Bottom goal area (mirror — own goal, just for completeness)
    scene.add
        .rectangle(w / 2, h - 60, boxW, 110, 0x000000, 0)
        .setStrokeStyle(2, PITCH.line, 0.4);
    scene.add
        .rectangle(w / 2, h - 22, sixW, 42, 0x000000, 0)
        .setStrokeStyle(2, PITCH.line, 0.5);

    // Attack-direction arrow (subtle, on left edge)
    const arrowG = scene.add.graphics();
    arrowG.lineStyle(2, 0xdc1e28, 0.55);
    arrowG.lineBetween(20, h - 80, 20, 110);
    arrowG.lineBetween(15, 120, 20, 110);
    arrowG.lineBetween(25, 120, 20, 110);
    scene.add
        .text(20, h - 60, "ATTACK", {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9px",
            color: "#DC1E28",
            letterSpacing: "0.2em",
        })
        .setOrigin(0.5, 0);
}

function drawOffsideLine(scene, yRel) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const y = yRel * h;

    const g = scene.add.graphics();
    g.lineStyle(2, 0xdc1e28, 0.7);
    // dashed
    const dashLen = 14;
    const gap = 6;
    let x = 8;
    while (x < w - 8) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(Math.min(x + dashLen, w - 8), y);
        g.strokePath();
        x += dashLen + gap;
    }
    // label
    const label = scene.add
        .text(w - 12, y - 6, "OFFSIDE LINE", {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9px",
            color: "#DC1E28",
            letterSpacing: "0.2em",
        })
        .setOrigin(1, 1);
    return { graphics: g, label: label };
}

function updateOffsideLine(scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const defenders = Object.values(scene._players).filter(p => p.getData('kit') === 'opp' && p.getData('id') !== 'gk');
    if (defenders.length === 0) return;
    const maxY = Math.max(...defenders.map(p => p.y / h));
    const y = maxY * h;

    // clear previous
    scene._offsideGraphics.clear();
    // redraw
    scene._offsideGraphics.lineStyle(2, 0xdc1e28, 0.7);
    const dashLen = 14;
    const gap = 6;
    let x = 8;
    while (x < w - 8) {
        scene._offsideGraphics.beginPath();
        scene._offsideGraphics.moveTo(x, y);
        scene._offsideGraphics.lineTo(Math.min(x + dashLen, w - 8), y);
        scene._offsideGraphics.strokePath();
        x += dashLen + gap;
    }
    // update label
    scene._offsideLabel.y = y - 6;
}

function placePlayer(scene, p, w, h) {
    const kit =
        p.kit === "keeper"
            ? KIT.keeper
            : p.kit === "opp"
                ? KIT.opp
                : KIT.home;
    const stroke =
        p.kit === "keeper"
            ? KIT.keeperStroke
            : p.kit === "opp"
                ? KIT.oppStroke
                : KIT.homeStroke;

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
    container.setData("playerId", p.id);
    container.setData("kit", p.kit);

    if (p.hasBall) {
        // ball just in front of player (toward attacking direction = upward)
        const ball = scene.add.circle(8, -8, 4.5, KIT.ball).setStrokeStyle(1, 0x000000, 0.5);
        container.add(ball);
    }

    return container;
}

/* ============ Component ============ */

export default function DecisionGame({ onComplete }) {
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState("intro"); // intro | animating | deciding | feedback
    const [ready, setReady] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [results, setResults] = useState([]);
    const [pendingResults, setPendingResults] = useState([]);
    const [done, setDone] = useState(false);
    const completedRef = useRef(false);
    const decideAtRef = useRef(Date.now());

    const sc = SCENARIOS[idx];

    useEffect(() => {
        if (!containerRef.current) return;

        const SCENE = {
            key: "DecisionScene",
            create() {
                this._players = {};
                this._renderScenario = (scenarioIndex) => {
                    const w = this.scale.width;
                    const h = this.scale.height;
                    this.children.removeAll();
                    this.tweens.killAll();
                    this._players = {};

                    const s = SCENARIOS[scenarioIndex];
                    drawPitch(this);

                    // Offside line (under players)
                    const getOffsideLine = (setup) => {
                        const defenders = setup.filter(
                            (p) => p.kit === "opp" && p.id !== "gk"
                        );
                        return Math.max(...defenders.map((d) => d.y));
                    };

                    s.setup.forEach((p) => {
                        this._players[p.id] = placePlayer(this, p, w, h);
                    });

                    if (s.offside) {
                        const offsideY = getOffsideLine(s.setup);
                        const { graphics, label } = drawOffsideLine(this, offsideY);
                        this._offsideGraphics = graphics;
                        this._offsideLabel = label;
                    }

                    // Title overlay
                    this.add.text(20, 14, s.title, {
                        fontFamily: "'Sofia Sans Extra Condensed', 'Barlow Condensed', sans-serif",
                        fontSize: "22px",
                        fontStyle: "700",
                        color: "#FFFFFF",
                    });
                    this.add.text(20, 42, `SCENARIO ${scenarioIndex + 1} / ${SCENARIOS.length}`, {
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        color: "#FFFFFF66",
                    });

                    // Fire animation after a short delay
                    this.time.delayedCall(400, () => {
                        s.anim.forEach((step) => {
                            const target = this._players[step.id];
                            if (!target) return;
                            if (step.path && Array.isArray(step.path)) {
                                // Curved path via timeline of tweens
                                const segDur = step.duration / step.path.length;
                                step.path.forEach((pt, i) => {
                                    this.tweens.add({
                                        targets: target,
                                        x: pt.x * w,
                                        y: pt.y * h,
                                        duration: segDur,
                                        ease: "Linear",
                                        delay: (step.delay || 0) + i * segDur,
                                        onUpdate: () => { if (this._offsideGraphics) updateOffsideLine(this); },
                                    });
                                });
                            } else if (step.to) {
                                this.tweens.add({
                                    targets: target,
                                    x: step.to.x * w,
                                    y: step.to.y * h,
                                    duration: step.duration,
                                    ease: "Linear",
                                    delay: step.delay || 0,
                                    onUpdate: () => { if (this._offsideGraphics) updateOffsideLine(this); },
                                });
                            }
                        });
                    });
                };
                this._renderScenario(0);
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
            const scene = game.scene.getScene("DecisionScene");
            if (scene && typeof e.detail?.idx === "number" && scene._renderScenario) {
                scene._renderScenario(e.detail.idx);
            }
        };
        window.addEventListener("ps:decision-redraw", handler);

        return () => {
            window.removeEventListener("ps:decision-redraw", handler);
            try {
                game.destroy(true);
            } catch (err) {
                /* noop */
            }
            gameRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Drive scenario → animation → deciding lifecycle when idx changes and the game is ready.
    useEffect(() => {
        if (!ready) return;

        setPhase("animating");
        setFeedback(null);
        window.dispatchEvent(new CustomEvent("ps:decision-redraw", { detail: { idx } }));

        const maxDur = Math.max(420, ...sc.anim.map((a) => a.duration));
        const t = setTimeout(() => {
            setPhase("deciding");
            decideAtRef.current = Date.now();
        }, maxDur + 350);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, ready]);

    const handlePick = (opt) => {
        if (phase !== "deciding") return;
        const ms = Date.now() - decideAtRef.current;
        const recommended = sc.options.find((o) => o.recommended);
        const entry = {
            scenarioId: sc.id,
            scenarioTitle: sc.title,
            picked: opt.key,
            pickedLabel: opt.label,
            pickedReason: opt.reason,
            recommendedKey: recommended?.key,
            recommendedLabel: recommended?.label,
            recommendedReason: recommended?.reason,
            matchesRecommended: recommended ? recommended.key === opt.key : false,
            ms,
        };
        const next = [...results, entry];
        setResults(next);
        setPendingResults(next);
        setFeedback({ option: opt, picked: opt.key, label: opt.label, reason: opt.reason });
        setPhase("feedback");
    };

    const handleContinue = () => {
        if (idx + 1 < SCENARIOS.length) {
            setIdx(idx + 1);
            return;
        }

        setDone(true);

        const finalResults = pendingResults;
        const total = SCENARIOS.length;
        const avgTime =
            finalResults.reduce((a, b) => a + b.ms, 0) /
            Math.max(1, finalResults.length);

        const matchesCoach =
            finalResults.filter((d) => d.matchesRecommended).length;

        const avgClamped = Math.max(800, Math.min(3200, avgTime));

        const score = Math.round(
            100 - ((avgClamped - 800) / 2400) * 50
        );

        if (!completedRef.current && typeof onComplete === "function") {
            completedRef.current = true;

            onComplete({
                score,
                total,
                avgTime,
                matchesCoach,
                decisions: finalResults,
            });
        }
    };


    const recommendedOption = sc.options.find((o) => o.recommended);

    return (
        <div data-testid="decision-game" className="border border-white/10 bg-ps-surface">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
                <div className="flex items-center gap-4">
                    <span className="ps-label">Decision Drill</span>
                    <span className="font-mono text-xs text-white/60" data-testid="decision-progress">
                        SCENARIO {idx + 1} / {SCENARIOS.length}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="ps-label hidden md:inline">Decisions made</span>
                    <span className="font-mono text-xs text-white" data-testid="decision-count">
                        {results.length} / {SCENARIOS.length}
                    </span>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={containerRef}
                    data-testid="decision-game-canvas"
                    className="h-[540px] w-full select-none"
                />

                {!ready && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 px-6">
                        <button
                            type="button"
                            onClick={() => setReady(true)}
                            className="max-w-sm rounded-3xl border border-white/10 bg-black/70 px-10 py-10 text-center text-white transition hover:bg-white/10"
                        >
                            <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                                DECISION GAME
                            </p>
                            <p className="mt-4 text-[2.75rem] font-black uppercase tracking-[0.06em] text-white">
                                Click to continue
                            </p>
                            <p className="mt-4 text-sm uppercase tracking-[0.22em] text-white/60">
                                Analyze the play and make the right call.
                            </p>
                        </button>
                    </div>
                )}

                <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2">
                    <span
                        className={[
                            "inline-block h-1.5 w-1.5 rounded-full",
                            phase === "animating"
                                ? "animate-pulse bg-ps-red"
                                : phase === "deciding"
                                    ? "animate-pulse bg-white"
                                    : "bg-ps-turf",
                        ].join(" ")}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
                        {phase === "intro"
                            ? "Click to start"
                            : phase === "animating"
                                ? "Play in motion…"
                                : phase === "deciding"
                                    ? "Decide"
                                    : "Feedback"}
                    </span>
                </div>

                {phase === "deciding" && (
                    <div
                        data-testid="decision-question"
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
                        data-testid="decision-feedback"
                        className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    >
                        <div
                            className="mx-6 max-w-lg border border-white/15 bg-ps-bg p-8"
                            style={{ borderLeft: "3px solid #DC1E28" }}
                        >
                            <p className="ps-label text-ps-red">Coach's Note</p>
                            <p className="mt-3 font-display text-xs uppercase tracking-[0.22em] text-white/40">
                                Your call: {feedback.picked} — {feedback.label}
                            </p>
                            <p className="mt-4 font-body text-sm leading-relaxed text-white/85">
                                {feedback.reason}
                            </p>
                            {recommendedOption && recommendedOption.key !== feedback.picked && (
                                <p className="mt-4 border-t border-white/8 pt-4 font-body text-xs leading-relaxed text-white/55">
                                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                                        Coach's preferred call ·{" "}
                                    </span>
                                    <strong className="text-white">
                                        {recommendedOption.key} — {recommendedOption.label}
                                    </strong>
                                    <br />
                                    <span className="text-white/55">{recommendedOption.reason}</span>
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={handleContinue}
                                className="mt-6 w-full border border-white/15 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-white/5"
                            >
                                Click to continue
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-px border-t border-white/10 bg-white/10 md:grid-cols-3">
                {sc.options.map((o, i) => (
                    <button
                        key={`${idx}-${o.key}`}
                        data-testid={`decision-option-${o.key}`}
                        onClick={() => handlePick(o)}
                        disabled={phase !== "deciding" || done}
                        className={[
                            "group flex items-start gap-3 bg-ps-surface px-5 py-5 text-left transition-colors disabled:cursor-not-allowed",
                            phase === "deciding"
                                ? "hover:bg-ps-red/10"
                                : "opacity-45",
                        ].join(" ")}
                    >
                        <span
                            className={[
                                "grid h-8 w-8 flex-none place-items-center border font-display text-sm font-black uppercase",
                                phase === "deciding"
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
                <span className="text-ps-red">●</span> {sc.subtitle}
            </div>
        </div>
    );
}
