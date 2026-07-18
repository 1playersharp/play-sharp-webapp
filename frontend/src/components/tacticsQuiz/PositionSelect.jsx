import { Lock } from 'lucide-react';
import { POSITIONS, POSITION_ORDER } from '@/data/tacticsQuizScenarios';
import useTacticsQuizStore from '@/state/useTacticsQuizStore';

/**
 * Grid of position cards, one per Tactics Quiz bucket. Goalkeeper is
 * rendered as a "coming soon" stub. If the user has already played a
 * bucket, its card shows their best score.
 */
export default function PositionSelect({ suggestedKey, onPick }) {
    const results = useTacticsQuizStore((s) => s.results);

    return (
        <div
            data-testid="tactics-quiz-position-select"
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
            {POSITION_ORDER.map((key) => {
                const p = POSITIONS[key];
                const record = results?.[key];
                const played = record?.attempts > 0;
                const isSuggested = suggestedKey === key;
                if (p.comingSoon) {
                    return (
                        <div
                            key={key}
                            data-testid={`tactics-quiz-position-${key}`}
                            data-locked="true"
                            aria-disabled="true"
                            className="ps-card relative flex flex-col overflow-hidden border-white/10 p-6 opacity-70"
                        >
                            <div className="flex items-center gap-2">
                                <Lock size={12} strokeWidth={2.4} className="text-white/50" />
                                <p className="ps-label text-white/50">{p.squad}</p>
                            </div>
                            <h3 className="ps-section-title mt-2 text-2xl uppercase text-white/80">
                                {p.label}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-white/55">{p.desc}</p>
                            <span className="mt-4 inline-flex w-fit rounded-sm bg-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-white/70">
                                Coming soon
                            </span>
                        </div>
                    );
                }
                return (
                    <button
                        key={key}
                        type="button"
                        data-testid={`tactics-quiz-position-${key}`}
                        onClick={() => onPick(key)}
                        className="ps-card group relative flex flex-col overflow-hidden border-white/10 p-6 text-left transition hover:-translate-y-0.5 hover:border-ps-red/60 focus:border-ps-red focus:outline-none"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <p className="ps-label text-ps-red">{p.squad}</p>
                            {isSuggested && (
                                <span
                                    data-testid={`tactics-quiz-suggested-${key}`}
                                    className="rounded-sm bg-ps-red/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ps-red"
                                >
                                    Your position
                                </span>
                            )}
                        </div>
                        <h3 className="ps-section-title mt-2 text-2xl uppercase text-white">
                            {p.label}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">{p.desc}</p>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-white/45">
                                {p.scenarios.length} scenarios
                            </span>
                            {played && (
                                <span
                                    data-testid={`tactics-quiz-best-${key}`}
                                    className="text-xs font-mono text-white/70"
                                >
                                    Best <strong className="text-white">{record.bestScore}</strong> / {record.total || p.scenarios.length}
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
