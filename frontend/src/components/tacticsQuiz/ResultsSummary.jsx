import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { TOPIC_LABELS } from '@/data/tacticsQuizScenarios';
import { GAME_REGISTRY } from '@/elite/engine/gameRegistry';

const coachNoteForScore = (pct) => {
    if (pct >= 85) return "Elite reading — you're seeing pictures before they form.";
    if (pct >= 70) return 'Sharp — a couple of details to tighten and the picture is clean.';
    if (pct >= 50) return "Solid foundation — a few reads to polish and you'll level up quickly.";
    if (pct >= 30) return "Plenty to work on — the training below will build your reads step by step.";
    return "Every top player was here once. Use the drills below and you'll climb fast.";
};

const barFill = (score01) => {
    if (score01 >= 0.85) return 'bg-emerald-500';
    if (score01 >= 0.6)  return 'bg-ps-turf';
    if (score01 >= 0.4)  return 'bg-amber-400';
    return 'bg-ps-red';
};

export default function ResultsSummary({
    positionLabel,
    scorePercent,
    topicBreakdown,
    recommendations,
    onReplayPosition,
    onPickAnother,
}) {
    const topics = Object.entries(topicBreakdown || {});

    return (
        <div
            data-testid="tactics-quiz-results"
            className="ps-card p-6"
        >
            <div className="text-center">
                <p className="ps-label text-ps-red">Coach&apos;s IQ read</p>
                <p className="ps-section-title mt-2 text-5xl text-white">
                    <span data-testid="tactics-quiz-score" className="text-ps-red">
                        {scorePercent}
                    </span>
                    <span className="text-white/60"> / 100</span>
                </p>
                <p className="mt-2 text-sm text-white/70">
                    {coachNoteForScore(scorePercent)}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
                    {positionLabel} · Position IQ
                </p>
            </div>

            {topics.length > 0 && (
                <div className="mt-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
                        Per-topic read
                    </p>
                    <ul
                        data-testid="tactics-quiz-topic-breakdown"
                        className="mt-3 flex flex-col gap-2"
                    >
                        {topics.map(([topic, score01]) => {
                            const pct = Math.round(score01 * 100);
                            return (
                                <li
                                    key={topic}
                                    data-testid={`tactics-quiz-topic-${topic}`}
                                    className="flex flex-col gap-1"
                                >
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-sm text-white/85">
                                            {TOPIC_LABELS[topic] || topic}
                                        </span>
                                        <span className="font-mono text-[11px] text-white/55">
                                            {pct}
                                        </span>
                                    </div>
                                    <div
                                        className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
                                        aria-hidden
                                    >
                                        <div
                                            className={[
                                                'h-full transition-all',
                                                barFill(score01),
                                            ].join(' ')}
                                            style={{ width: `${Math.max(3, pct)}%` }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {recommendations && recommendations.length > 0 && (
                <div className="mt-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
                        Train it — recommended games
                    </p>
                    <div
                        data-testid="tactics-quiz-recommendations"
                        className="mt-3 grid gap-3 sm:grid-cols-2"
                    >
                        {recommendations.map((rec) => {
                            // Icon components aren't persisted — resolve
                            // them from the registry at render time.
                            const Icon = GAME_REGISTRY[rec.skillId]?.Icon;
                            const colour =
                                GAME_REGISTRY[rec.skillId]?.colour || 'text-ps-turf';
                            return (
                                <Link
                                    key={`${rec.skillId}-${rec.topic}`}
                                    to={rec.path}
                                    data-testid={`tactics-quiz-rec-${rec.skillId}`}
                                    className="ps-card group relative flex items-start gap-3 border-white/10 p-4 transition hover:-translate-y-0.5 hover:border-ps-red/60"
                                >
                                    {Icon && (
                                        <Icon
                                            className={[colour, 'h-6 w-6 shrink-0'].join(' ')}
                                        />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                                            {rec.label}
                                            {rec.tier === 'elite' && (
                                                <span className="ml-2 rounded-sm bg-ps-red/20 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.18em] text-ps-red">
                                                    ELITE
                                                </span>
                                            )}
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-white/70">
                                            {rec.why}
                                        </p>
                                    </div>
                                    <ArrowRight
                                        size={16}
                                        className="mt-0.5 shrink-0 text-white/40 transition group-hover:text-ps-red"
                                    />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                    type="button"
                    data-testid="tactics-quiz-replay-position"
                    onClick={onReplayPosition}
                    className="ps-btn-primary text-xs"
                >
                    Retake · {positionLabel}
                </button>
                <button
                    type="button"
                    data-testid="tactics-quiz-pick-another"
                    onClick={onPickAnother}
                    className="ps-btn-secondary text-xs"
                >
                    Try another position
                </button>
            </div>
        </div>
    );
}