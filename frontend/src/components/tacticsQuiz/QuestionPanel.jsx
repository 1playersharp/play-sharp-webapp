import { motion, AnimatePresence } from 'framer-motion';

import { MAX_WEIGHT } from '@/data/tacticsQuizScenarios';

// Tone thresholds for a single answer's weight.
//   3   → strong (green tint)
//   2   → good   (turf/soft green)
//   1   → weak   (amber)
//   0   → poor   (red)
const toneForWeight = (w) => {
    if (w >= 3) return 'strong';
    if (w === 2) return 'good';
    if (w === 1) return 'weak';
    return 'poor';
};

const TONE_BORDER = {
    strong: 'border-emerald-500/70 bg-emerald-500/10 text-white',
    good:   'border-ps-turf/70   bg-ps-turf/10   text-white',
    weak:   'border-amber-400/70 bg-amber-400/10 text-white',
    poor:   'border-ps-red/70    bg-ps-red/10    text-white',
};

const TONE_BADGE = {
    strong: 'bg-emerald-500 text-[#0a1712]',
    good:   'bg-ps-turf   text-[#0a1712]',
    weak:   'bg-amber-400 text-[#241505]',
    poor:   'bg-ps-red    text-white',
};

/**
 * Question + weighted choices + coach feedback. No right/wrong — every
 * choice has a `weight` (0..3) and a `reason`. After the pick, we highlight
 * the picked choice and, if it wasn't the top-weighted one, hint at the
 * stronger option (framed as "stronger option", never "wrong").
 */
export default function QuestionPanel({
    scenario,
    picked,
    onPick,
    onNext,
    isLast,
}) {
    const answered = picked != null;
    const bestIdx = scenario.choices.reduce(
        (best, c, i, arr) => (c.weight > arr[best].weight ? i : best),
        0,
    );
    const pickedChoice = answered ? scenario.choices[picked] : null;
    const pickedWeight = pickedChoice?.weight ?? 0;
    const pickedIsBest = answered && picked === bestIdx;

    return (
        <motion.section
            data-testid="tactics-quiz-question-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <p className="mt-4 text-base font-semibold text-white">
                {scenario.question}
            </p>

            <div className="mt-3 flex flex-col gap-2.5">
                {scenario.choices.map((choice, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isPicked = i === picked;
                    const isBest = i === bestIdx;
                    const tone = toneForWeight(choice.weight);

                    let stateAttr = 'idle';
                    let className = 'border-white/10 bg-white/[0.04] text-white hover:translate-x-0.5 hover:border-ps-red/60';
                    let badgeCls = 'bg-white/10 text-white';

                    if (answered) {
                        if (isPicked) {
                            stateAttr = `picked-${tone}`;
                            className = TONE_BORDER[tone];
                            badgeCls = TONE_BADGE[tone];
                        } else if (isBest && !pickedIsBest) {
                            // Highlight the best option so the player sees
                            // the "stronger option" they missed — soft green
                            // outline only, no fill.
                            stateAttr = 'stronger';
                            className = 'border-emerald-500/50 bg-transparent text-white/80';
                            badgeCls = 'bg-emerald-500/70 text-[#0a1712]';
                        } else {
                            stateAttr = 'dimmed';
                            className = 'border-white/10 bg-white/[0.02] text-white/50 cursor-default';
                            badgeCls = 'bg-white/10 text-white';
                        }
                    }

                    return (
                        <button
                            key={i}
                            type="button"
                            data-testid={`tactics-quiz-choice-${i}`}
                            data-state={stateAttr}
                            data-weight={choice.weight}
                            disabled={answered}
                            onClick={() => onPick(i)}
                            className={[
                                'flex items-start gap-3 rounded-sm border px-4 py-3 text-left text-sm leading-snug transition',
                                'focus:outline-none focus-visible:border-ps-red focus-visible:ring-1 focus-visible:ring-ps-red',
                                className,
                            ].join(' ')}
                        >
                            <span
                                className={[
                                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm text-xs font-bold',
                                    badgeCls,
                                ].join(' ')}
                            >
                                {letter}
                            </span>
                            <span className="flex-1">
                                <span className="block">{choice.text}</span>
                                {answered && (isPicked || (isBest && !pickedIsBest)) && (
                                    <span
                                        data-testid={`tactics-quiz-reason-${i}`}
                                        className="mt-1.5 block text-xs leading-relaxed text-white/70"
                                    >
                                        {isBest && !pickedIsBest && (
                                            <span className="mr-2 rounded-sm bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                                                Stronger option
                                            </span>
                                        )}
                                        {choice.reason}
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            <AnimatePresence>
                {answered && (
                    <motion.div
                        key="feedback"
                        data-testid="tactics-quiz-explanation"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="mt-3 overflow-hidden rounded-sm border-l-2 border-ps-red bg-black/30 px-4 py-3 text-sm leading-relaxed text-white/80"
                    >
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
                            Coach&apos;s read
                        </p>
                        <p className="mt-1">
                            {pickedIsBest
                                ? "Best read — that's the pro choice here."
                                : pickedWeight >= 2
                                    ? "Solid — playable. A stronger option was on the board though."
                                    : pickedWeight === 1
                                        ? "That works some of the time. Look for the stronger option next time."
                                        : "Risky call — the stronger option is highlighted above."}
                        </p>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/45">
                            {pickedWeight}/{MAX_WEIGHT} weighting
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {answered && (
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        data-testid="tactics-quiz-next"
                        onClick={onNext}
                        className="ps-btn-primary text-xs"
                    >
                        {isLast ? 'See results ›' : 'Next scenario ›'}
                    </button>
                </div>
            )}
        </motion.section>
    );
}
