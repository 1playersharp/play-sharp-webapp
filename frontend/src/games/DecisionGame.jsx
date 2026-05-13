import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * DecisionGame — vertical pitch, attacking UPWARD.
 *
 * V1.6:
 *  - Player labels now sit BELOW the player circle.
 *  - YOU is highlighted with an orange kit (vs red teammates / black opps).
 *  - Options are presented as on-pitch ARROWS (through-ball, cross arc,
 *    dribble loop, etc.) with a clickable text-label badge sitting on top
 *    of each arrow. The bottom A/B/C button row has been removed.
 *
 * Coord convention: x [0,1] left→right; y [0,1] TOP (goal we attack) → BOTTOM.
 * Props: onComplete({ score, total, avgTime, matchesCoach, decisions })
 */

const PITCH = { bg: 0x0c2e17, stripeA: 0x103e1f, stripeB: 0x0a2515, line: 0xffffff };
const KIT = {
    home: 0xdc1e28,        // teammates — red
    homeStroke: 0xffffff,
    opp: 0x0a0a0a,         // opponents — black
    oppStroke: 0xffffff,
    keeper: 0xf4c430,
    keeperStroke: 0x0a0a0a,
    you: 0xff7a1f,         // YOU — orange
    youStroke: 0xffffff,
    ball: 0xffffff,
};

const OPT_COLOR = {
    A: 0xdc1e28, // red
    B: 0xffffff, // white
    C: 0x2ead3c, // green
};

/* ============ Scenarios ============ */

