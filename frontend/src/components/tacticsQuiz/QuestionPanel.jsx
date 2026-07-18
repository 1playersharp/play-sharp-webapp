import { motion, AnimatePresence } from 'framer-motion';

/**
 * Question + 3 choices + optional feedback/explanation. Appears once
 * TacticsQuiz's animation has settled; selection is disabled after first
 * pick so the correct/incorrect UI can settle before "Next scenario".
 */
export default function QuestionPanel({
    scenario,
    picked,
    onPick,
    onNext,
    isLast,
}) {
    const answered = picked != null;
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
                    const isCorrect = i === scenario.correct;
                    const isPicked = i === picked;
                    let state = 'idle';
                    if (answered) {
                        if (isCorrect) state = 'correct';
                        else if (isPicked) state = 'incorrect';
                        else state = 'dimmed';
                    }
                    return (
                        <button
                            key={i}
                            type="button"
                            data-testid={`tactics-quiz-choice-${i}`}
                            data-state={state}
                            disabled={answered}
                            onClick={() => onPick(i)}
                            className={[
                                'flex items-center gap-3 rounded-sm border px-4 py-3 text-left text-sm leading-snug transition',
                                'focus:outline-none focus-visible:border-ps-red focus-visible:ring-1 focus-visible:ring-ps-red',
                                state === 'idle'      && 'border-white/10 bg-white/[0.04] text-white hover:translate-x-0.5 hover:border-ps-red/60',
                                state === 'correct'   && 'border-emerald-500/70 bg-emerald-500/10 text-white',
                                state === 'incorrect' && 'border-ps-red/70 bg-ps-red/10 text-white',
                                state === 'dimmed'    && 'border-white/10 bg-white/[0.02] text-white/50 cursor-default',
                            ].filter(Boolean).join(' ')}
                        >
                            <span
                                className={[
                                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm text-xs font-bold',
                                    state === 'correct'   && 'bg-emerald-500 text-[#0a1712]',
                                    state === 'incorrect' && 'bg-ps-red text-white',
                                    (state === 'idle' || state === 'dimmed') && 'bg-white/10 text-white',
                                ].filter(Boolean).join(' ')}
                            >
                                {letter}
                            </span>
                            <span>{choice}</span>
                        </button>
                    );
                })}
            </div>

            <AnimatePresence>
                {answered && (
                    <motion.div
                        key="expl"
                        data-testid="tactics-quiz-explanation"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="mt-3 overflow-hidden rounded-sm border-l-2 border-ps-red bg-black/30 px-4 py-3 text-sm leading-relaxed text-white/75"
                    >
                        <div dangerouslySetInnerHTML={{ __html: scenario.explanation }} />
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
