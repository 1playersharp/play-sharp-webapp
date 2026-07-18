import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import useObjectivesStore from '@/state/useObjectivesStore';
import useScheduleStore from '@/state/useScheduleStore';
import { GENERIC_CONTROLLABLES } from './data';

const objectiveCue = (o) => {
    const target = [o.target, o.unit].filter(Boolean).join(' ');
    return target ? `${o.title} — ${target}` : o.title;
};

/**
 * MatchRoutineModal — self-paced 3-step ritual. Never auto-plays, always
 * skippable, no forced timers.
 *   1. Settle: box-breath focus reset. No health claims.
 *   2. Focus cues: pick up to 3 (pulled from active objectives, match first).
 *   3. One goal: single line, saved onto the match activity so it can be
 *      echoed by the post-match check-in.
 */
export default function MatchRoutineModal({ entry, onClose }) {
    const objectives = useObjectivesStore((s) => s.objectives);
    const updateActivity = useScheduleStore((s) => s.updateActivity);
    const { activity, weekISO, dayIndex, slot, date } = entry;

    const focusCandidates = useMemo(() => {
        const active = objectives.filter((o) => !o.completed);
        const rank = { match: 0, individual: 1, team: 2, season: 3 };
        return [...active]
            .sort((a, b) => (rank[a.category] ?? 9) - (rank[b.category] ?? 9))
            .slice(0, 6);
    }, [objectives]);

    const usingGenerics = focusCandidates.length === 0;

    const [step, setStep] = useState(1);
    const [selectedCues, setSelectedCues] = useState([]);
    const [goal, setGoal] = useState(activity.matchGoal || '');

    // Prefill goal from the first selected cue when the player reaches step 3
    // without having typed one yet.
    useEffect(() => {
        if (step === 3 && !goal && selectedCues.length > 0) {
            setGoal(selectedCues[0]);
        }
        // Intentional single-shot: don't overwrite once the player edits.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const toggleCue = (cue) => {
        setSelectedCues((cur) => {
            if (cur.includes(cue)) return cur.filter((c) => c !== cue);
            if (cur.length >= 3) return cur;
            return [...cur, cue];
        });
    };

    const finish = () => {
        const trimmed = goal.trim();
        if (trimmed) {
            updateActivity(weekISO, dayIndex, slot, activity.id, {
                matchGoal: trimmed,
            });
        }
        onClose?.();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
            <div
                data-testid="confidence-match-routine"
                className="ps-card w-full max-w-lg p-6"
            >
                <div className="flex items-baseline justify-between">
                    <p className="ps-label">Match day routine</p>
                    <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                        Step {step} of 3
                    </span>
                </div>
                <p className="mt-1 text-xs text-white/50">
                    {activity.title || 'Match'} · {format(date, 'EEE d LLL')}
                </p>

                {/* progress */}
                <div className="mt-4 flex gap-1">
                    {[1, 2, 3].map((s) => (
                        <span
                            key={s}
                            className={[
                                'h-1 flex-1 rounded-full',
                                s <= step ? 'bg-ps-turf' : 'bg-white/10',
                            ].join(' ')}
                        />
                    ))}
                </div>

                {step === 1 && <StepSettle onNext={() => setStep(2)} onSkip={() => setStep(2)} />}
                {step === 2 && (
                    <StepFocus
                        cues={usingGenerics ? GENERIC_CONTROLLABLES : focusCandidates.map(objectiveCue)}
                        selected={selectedCues}
                        toggle={toggleCue}
                        usingGenerics={usingGenerics}
                        onBack={() => setStep(1)}
                        onNext={() => setStep(3)}
                    />
                )}
                {step === 3 && (
                    <StepGoal
                        goal={goal}
                        setGoal={setGoal}
                        onBack={() => setStep(2)}
                        onDone={finish}
                    />
                )}
            </div>
        </div>
    );
}

/* Step 1 — Settle (box breath) --------------------------------------------- */
const PHASES = [
    { key: 'in',       label: 'Breathe in',  ms: 4000, scale: 1.35 },
    { key: 'hold-in',  label: 'Hold',        ms: 4000, scale: 1.35 },
    { key: 'out',      label: 'Breathe out', ms: 4000, scale: 0.85 },
    { key: 'hold-out', label: 'Hold',        ms: 4000, scale: 0.85 },
];

function StepSettle({ onNext, onSkip }) {
    const [phaseIdx, setPhaseIdx] = useState(0);
    useEffect(() => {
        const t = setTimeout(
            () => setPhaseIdx((i) => (i + 1) % PHASES.length),
            PHASES[phaseIdx].ms
        );
        return () => clearTimeout(t);
    }, [phaseIdx]);

    const phase = PHASES[phaseIdx];
    return (
        <div>
            <h2 className="mt-5 font-heading text-2xl font-semibold text-white">Settle</h2>
            <p className="mt-1 text-sm text-white/65">Slow it down. Nothing to fix yet.</p>

            <div className="mt-8 flex flex-col items-center">
                <div
                    className="relative flex h-40 w-40 items-center justify-center"
                    aria-hidden="true"
                >
                    <div
                        className="h-32 w-32 rounded-full border-2 border-ps-turf/70 bg-ps-turf/10 transition-transform duration-[4000ms] ease-in-out"
                        style={{ transform: `scale(${phase.scale})` }}
                    />
                    <span className="pointer-events-none absolute font-heading text-xs font-bold uppercase tracking-[0.24em] text-white/85">
                        {phase.label}
                    </span>
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                    Four in · four hold · four out · four hold
                </p>
            </div>

            <div className="mt-8 flex justify-between">
                <button
                    type="button"
                    onClick={onSkip}
                    className="text-xs text-white/50 hover:text-white"
                >
                    Skip
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    className="ps-btn-primary text-xs"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

/* Step 2 — Focus cues ------------------------------------------------------ */
function StepFocus({ cues, selected, toggle, usingGenerics, onBack, onNext }) {
    return (
        <div>
            <h2 className="mt-5 font-heading text-2xl font-semibold text-white">
                Pick up to three
            </h2>
            <p className="mt-1 text-sm text-white/65">
                {usingGenerics
                    ? 'Simple things you can control today.'
                    : 'From your objectives — what will you focus on?'}
            </p>

            <div className="mt-5 space-y-2">
                {cues.map((c) => {
                    const on = selected.includes(c);
                    const atLimit = !on && selected.length >= 3;
                    return (
                        <button
                            key={c}
                            type="button"
                            data-testid={`confidence-cue-${c}`}
                            disabled={atLimit}
                            onClick={() => toggle(c)}
                            className={[
                                'flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left text-sm transition',
                                on
                                    ? 'border-ps-turf bg-ps-turf/10 text-white'
                                    : 'border-white/10 text-white/80 hover:border-white/25 hover:bg-white/[0.03]',
                                atLimit && !on ? 'opacity-40' : '',
                            ].join(' ')}
                        >
                            <span
                                className={[
                                    'grid h-5 w-5 shrink-0 place-items-center rounded-sm border text-[10px] font-bold',
                                    on ? 'border-ps-turf bg-ps-turf text-white' : 'border-white/30 text-transparent',
                                ].join(' ')}
                            >
                                ✓
                            </span>
                            <span>{c}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 flex justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-xs text-white/55 hover:text-white"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={selected.length === 0}
                    className="ps-btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

/* Step 3 — One goal -------------------------------------------------------- */
function StepGoal({ goal, setGoal, onBack, onDone }) {
    return (
        <div>
            <h2 className="mt-5 font-heading text-2xl font-semibold text-white">One thing</h2>
            <p className="mt-1 text-sm text-white/65">
                One thing I'll do today. You'll see this again after the match.
            </p>

            <input
                data-testid="confidence-match-goal"
                className="ps-input mt-5"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                maxLength={120}
                placeholder="e.g. Scan before I receive"
            />

            <div className="mt-6 flex justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-xs text-white/55 hover:text-white"
                >
                    Back
                </button>
                <button
                    type="button"
                    data-testid="confidence-match-goal-save"
                    onClick={onDone}
                    disabled={!goal.trim()}
                    className="ps-btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Ready
                </button>
            </div>
        </div>
    );
}