const SCENARIOS = [
    {
        id: "channel_runner",
        title: "Channel Runner",
        subtitle: "Striker bending from onside into the channel between LB and LCB",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.62, label: "CM", hasBall: true },
            { id: "striker", kit: "home", x: 0.34, y: 0.50, label: "ST" },
            { id: "winger", kit: "home", x: 0.78, y: 0.55, label: "RW" },
            { id: "lb", kit: "opp", x: 0.20, y: 0.42, label: "LB" },
            { id: "lcb", kit: "opp", x: 0.40, y: 0.40, label: "LCB" },
            { id: "rcb", kit: "opp", x: 0.60, y: 0.40, label: "RCB" },
            { id: "rb", kit: "opp", x: 0.80, y: 0.42, label: "RB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        offside: { y: 0.42 },
        anim: [
            { id: "striker", path: [{ x: 0.30, y: 0.45 }, { x: 0.28, y: 0.36 }, { x: 0.30, y: 0.30 }], duration: 1800 },
            { id: "winger", to: { x: 0.80, y: 0.50 }, duration: 1800 },
        ],
        question: "Striker bending into the LB–LCB channel from onside. Pick your action.",
        options: [
            {
                key: "A",
                label: "Slide a through-ball into the channel",
                short: "Through-ball",
                recommended: true,
                reason: "He started behind the back line and bent his run perfectly. Ball into the corridor between LB and LCB — he runs onto it the right side of the offside trap.",
                arrow: {
                    path: [{ x: 0.50, y: 0.62 }, { x: 0.42, y: 0.48 }, { x: 0.32, y: 0.34 }],
                    style: "solid",
                    badge: { x: 0.36, y: 0.55 },
                },
            },
            {
                key: "B",
                label: "Square pass to the right winger",
                short: "Square pass",
                reason: "Winger is wide but stationary — square balls don't beat the line. Striker's curved run is the higher-value option.",
                arrow: {
                    path: [{ x: 0.50, y: 0.62 }, { x: 0.78, y: 0.55 }],
                    style: "solid",
                    badge: { x: 0.64, y: 0.66 },
                },
            },
            {
                key: "C",
                label: "Hold the ball and let CMs join",
                short: "Hold / dribble",
                reason: "Kills the timing. The runner timed his bend off your body shape — wait too long and the LCB recovers the channel.",
                arrow: {
                    path: [{ x: 0.50, y: 0.62 }, { x: 0.50, y: 0.46 }],
                    style: "solid",
                    badge: { x: 0.66, y: 0.55 },
                },
            },
        ],
    },
    {
        id: "wide_overload",
        title: "Wide Overload",
        subtitle: "Their full-back stepped out, your overlap is sprinting in behind",
        setup: [
            { id: "you", kit: "home", x: 0.22, y: 0.45, label: "LM", hasBall: true },
            { id: "fb_overlap", kit: "home", x: 0.22, y: 0.62, label: "LB" },
            { id: "ifw", kit: "home", x: 0.42, y: 0.42, label: "IF" },
            { id: "striker", kit: "home", x: 0.55, y: 0.30, label: "ST" },
            { id: "opp_fb", kit: "opp", x: 0.22, y: 0.38, label: "RB" },
            { id: "opp_lcb", kit: "opp", x: 0.42, y: 0.34, label: "LCB" },
            { id: "opp_rcb", kit: "opp", x: 0.58, y: 0.34, label: "RCB" },
            { id: "opp_lb", kit: "opp", x: 0.78, y: 0.36, label: "LB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        offside: { y: 0.36 },
        anim: [
            { id: "opp_fb", to: { x: 0.20, y: 0.44 }, duration: 1500 },
            { id: "fb_overlap", to: { x: 0.22, y: 0.30 }, duration: 1700 },
            { id: "ifw", to: { x: 0.40, y: 0.45 }, duration: 1600 },
        ],
        question: "Their right-back has committed. Your LB is overlapping into the gap.",
        options: [
            {
                key: "A",
                label: "Slip it inside the RB to your overlapping LB",
                short: "Overlap pass",
                recommended: true,
                reason: "Classic 2v1. RB has bitten, CBs are holding shape — your full-back arrives with momentum into a gold-channel cross opportunity.",
                arrow: {
                    path: [{ x: 0.22, y: 0.45 }, { x: 0.22, y: 0.30 }],
                    style: "solid",
                    badge: { x: 0.36, y: 0.42 },
                },
            },
            {
                key: "B",
                label: "Cross immediately into the box",
                short: "Cross now",
                reason: "Premature. You're not at the byline yet and the angle is too tight. Use the overlap first to break the line, then cross.",
                arrow: {
                    path: [
                        { x: 0.22, y: 0.45 }, { x: 0.32, y: 0.30 }, { x: 0.42, y: 0.20 }, { x: 0.50, y: 0.18 },
                    ],
                    style: "solid",
                    badge: { x: 0.60, y: 0.22 },
                },
            },
            {
                key: "C",
                label: "Drive infield with the ball",
                short: "Drive inside",
                reason: "Both centre-backs are holding compact — driving inside walks straight into them. The free space is on the outside.",
                arrow: {
                    path: [{ x: 0.22, y: 0.45 }, { x: 0.36, y: 0.50 }, { x: 0.46, y: 0.48 }],
                    style: "solid",
                    badge: { x: 0.60, y: 0.58 },
                },
            },
        ],
    },
    {
        id: "defensive_shape",
        title: "Defensive Shape",
        subtitle: "Compact back four. Striker is onside, threatening depth.",
        setup: [
            { id: "you", kit: "home", x: 0.50, y: 0.70, label: "CM", hasBall: true },
            { id: "striker", kit: "home", x: 0.50, y: 0.42, label: "ST" },
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
            { id: "striker", to: { x: 0.50, y: 0.30 }, duration: 1500 },
            { id: "opp_lb", to: { x: 0.30, y: 0.40 }, duration: 1500 },
            { id: "opp_lcb", to: { x: 0.44, y: 0.40 }, duration: 1500 },
            { id: "opp_rcb", to: { x: 0.56, y: 0.40 }, duration: 1500 },
            { id: "opp_rb", to: { x: 0.70, y: 0.40 }, duration: 1500 },
        ],
        question: "Compact line. Your striker timed his depth run from onside.",
        options: [
            {
                key: "A",
                label: "Drive a low through-ball before the line resets",
                short: "Through-ball",
                recommended: true,
                reason: "Striker started onside and burst depth as the line stepped late. Low first-time vertical ball — he's onto it before they recover.",
                arrow: {
                    path: [{ x: 0.50, y: 0.70 }, { x: 0.50, y: 0.50 }, { x: 0.50, y: 0.30 }],
                    style: "solid",
                    badge: { x: 0.58, y: 0.52 },
                },
            },
            {
                key: "B",
                label: "Switch wide to the winger",
                short: "Switch wide",
                reason: "Wastes the central momentum. Switching gives the back four time to drop with the striker and reset the offside trap.",
                arrow: {
                    path: [{ x: 0.50, y: 0.70 }, { x: 0.65, y: 0.62 }, { x: 0.80, y: 0.55 }],
                    style: "solid",
                    badge: { x: 0.68, y: 0.70 },
                },
            },
            {
                key: "C",
                label: "Hold and wait for the line to drop",
                short: "Hold / dribble",
                reason: "Compact lines don't drop — they hold and rely on stepping. Your moment is now, not later.",
                arrow: {
                    path: [{ x: 0.50, y: 0.70 }, { x: 0.50, y: 0.54 }],
                    style: "solid",
                    badge: { x: 0.66, y: 0.62 },
                },
            },
        ],
    },
    {
        id: "winger_in_box",
        title: "Winger in the Box",
        subtitle: "Three runners attacking near-post, penalty spot, and far-post",
        questionPosition: "bottom",
        setup: [
            { id: "you", kit: "home", x: 0.82, y: 0.18, label: "RW", hasBall: true },
            { id: "near", kit: "home", x: 0.42, y: 0.10, label: "NEAR" },
            { id: "spot", kit: "home", x: 0.50, y: 0.16, label: "SPOT" },
            { id: "far", kit: "home", x: 0.62, y: 0.10, label: "FAR" },
            { id: "opp_cb1", kit: "opp", x: 0.46, y: 0.13, label: "CB" },
            { id: "opp_cb2", kit: "opp", x: 0.55, y: 0.13, label: "CB" },
            { id: "opp_fb", kit: "opp", x: 0.78, y: 0.20, label: "FB" },
            { id: "gk", kit: "keeper", x: 0.50, y: 0.06, label: "GK" },
        ],
        offside: null,
        anim: [
            { id: "you", to: { x: 0.86, y: 0.13 }, duration: 1300 },
            { id: "near", to: { x: 0.42, y: 0.08 }, duration: 1300 },
            { id: "spot", to: { x: 0.50, y: 0.13 }, duration: 1300 },
            { id: "far", to: { x: 0.62, y: 0.08 }, duration: 1300 },
        ],
        question: "You're at the byline. Three runners — near-post, spot, far-post.",
        options: [
            {
                key: "A",
                label: "Whip across the 6-yard line for the near-post run",
                short: "Near-post whip",
                recommended: true,
                reason: "Near-post run attacks the highest-percentage zone. Whipped ball across the 6-yard line is hardest to defend — keeper rooted, defender beaten by the angle.",
                arrow: {
                    path: [
                        { x: 0.86, y: 0.13 }, { x: 0.70, y: 0.08 }, { x: 0.55, y: 0.07 }, { x: 0.42, y: 0.08 },
                    ],
                    style: "solid",
                    badge: { x: 0.60, y: 0.21 },
                },
            },
            {
                key: "B",
                label: "Cut back to the penalty spot",
                short: "Cut-back",
                reason: "Decent option — but slower and lets the keeper reset. Near-post is the elite finish here.",
                arrow: {
                    path: [
                        { x: 0.86, y: 0.13 }, { x: 0.72, y: 0.18 }, { x: 0.60, y: 0.18 }, { x: 0.50, y: 0.16 },
                    ],
                    style: "solid",
                    badge: { x: 0.66, y: 0.26 },
                },
            },
            {
                key: "C",
                label: "Float a cross to the far-post runner",
                short: "Far-post float",
                reason: "Lower-percentage. The far-post arrival is late and the ball loses pace — a hung cross gives the GK time to claim or punch.",
                arrow: {
                    path: [
                        { x: 0.86, y: 0.13 }, { x: 0.78, y: 0.05 }, { x: 0.70, y: 0.04 }, { x: 0.62, y: 0.10 },
                    ],
                    style: "solid",
                    badge: { x: 0.72, y: 0.34 },
                },
            },
        ],
    },
];

/* ============ Pitch rendering ============ */

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
    const arc = scene.add.graphics();
    arc.lineStyle(2, PITCH.line, 0.35);
    arc.beginPath();
    arc.arc(w / 2, 76, 48, Math.PI * 0.18, Math.PI - Math.PI * 0.18, true);
    arc.strokePath();
    scene.add.rectangle(w / 2 - goalW / 2, 6, 4, 4, PITCH.line);
    scene.add.rectangle(w / 2 + goalW / 2, 6, 4, 4, PITCH.line);
    scene.add.rectangle(w / 2, 8, goalW, 14, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.7);

    scene.add.rectangle(w / 2, h - 60, boxW, 110, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.4);
    scene.add.rectangle(w / 2, h - 22, sixW, 42, 0x000000, 0).setStrokeStyle(2, PITCH.line, 0.5);

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
    scene.add
        .text(w - 12, y - 6, "OFFSIDE LINE", {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9px",
            color: "#DC1E28",
            letterSpacing: "0.2em",
        })
        .setOrigin(1, 1);
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
    container.setData("playerId", p.id);

    if (p.hasBall) {
        const ball = scene.add.circle(8, -8, 4.5, KIT.ball).setStrokeStyle(1, 0x000000, 0.5);
        container.add(ball);
    }
    return container;
}

/* ============ Option-arrow rendering ============ */

function drawOptionArrow(scene, w, h, opt, color, onPick) {
    const layer = scene.add.container(0, 0);
    const pts = opt.arrow.path.map((p) => ({ x: p.x * w, y: p.y * h }));

    if (opt.arrow.style === "loop") {
        // Dribble: spiral / circular loop at the player's feet.
        const cx = pts[0].x;
        const cy = pts[0].y;
        const ring = scene.add.graphics();
        ring.lineStyle(5, color, 0.95);
        ring.strokeCircle(cx, cy, 28);
        // Tangent arrowhead suggesting motion.
        const headAng = Math.PI * 0.85;
        const hx = cx + 28 * Math.cos(headAng);
        const hy = cy + 28 * Math.sin(headAng);
        ring.lineStyle(5, color, 0.95);
        ring.beginPath();
        ring.moveTo(hx, hy);
        ring.lineTo(hx - 12, hy - 6);
        ring.moveTo(hx, hy);
        ring.lineTo(hx - 4, hy - 14);
        ring.strokePath();
        layer.add(ring);
    } else {
        const g = scene.add.graphics();
        g.lineStyle(5, color, 0.92);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.strokePath();

        // Arrowhead on the final segment.
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
        const headLen = 18;
        const head = scene.add.graphics();
        head.lineStyle(5, color, 0.95);
        head.beginPath();
        head.moveTo(last.x, last.y);
        head.lineTo(last.x - headLen * Math.cos(ang - 0.55), last.y - headLen * Math.sin(ang - 0.55));
        head.moveTo(last.x, last.y);
        head.lineTo(last.x - headLen * Math.cos(ang + 0.55), last.y - headLen * Math.sin(ang + 0.55));
        head.strokePath();
        layer.add([g, head]);
    }

    // Clickable badge with key + short label — sized for legibility on the pitch.
    const bx = opt.arrow.badge.x * w;
    const by = opt.arrow.badge.y * h;
    const labelTxt = (opt.short || opt.label).toUpperCase();
    const charW = 10;
    const labelWidth = Math.min(240, labelTxt.length * charW + 16);
    const keyW = 40;
    const totalW = labelWidth + keyW;
    const totalH = 38;
    const badge = scene.add.container(bx, by);

    const bg = scene.add
        .rectangle(0, 0, totalW, totalH, 0x000000, 0.94)
        .setStrokeStyle(2, color, 1);
    const keyBg = scene.add.rectangle(-totalW / 2 + keyW / 2, 0, keyW, totalH, color, 1);
    const keyText = scene.add
        .text(-totalW / 2 + keyW / 2, 0, opt.key, {
            fontFamily: "'Sofia Sans Extra Condensed', sans-serif",
            fontSize: "22px",
            fontStyle: "900",
            color: opt.key === "B" ? "#000000" : "#FFFFFF",
        })
        .setOrigin(0.5);
    const labelText = scene.add
        .text(keyW / 2 + 4, 0, labelTxt, {
            fontFamily: "'Sofia Sans Extra Condensed', sans-serif",
            fontSize: "16px",
            fontStyle: "800",
            color: "#FFFFFF",
        })
        .setOrigin(0.5);

    badge.add([bg, keyBg, keyText, labelText]);
    badge.setSize(totalW, totalH);
    badge.setInteractive({ useHandCursor: true });
    badge.on("pointerover", () => {
        bg.setFillStyle(color, 0.35);
    });
    badge.on("pointerout", () => {
        bg.setFillStyle(0x000000, 0.94);
    });
    badge.on("pointerdown", () => onPick(opt));

    layer.add(badge);
    return layer;
}

/* ============ Component ============ */

export default function DecisionGame({ onComplete }) {
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const onPickRef = useRef(() => {});
    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState("animating");
    const [feedback, setFeedback] = useState(null);
    const [results, setResults] = useState([]);
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
                this._optionsLayer = null;

                this._renderScenario = (scenarioIndex) => {
                    const w = this.scale.width;
                    const h = this.scale.height;
                    this.children.removeAll();
                    this.tweens.killAll();
                    this._players = {};
                    this._optionsLayer = null;

                    const s = SCENARIOS[scenarioIndex];
                    drawPitch(this);

                    if (s.offside && typeof s.offside.y === "number") {
                        drawOffsideLine(this, s.offside.y);
                    }

                    s.setup.forEach((p) => {
                        this._players[p.id] = placePlayer(this, p, w, h);
                    });

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

                    this.time.delayedCall(420, () => {
                        s.anim.forEach((step) => {
                            const target = this._players[step.id];
                            if (!target) return;
                            if (step.path && Array.isArray(step.path)) {
                                const segDur = step.duration / step.path.length;
                                step.path.forEach((pt, i) => {
                                    this.tweens.add({
                                        targets: target,
                                        x: pt.x * w,
                                        y: pt.y * h,
                                        duration: segDur,
                                        ease: "Sine.InOut",
                                        delay: i * segDur,
                                    });
                                });
                            } else if (step.to) {
                                this.tweens.add({
                                    targets: target,
                                    x: step.to.x * w,
                                    y: step.to.y * h,
                                    duration: step.duration,
                                    ease: "Sine.InOut",
                                });
                            }
                        });
                    });
                };

                this._showOptions = (scenarioIndex) => {
                    const w = this.scale.width;
                    const h = this.scale.height;
                    const s = SCENARIOS[scenarioIndex];
                    this._clearOptions();
                    this._optionsLayer = this.add.container(0, 0);
                    s.options.forEach((opt) => {
                        const arrow = drawOptionArrow(this, w, h, opt, OPT_COLOR[opt.key], (chosen) => {
                            onPickRef.current(chosen);
                        });
                        this._optionsLayer.add(arrow);
                    });
                };

                this._clearOptions = () => {
                    if (this._optionsLayer) {
                        this._optionsLayer.destroy();
                        this._optionsLayer = null;
                    }
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

        const redraw = (e) => {
            const scene = game.scene.getScene("DecisionScene");
            if (scene && typeof e.detail?.idx === "number" && scene._renderScenario) {
                scene._renderScenario(e.detail.idx);
            }
        };
        const showOpts = (e) => {
            const scene = game.scene.getScene("DecisionScene");
            if (scene && typeof e.detail?.idx === "number" && scene._showOptions) {
                scene._showOptions(e.detail.idx);
            }
        };
        const hideOpts = () => {
            const scene = game.scene.getScene("DecisionScene");
            if (scene && scene._clearOptions) scene._clearOptions();
        };
        window.addEventListener("ps:decision-redraw", redraw);
        window.addEventListener("ps:decision-show-options", showOpts);
        window.addEventListener("ps:decision-hide-options", hideOpts);

        return () => {
            window.removeEventListener("ps:decision-redraw", redraw);
            window.removeEventListener("ps:decision-show-options", showOpts);
            window.removeEventListener("ps:decision-hide-options", hideOpts);
            try {
                game.destroy(true);
            } catch (err) {
                /* noop */
            }
            gameRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // When idx advances → animating → deciding.
    useEffect(() => {
        setPhase("animating");
        setFeedback(null);
        window.dispatchEvent(new CustomEvent("ps:decision-redraw", { detail: { idx } }));

        const maxDur = Math.max(420, ...sc.anim.map((a) => a.duration));
        const t = setTimeout(() => {
            setPhase("deciding");
            decideAtRef.current = Date.now();
            window.dispatchEvent(new CustomEvent("ps:decision-show-options", { detail: { idx } }));
        }, maxDur + 350);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx]);

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
        setFeedback({ option: opt, picked: opt.key, label: opt.label, reason: opt.reason });
        setPhase("feedback");
        window.dispatchEvent(new CustomEvent("ps:decision-hide-options"));

        setTimeout(() => {
            if (idx + 1 < SCENARIOS.length) {
                setIdx(idx + 1);
            } else {
                setDone(true);
                const total = SCENARIOS.length;
                const avgTime = next.reduce((a, b) => a + b.ms, 0) / Math.max(1, next.length);
                const matchesCoach = next.filter((d) => d.matchesRecommended).length;
                const avgClamped = Math.max(800, Math.min(3200, avgTime));
                const score = Math.round(100 - ((avgClamped - 800) / 2400) * 50);
                if (!completedRef.current && typeof onComplete === "function") {
                    completedRef.current = true;
                    onComplete({ score, total, avgTime, matchesCoach, decisions: next });
                }
            }
        }, 2200);
    };
    onPickRef.current = handlePick;

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
                        {phase === "animating" ? "Play in motion…" : phase === "deciding" ? "Pick an arrow" : "Feedback"}
                    </span>
                </div>

                {phase === "deciding" && (
                    <div
                        data-testid="decision-question"
                        className={[
                            "pointer-events-none absolute inset-x-0 px-6",
                            sc.questionPosition === "bottom" ? "bottom-4" : "top-12",
                        ].join(" ")}
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
                                    <strong className="text-white">{recommendedOption.key} — {recommendedOption.label}</strong>
                                    <br />
                                    <span className="text-white/55">{recommendedOption.reason}</span>
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-white/5 px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
                <span className="text-ps-red">●</span> {sc.subtitle}
                {!done && (
                    <span className="ml-3 hidden text-white/35 md:inline">
                        · Click an arrow on the pitch to choose
                    </span>
                )}
            </div>
            {/* Off-screen sentinels keep test selectors stable post-refactor. */}
            <div className="sr-only">
                {sc.options.map((o) => (
                    <button
                        key={o.key}
                        data-testid={`decision-option-${o.key}`}
                        onClick={() => handlePick(o)}
                        disabled={phase !== "deciding" || done}
                    >
                        {o.key} — {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}