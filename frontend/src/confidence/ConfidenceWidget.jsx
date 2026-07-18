import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';

import useConfidenceStore, {
    recentCheckIns,
    rollingAverage,
    trend,
    needsSupportNudge,
} from '@/state/useConfidenceStore';
import useScheduleStore from '@/state/useScheduleStore';
import { labelForRating, RATING_META } from './data';
import {
    nextMatchWithin24h,
    pickUnratedMatch,
} from './scheduleHelpers';
import CheckInModal from './CheckInModal';
import MatchRoutineModal from './MatchRoutineModal';

const TREND_META = {
    up:     { icon: '↑', label: 'On the rise', tone: 'text-ps-turf' },
    steady: { icon: '→', label: 'Steady',       tone: 'text-white/60' },
    down:   { icon: '↓', label: 'Working through a dip', tone: 'text-white/50' }, // neutral, never red
};

export default function ConfidenceWidget() {
    const checkIns = useConfidenceStore((s) => s.checkIns);
    const lastNudgeShownAt = useConfidenceStore((s) => s.lastNudgeShownAt);
    const markNudgeShown = useConfidenceStore((s) => s.markNudgeShown);
    const weeks = useScheduleStore((s) => s.weeks);

    const recent = useMemo(() => recentCheckIns(checkIns, 8), [checkIns]);
    const avg = useMemo(() => rollingAverage(checkIns, 5), [checkIns]);
    const t = useMemo(() => trend(checkIns), [checkIns]);
    const nudge = useMemo(
        () => needsSupportNudge(checkIns, lastNudgeShownAt),
        [checkIns, lastNudgeShownAt]
    );

    const nextMatch = useMemo(() => nextMatchWithin24h(weeks), [weeks]);
    const unratedMatch = useMemo(
        () => pickUnratedMatch(weeks, checkIns),
        [weeks, checkIns]
    );

    const [openCheckIn, setOpenCheckIn] = useState(null);   // { entry }
    const [openRoutine, setOpenRoutine] = useState(null);   // entry
    const [selectedDot, setSelectedDot] = useState(null);

    const dismissNudge = () => markNudgeShown();

    return (
        <>
            <div
                data-testid="profile-confidence"
                className="ps-card p-6"
            >
                <div className="flex items-baseline justify-between">
                    <p className="ps-label">Confidence</p>
                    {t && TREND_META[t] && (
                        <span
                            data-testid="confidence-trend"
                            className={`text-[10px] font-bold uppercase tracking-[0.22em] ${TREND_META[t].tone}`}
                        >
                            {TREND_META[t].icon} {TREND_META[t].label}
                        </span>
                    )}
                </div>

                {avg != null ? (
                    <>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span
                                data-testid="confidence-headline"
                                className="text-3xl font-bold text-white"
                            >
                                {labelForRating(avg)}
                            </span>
                            <span className="font-mono text-xs text-white/45">
                                avg {avg.toFixed(1)}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-white/55">
                            Rolling average of your last {recent.length} match{recent.length === 1 ? '' : 'es'}.
                        </p>

                        <Sparkline
                            recent={recent}
                            selected={selectedDot}
                            onPick={(c) => setSelectedDot(c)}
                        />
                        {selectedDot && (
                            <div className="mt-3 rounded-sm border border-white/10 bg-white/[0.03] p-3 text-xs">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                                    {format(new Date(selectedDot.dateISO || selectedDot.createdAt), 'EEE d LLL')} · {RATING_META[selectedDot.rating]?.label}
                                </p>
                                {selectedDot.reason && (
                                    <p className="mt-1 text-white/80">{selectedDot.reason}</p>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <p className="mt-3 text-sm text-white/60">
                        Log how a match went and it'll show up here.
                    </p>
                )}

                {/* contextual action — priority: routine > rate an unrated match > nothing */}
                <div className="mt-5 flex flex-wrap gap-2">
                    {nextMatch ? (
                        <button
                            type="button"
                            data-testid="confidence-open-routine"
                            onClick={() => setOpenRoutine(nextMatch)}
                            className="ps-btn-primary text-xs"
                        >
                            Match day routine
                        </button>
                    ) : unratedMatch ? (
                        <button
                            type="button"
                            data-testid="confidence-open-checkin"
                            onClick={() => setOpenCheckIn({ entry: unratedMatch })}
                            className="ps-btn-secondary text-xs"
                        >
                            Rate your confidence for {unratedMatch.activity.title || 'your match'}
                        </button>
                    ) : null}
                </div>

                <p className="mt-5 border-t border-white/5 pt-3 text-[10px] text-white/40">
                    Confidence is yours. It doesn't affect your PlaySharp IQ.
                </p>
            </div>

            {nudge && (
                <SupportNudge onDismiss={dismissNudge} />
            )}

            {openCheckIn && (
                <CheckInModal
                    entry={openCheckIn.entry}
                    onClose={() => setOpenCheckIn(null)}
                />
            )}
            {openRoutine && (
                <MatchRoutineModal
                    entry={openRoutine}
                    onClose={() => setOpenRoutine(null)}
                />
            )}
        </>
    );
}

/* Sparkline of the last 5–8 check-ins. Tapping shows details. */
function Sparkline({ recent, selected, onPick }) {
    if (recent.length === 0) return null;
    // Reverse so oldest → newest reads left-to-right.
    const points = [...recent].reverse();
    return (
        <div
            data-testid="confidence-sparkline"
            className="mt-4 flex items-end gap-2"
            style={{ height: 48 }}
        >
            {points.map((c) => {
                const meta = RATING_META[c.rating];
                const active = selected?.id === c.id;
                const heightPct = (c.rating / 5) * 100;
                return (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => onPick(active ? null : c)}
                        aria-label={`Check-in ${format(new Date(c.dateISO || c.createdAt), 'd LLL')} — ${meta.label}`}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    >
                        <span
                            className={[
                                'w-full rounded-sm transition-all',
                                active ? 'opacity-100' : 'opacity-75',
                            ].join(' ')}
                            style={{
                                height: `${heightPct}%`,
                                backgroundColor: meta.tone,
                            }}
                        />
                        <span className="text-[8px] uppercase tracking-widest text-white/40">
                            {format(new Date(c.dateISO || c.createdAt), 'd')}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function SupportNudge({ onDismiss }) {
    return (
        <div
            data-testid="confidence-support-nudge"
            className="ps-card mt-4 flex items-start gap-3 border-white/10 p-5"
        >
            <div className="min-w-0 flex-1">
                <p className="ps-label text-white/70">A quiet note</p>
                <p className="mt-2 text-sm text-white/85">
                    You've had a few tough sessions lately. That happens to
                    every player.
                </p>
                <p className="mt-2 text-sm text-white/70">
                    It's worth telling your coach, a parent, or another adult
                    you trust how you're finding it — they can help.
                </p>
            </div>
            <button
                type="button"
                aria-label="Dismiss"
                onClick={onDismiss}
                className="shrink-0 text-white/45 hover:text-white"
            >
                <X size={16} />
            </button>
        </div>
    );
}
