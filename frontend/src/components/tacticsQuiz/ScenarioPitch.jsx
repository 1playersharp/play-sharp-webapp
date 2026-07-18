import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

// Reference timings (see reference/playsharp-tactics-quiz.html):
//   draw arrows ~250ms after mount, over ~1s
//   move tokens+ball ~550ms after mount, over ~1.5s
//   caller reveals the question ~500ms after motion settles (~2550ms total)
const ARROW_DRAW_DELAY_MS = 250;
const ARROW_DRAW_DUR_MS = 1000;
const MOTION_START_DELAY_MS = 550;
const MOTION_DUR_MS = 1500;
export const TOTAL_MOTION_MS = MOTION_START_DELAY_MS + MOTION_DUR_MS;

const easing = [0.4, 0, 0.2, 1];

/**
 * SVG pitch that animates the scenario. Actors and the ball start at
 * (x1, y1) and glide to (x2, y2). Motion trails are drawn on first, tokens
 * move afterwards; a static actor (x1===x2) shows a pulsing ring instead
 * of a trail. `nonce` bumps to re-run the animation without unmounting.
 */
export default function ScenarioPitch({ scenario, nonce = 0, onReplay }) {
    const [arrowsDrawn, setArrowsDrawn] = useState(false);
    const [moved, setMoved] = useState(false);

    useEffect(() => {
        setArrowsDrawn(false);
        setMoved(false);
        const a = setTimeout(() => setArrowsDrawn(true), ARROW_DRAW_DELAY_MS);
        const b = setTimeout(() => setMoved(true), MOTION_START_DELAY_MS);
        return () => { clearTimeout(a); clearTimeout(b); };
    }, [scenario, nonce]);

    // Pre-compute path lengths so the stroke-dashoffset trick works.
    const trails = useMemo(() => {
        const list = [];
        scenario.actors.forEach((a, i) => {
            if (a.x1 !== a.x2 || a.y1 !== a.y2) {
                list.push({
                    kind: 'actor',
                    idx: i,
                    x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2,
                    len: Math.hypot(a.x2 - a.x1, a.y2 - a.y1),
                });
            }
        });
        if (scenario.ball && (scenario.ball.x1 !== scenario.ball.x2 || scenario.ball.y1 !== scenario.ball.y2)) {
            list.push({
                kind: 'ball',
                x1: scenario.ball.x1, y1: scenario.ball.y1,
                x2: scenario.ball.x2, y2: scenario.ball.y2,
                len: Math.hypot(scenario.ball.x2 - scenario.ball.x1, scenario.ball.y2 - scenario.ball.y1),
            });
        }
        return list;
    }, [scenario]);

    return (
        <div className="relative overflow-hidden rounded-sm border border-white/10 bg-gradient-to-b from-[#0e2a1e] to-[#0a2118] p-1.5">
            <button
                type="button"
                data-testid="tactics-quiz-replay"
                onClick={onReplay}
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:border-ps-red hover:text-ps-red"
            >
                <RotateCcw size={13} strokeWidth={2.4} />
                Replay
            </button>

            <svg
                data-testid="tactics-quiz-pitch"
                viewBox="0 0 800 520"
                xmlns="http://www.w3.org/2000/svg"
                className="block h-auto w-full"
            >
                {/* Pitch markings */}
                <rect x="40"  y="20"  width="720" height="480" fill="none" stroke="rgba(245,243,236,0.32)" strokeWidth="2" />
                <rect x="270" y="20"  width="260" height="130" fill="none" stroke="rgba(245,243,236,0.32)" strokeWidth="2" />
                <rect x="350" y="20"  width="100" height="55"  fill="none" stroke="rgba(245,243,236,0.32)" strokeWidth="2" />
                <path d="M 345 150 A 55 55 0 0 0 455 150" fill="none" stroke="rgba(245,243,236,0.32)" strokeWidth="2" />
                <circle cx="400" cy="500" r="60" fill="none" stroke="rgba(245,243,236,0.32)" strokeWidth="2" />

                {/* Direction of play cue */}
                <line x1="70" y1="480" x2="70" y2="425" stroke="rgba(245,243,236,0.62)" strokeWidth="2" strokeLinecap="round" />
                <polygon points="70,415 63,428 77,428" fill="rgba(245,243,236,0.62)" />
                <text x="82" y="452" transform="rotate(-90 82 452)" fill="rgba(245,243,236,0.62)" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.16em' }}>
                    DIRECTION OF PLAY
                </text>

                {/* Motion trails (arrows for movers, pulse rings for holders) */}
                {scenario.actors.map((a, i) => {
                    const moves = a.x1 !== a.x2 || a.y1 !== a.y2;
                    if (!moves) {
                        return (
                            <motion.circle
                                key={`hold-${i}`}
                                cx={a.x1} cy={a.y1} r={20}
                                fill="none"
                                stroke="rgba(245,243,236,0.5)"
                                strokeWidth="2"
                                animate={{ scale: [1, 1.9], opacity: [0.9, 0] }}
                                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                transition={{ duration: 1.8, ease: 'easeOut', repeat: Infinity }}
                            />
                        );
                    }
                    const t = trails.find((tr) => tr.kind === 'actor' && tr.idx === i);
                    return (
                        <motion.line
                            key={`trail-${i}`}
                            x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                            fill="none"
                            stroke="rgba(245,243,236,0.55)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray={t.len}
                            initial={{ strokeDashoffset: t.len }}
                            animate={{ strokeDashoffset: arrowsDrawn ? 0 : t.len }}
                            transition={{ duration: ARROW_DRAW_DUR_MS / 1000, ease: easing }}
                        />
                    );
                })}

                {scenario.ball && trails.some((t) => t.kind === 'ball') && (() => {
                    const t = trails.find((tt) => tt.kind === 'ball');
                    return (
                        <motion.line
                            x1={scenario.ball.x1} y1={scenario.ball.y1}
                            x2={scenario.ball.x2} y2={scenario.ball.y2}
                            fill="none"
                            stroke="rgba(245,243,236,0.3)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray={t.len}
                            initial={{ strokeDashoffset: t.len }}
                            animate={{ strokeDashoffset: arrowsDrawn ? 0 : t.len }}
                            transition={{ duration: ARROW_DRAW_DUR_MS / 1000, ease: easing }}
                        />
                    );
                })()}

                {/* Actor tokens */}
                {scenario.actors.map((a, i) => {
                    const attack = a.role === 'attack';
                    const target = { cx: moved ? a.x2 : a.x1, cy: moved ? a.y2 : a.y1 };
                    const labelTarget = { x: moved ? a.x2 : a.x1, y: moved ? a.y2 : a.y1 };
                    const youCap = { x: moved ? a.x2 : a.x1, y: (moved ? a.y2 : a.y1) + 34 };
                    return (
                        <g key={`actor-${i}`}>
                            {a.you && (
                                <motion.circle
                                    r={21}
                                    fill="none"
                                    stroke="#f5f3ec"
                                    strokeWidth="2.5"
                                    initial={{ cx: a.x1, cy: a.y1 }}
                                    animate={target}
                                    transition={{ duration: MOTION_DUR_MS / 1000, ease: easing }}
                                />
                            )}
                            <motion.circle
                                r={18}
                                fill={attack ? '#e8a33d' : '#3d7ea6'}
                                initial={{ cx: a.x1, cy: a.y1 }}
                                animate={target}
                                transition={{ duration: MOTION_DUR_MS / 1000, ease: easing }}
                            />
                            {a.label && (
                                <motion.text
                                    initial={{ x: a.x1, y: a.y1 }}
                                    animate={labelTarget}
                                    transition={{ duration: MOTION_DUR_MS / 1000, ease: easing }}
                                    fill={attack ? '#241505' : '#f5f3ec'}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, pointerEvents: 'none' }}
                                >
                                    {a.label}
                                </motion.text>
                            )}
                            {a.you && (
                                <motion.text
                                    initial={{ x: a.x1, y: a.y1 + 34 }}
                                    animate={youCap}
                                    transition={{ duration: MOTION_DUR_MS / 1000, ease: easing }}
                                    fill="#f5f3ec"
                                    textAnchor="middle"
                                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em' }}
                                >
                                    YOU
                                </motion.text>
                            )}
                        </g>
                    );
                })}

                {scenario.ball && (
                    <motion.circle
                        r={7}
                        fill="#f5f3ec"
                        stroke="#2a1a08"
                        strokeWidth="1.5"
                        initial={{ cx: scenario.ball.x1, cy: scenario.ball.y1 }}
                        animate={{ cx: moved ? scenario.ball.x2 : scenario.ball.x1, cy: moved ? scenario.ball.y2 : scenario.ball.y1 }}
                        transition={{ duration: MOTION_DUR_MS / 1000, ease: easing }}
                    />
                )}
            </svg>
        </div>
    );
}
