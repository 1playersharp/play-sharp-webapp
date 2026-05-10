import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

const TOTAL_ROUNDS = 5;
const MIN_WAIT = 900;
const MAX_WAIT = 2200;
const TARGET_RADIUS = 36;
const FALSE_START_PENALTY = 50; // ms added per false start to avg

/**
 * ReactionGame — 5 rounds. Wait for a green circle to flash at a random
 * position on the pitch, then tap it as fast as you can.
 *
 * Props: onComplete({ score, reactionTime, falseStarts })
 */
export default function ReactionGame({ onComplete }) {
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const [round, setRound] = useState(0);
    const [lastTime, setLastTime] = useState(null);
    const [avg, setAvg] = useState(null);
    const [falseStarts, setFalseStarts] = useState(0);
    const [running, setRunning] = useState(false);
    const completedRef = useRef(false);

    useEffect(() => {
        completedRef.current = false;

        const state = {
            phase: "idle", // idle | waiting | go | shown | done
            waitTimer: null,
            startGoTime: 0,
            times: [],
            falseStarts: 0,
            round: 0,
        };

        const SCENE = {
            key: "ReactionScene",
            create() {
                const w = this.scale.width;
                const h = this.scale.height;

                // Pitch background
                this.bg = this.add.rectangle(w / 2, h / 2, w, h, 0x0e2d1a);
                // Pitch stripes for atmosphere
                for (let i = 0; i < 8; i++) {
                    const stripe = this.add.rectangle(
                        (w / 8) * (i + 0.5),
                        h / 2,
                        w / 8,
                        h,
                        i % 2 === 0 ? 0x10331f : 0x0a2615
                    );
                    stripe.setAlpha(0.55);
                }

                // Header text in centre
                this.title = this.add
                    .text(w / 2, h / 2 - 18, "TAP TO START", {
                        fontFamily: "'Sofia Sans Extra Condensed', 'Barlow Condensed', sans-serif",
                        fontSize: "48px",
                        fontStyle: "900",
                        color: "#FFFFFF",
                    })
                    .setOrigin(0.5);

                this.subtitle = this.add
                    .text(w / 2, h / 2 + 26, `${TOTAL_ROUNDS} ROUNDS · TAP THE GREEN CIRCLE`, {
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "12px",
                        color: "#FFFFFF80",
                    })
                    .setOrigin(0.5);

                // HUD
                this.hudRound = this.add.text(20, 18, `ROUND  00 / ${String(TOTAL_ROUNDS).padStart(2, "0")}`, {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "#FFFFFFAA",
                });
                this.hudLast = this.add
                    .text(w - 20, 18, "LAST  ---", {
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "12px",
                        color: "#FFFFFFAA",
                    })
                    .setOrigin(1, 0);

                // Hidden target circle (will be repositioned and shown in 'go' phase)
                this.target = this.add.circle(-100, -100, TARGET_RADIUS, 0x23883c);
                this.target.setStrokeStyle(3, 0xffffff, 0.9);
                this.target.setVisible(false);

                this.targetGlow = this.add.circle(-100, -100, TARGET_RADIUS + 14, 0x23883c, 0.0);
                this.targetGlow.setStrokeStyle(2, 0x23883c, 0.5);
                this.targetGlow.setVisible(false);

                this.input.on("pointerdown", (pointer) => this._handleClick(pointer));

                this._handleClick = (pointer) => {
                    if (state.phase === "idle") {
                        this._beginRound();
                        return;
                    }
                    if (state.phase === "waiting") {
                        // FALSE START
                        state.falseStarts += 1;
                        setFalseStarts(state.falseStarts);
                        this._showFalseStart();
                        return;
                    }
                    if (state.phase === "go") {
                        // Did the click land on the target?
                        const dx = pointer.x - this.target.x;
                        const dy = pointer.y - this.target.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > TARGET_RADIUS + 12) {
                            // miss — but still register reaction time so user feels feedback
                        }
                        const t = this.time.now - state.startGoTime;
                        state.times.push(t);
                        setLastTime(t);
                        this._showSuccess(t);
                    }
                };

                this._beginRound = () => {
                    state.phase = "waiting";
                    this.title.setText("WAIT…");
                    this.title.setColor("#FFFFFF");
                    this.subtitle.setText("DON'T JUMP THE GUN");
                    this.subtitle.setColor("#FFFFFF66");
                    this.target.setVisible(false);
                    this.targetGlow.setVisible(false);
                    const delay = Phaser.Math.Between(MIN_WAIT, MAX_WAIT);
                    state.waitTimer = this.time.delayedCall(delay, () => {
                        if (state.phase !== "waiting") return;
                        // Pick a random position with safe margins
                        const margin = TARGET_RADIUS + 24;
                        const tx = Phaser.Math.Between(margin, w - margin);
                        const ty = Phaser.Math.Between(margin + 40, h - margin);
                        state.phase = "go";
                        state.startGoTime = this.time.now;
                        this.target.setPosition(tx, ty);
                        this.targetGlow.setPosition(tx, ty);
                        this.target.setVisible(true);
                        this.targetGlow.setVisible(true);
                        this.title.setText("TAP IT!");
                        this.title.setColor("#23883C");
                        this.subtitle.setText("");
                        // Pulse halo
                        this.tweens.add({
                            targets: this.targetGlow,
                            scale: 1.6,
                            alpha: 0,
                            duration: 700,
                            ease: "Cubic.Out",
                            onStart: () => {
                                this.targetGlow.setScale(1);
                                this.targetGlow.setAlpha(0.55);
                            },
                            repeat: -1,
                        });
                    });
                };

                this._showSuccess = (ms) => {
                    state.phase = "shown";
                    this.tweens.killTweensOf(this.targetGlow);
                    this.target.setVisible(false);
                    this.targetGlow.setVisible(false);
                    this.title.setText(`${Math.round(ms)} MS`);
                    this.title.setColor("#FFFFFF");
                    state.round += 1;
                    setRound(state.round);
                    this.hudRound.setText(
                        `ROUND  ${String(state.round).padStart(2, "0")} / ${String(TOTAL_ROUNDS).padStart(2, "0")}`
                    );
                    this.hudLast.setText(`LAST  ${Math.round(ms)}MS`);
                    if (state.round >= TOTAL_ROUNDS) {
                        this._finishGame();
                    } else {
                        this.subtitle.setText("NEXT ROUND IN 3…");
                        this.subtitle.setColor("#FFFFFFAA");
                        state.phase = "shown";
                        this.time.delayedCall(1000, () => {
                            if (state.phase !== "shown") return;
                            this.subtitle.setText("NEXT ROUND IN 2…");
                        });
                        this.time.delayedCall(2000, () => {
                            if (state.phase !== "shown") return;
                            this.subtitle.setText("NEXT ROUND IN 1…");
                        });
                        this.time.delayedCall(3000, () => {
                            if (state.phase !== "shown") return;
                            this._beginRound();
                        });
                    }
                };

                this._showFalseStart = () => {
                    this.cameras.main.flash(220, 230, 57, 70);
                    if (state.waitTimer) state.waitTimer.remove();
                    this.title.setText("FALSE START");
                    this.title.setColor("#E63946");
                    this.subtitle.setText("TAP TO RETRY THIS ROUND");
                    this.subtitle.setColor("#E6394999");
                    state.phase = "idle";
                };

                this._finishGame = () => {
                    state.phase = "done";
                    const sum = state.times.reduce((a, b) => a + b, 0);
                    const avgT = state.times.length ? sum / state.times.length : 0;
                    const adjusted = avgT + state.falseStarts * FALSE_START_PENALTY;
                    // Score: 1000 if avg <= 200ms, 0 if avg >= 600ms
                    const clamped = Math.max(200, Math.min(600, adjusted));
                    const sc = Math.round(((600 - clamped) / 400) * 1000);
                    setAvg(avgT);
                    this.title.setText(`${Math.round(avgT)} MS`);
                    this.title.setColor("#FFFFFF");
                    this.subtitle.setText("DRILL COMPLETE");
                    this.subtitle.setColor("#23883C");
                    if (!completedRef.current && typeof onComplete === "function") {
                        completedRef.current = true;
                        onComplete({
                            score: Math.max(0, sc),
                            reactionTime: avgT,
                            falseStarts: state.falseStarts,
                        });
                    }
                };

                setRunning(true);
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
                height: 460,
            },
            scene: SCENE,
        });
        gameRef.current = game;

        return () => {
            try {
                game.destroy(true);
            } catch (e) {
                /* noop */
            }
            gameRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div data-testid="reaction-game" className="border border-white/10 bg-ps-surface">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
                <div className="flex items-center gap-4">
                    <span className="ps-label">Reaction Drill</span>
                    <span className="font-mono text-xs text-white/60" data-testid="reaction-round">
                        ROUND {String(round).padStart(2, "0")} / {TOTAL_ROUNDS}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="ps-label hidden md:inline">Last</span>
                    <span className="font-mono text-xs text-white" data-testid="reaction-last">
                        {lastTime != null ? `${Math.round(lastTime)} MS` : "—"}
                    </span>
                    <span className="ps-label hidden md:inline">False Starts</span>
                    <span className="font-mono text-xs text-ps-defender" data-testid="reaction-false-starts">
                        {falseStarts}
                    </span>
                </div>
            </div>
            <div
                ref={containerRef}
                data-testid="reaction-game-canvas"
                className="h-[460px] w-full select-none"
            />
            {running && avg != null && (
                <div className="border-t border-white/10 px-4 py-3 md:px-6">
                    <span className="ps-label">Average reaction</span>
                    <span className="ml-3 font-mono text-base text-ps-red" data-testid="reaction-avg">
                        {Math.round(avg)} MS
                    </span>
                </div>
            )}
        </div>
    );
}
