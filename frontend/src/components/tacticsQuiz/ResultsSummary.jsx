import { Check, X } from 'lucide-react';

/** Per-position final screen: score + per-scenario list + replay actions. */
export default function ResultsSummary({
    positionLabel,
    score,
    total,
    results,
    onReplayPosition,
    onPickAnother,
}) {
    let note = '';
    if (score === total) note = "Full marks — you're reading the game like a pro.";
    else if (score >= total / 2) note = 'Solid decision making — a couple of moments to sharpen up.';
    else note = 'Plenty to work on — replay the scenarios and reconsider your calls.';

    return (
        <div
            data-testid="tactics-quiz-results"
            className="ps-card p-6 text-center"
        >
            <p className="ps-label text-ps-red">Final whistle</p>
            <p className="ps-section-title mt-2 text-5xl text-white">
                <span data-testid="tactics-quiz-score" className="text-ps-red">{score}</span>
                <span className="text-white/60"> / {total}</span>
            </p>
            <p className="mt-2 text-sm text-white/70">{note}</p>

            <ul className="mt-6 flex flex-col gap-2 text-left">
                {results.map((r, i) => (
                    <li
                        key={i}
                        data-testid={`tactics-quiz-result-${i}`}
                        className="flex items-center gap-3 rounded-sm bg-white/[0.04] px-3 py-2.5 text-sm text-white/80"
                    >
                        <span
                            className={[
                                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
                                r.correct ? 'bg-emerald-500 text-[#0a1712]' : 'bg-ps-red text-white',
                            ].join(' ')}
                        >
                            {r.correct ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                        </span>
                        <span>{r.title}</span>
                    </li>
                ))}
            </ul>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                    type="button"
                    data-testid="tactics-quiz-replay-position"
                    onClick={onReplayPosition}
                    className="ps-btn-primary text-xs"
                >
                    Replay {positionLabel}
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
