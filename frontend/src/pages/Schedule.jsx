import { useMemo, useState } from 'react';
import { format, startOfWeek, addWeeks, addDays } from 'date-fns';
import useScheduleStore, {
    SLOTS,
    ACTIVITY_TYPES,
    activityTypeMeta,
} from '@/state/useScheduleStore';
import useConfidenceStore, {
    findCheckInForMatch,
} from '@/state/useConfidenceStore';
import { RATING_META } from '@/confidence/data';
import { nextMatchWithin24h } from '@/confidence/scheduleHelpers';
import CheckInModal from '@/confidence/CheckInModal';
import MatchRoutineModal from '@/confidence/MatchRoutineModal';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ACCENT_HEX = {
    'ps-red':     '#DC1E28',
    'ps-turf':    '#23883C',
    'ps-gold':    '#aa8119',
    'ps-orange':  '#ab5212',
    'ps-blue':    '#034781',
    'ps-pink':    '#a72f6b',
    'ps-purple':  '#8b5cf6',
    'ps-redDeep': '#9E0F17',
    'ps-line':    'rgba(255,255,255,0.35)',
};

const toISODate = (d) => format(d, 'yyyy-MM-dd');

const emptySlot = () => ({ AM: [], PM: [], EVE: [] });

export default function Schedule() {
    const weeks = useScheduleStore((s) => s.weeks);
    const addActivity = useScheduleStore((s) => s.addActivity);
    const removeActivity = useScheduleStore((s) => s.removeActivity);
    const checkIns = useConfidenceStore((s) => s.checkIns);

    const [weekStart, setWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );
    const [adding, setAdding] = useState(null);
    const [form, setForm] = useState({
        type: 'team_training',
        title: '',
        note: '',
        time: '',
    });
    const [openCheckIn, setOpenCheckIn] = useState(null);   // { entry, existing }
    const [openRoutine, setOpenRoutine] = useState(null);   // entry

    const weekISO = toISODate(weekStart);
    const weekData = weeks[weekISO] || {};
    const weekEnd = addDays(weekStart, 6);
    const rangeLabel = `${format(weekStart, 'EEE d')} – ${format(weekEnd, 'EEE d LLL')}`;

    const upcomingMatch = useMemo(() => nextMatchWithin24h(weeks), [weeks]);
    const todayStart = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const openAdd = (day, slot) => {
        setAdding({ day, slot });
        setForm({ type: 'team_training', title: '', note: '', time: '' });
    };

    const submitAdd = () => {
        if (!adding) return;
        addActivity(weekISO, adding.day, adding.slot, {
            type: form.type,
            title: form.title.trim() || undefined,
            note: form.note.trim() || undefined,
            time: form.time.trim() || undefined,
        });
        setAdding(null);
    };

    return (
        <div data-testid="schedule-page" className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="ps-label">Weekly Schedule</p>
                    <h1 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                        {rangeLabel}
                    </h1>
                    <p
                        data-testid="schedule-subtitle"
                        className="mt-3 max-w-xl text-base font-medium text-white/75"
                    >
                        Schedule your week of activities.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        data-testid="schedule-prev-week"
                        className="ps-btn-secondary text-xs"
                        onClick={() => setWeekStart((d) => addWeeks(d, -1))}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        data-testid="schedule-this-week"
                        className="ps-btn-secondary text-xs"
                        onClick={() =>
                            setWeekStart(
                                startOfWeek(new Date(), { weekStartsOn: 1 })
                            )
                        }
                    >
                        This week
                    </button>
                    <button
                        type="button"
                        data-testid="schedule-next-week"
                        className="ps-btn-secondary text-xs"
                        onClick={() => setWeekStart((d) => addWeeks(d, 1))}
                    >
                        Next
                    </button>
                </div>
            </div>

            {upcomingMatch && (
                <button
                    type="button"
                    data-testid="schedule-match-routine"
                    onClick={() => setOpenRoutine(upcomingMatch)}
                    className="mt-6 flex w-full items-center justify-between gap-4 rounded-sm border border-ps-gold/50 bg-ps-gold/10 px-4 py-3 text-left transition hover:border-ps-gold hover:bg-ps-gold/20"
                >
                    <span className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-ps-gold">
                            Match within 24 hours
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold text-white">
                            {upcomingMatch.activity.title || 'Match'} · {format(upcomingMatch.date, 'EEE d LLL')}
                        </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-[0.18em] text-white">
                        Match day routine →
                    </span>
                </button>
            )}

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-7">
                {DAY_LABELS.map((label, day) => {
                    const date = addDays(weekStart, day);
                    const isPast = date < todayStart;
                    const dayData = weekData[day] || emptySlot();
                    return (
                        <div
                            key={day}
                            data-testid={`schedule-day-${day}`}
                            className="ps-card p-4"
                        >
                            <div className="flex items-baseline justify-between">
                                <span className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-white">
                                    {label}
                                </span>
                                <span className="text-xs text-white/45">
                                    {format(date, 'd LLL')}
                                </span>
                            </div>

                            {SLOTS.map((slot) => (
                                <div
                                    key={slot}
                                    data-testid={`schedule-slot-${day}-${slot}`}
                                    className="mt-3 border-t border-white/5 pt-3"
                                >
                                    <p className="ps-label">
                                        {slot === 'EVE' ? 'Evening' : slot}
                                    </p>
                                    <ul className="mt-2 space-y-1">
                                        {dayData[slot].length === 0 ? (
                                            <li className="text-xs text-white/40">
                                                No activities.
                                            </li>
                                        ) : (
                                            dayData[slot].map((a) => {
                                                const meta = activityTypeMeta(a.type);
                                                const hex = ACCENT_HEX[meta.accent] || '#DC1E28';
                                                const isMatch = a.type === 'match';
                                                const record = isMatch
                                                    ? findCheckInForMatch(checkIns, a.id)
                                                    : null;
                                                const rated = record && record.rating != null;
                                                const showPrompt = isMatch && !rated;
                                                return (
                                                    <li
                                                        key={a.id}
                                                        className="rounded-sm border border-white/10 bg-white/5 px-2 py-1"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className="inline-block h-2 w-2 rounded-sm"
                                                                        style={{ backgroundColor: hex }}
                                                                    />
                                                                    <span className="text-xs font-semibold text-white">
                                                                        {a.title || meta.label}
                                                                    </span>
                                                                    {a.time && (
                                                                        <span className="text-[10px] text-white/50">
                                                                            {a.time}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/40">
                                                                    {meta.label}
                                                                </p>
                                                                {a.note && (
                                                                    <p className="mt-1 text-[11px] text-white/55">
                                                                        {a.note}
                                                                    </p>
                                                                )}

                                                                {showPrompt && (
                                                                    <button
                                                                        type="button"
                                                                        data-testid={`schedule-check-in-open-${a.id}`}
                                                                        onClick={() =>
                                                                            setOpenCheckIn({
                                                                                entry: { weekISO, dayIndex: day, slot, activity: a, date },
                                                                            })
                                                                        }
                                                                        className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ps-turf hover:text-white"
                                                                    >
                                                                        Rate confidence →
                                                                    </button>
                                                                )}
                                                                {rated && (
                                                                    <button
                                                                        type="button"
                                                                        data-testid={`schedule-check-in-edit-${a.id}`}
                                                                        onClick={() =>
                                                                            setOpenCheckIn({
                                                                                entry: { weekISO, dayIndex: day, slot, activity: a, date },
                                                                            })
                                                                        }
                                                                        className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] hover:text-white"
                                                                        style={{
                                                                            color: RATING_META[record.rating]?.tone,
                                                                        }}
                                                                        title={`Confidence: ${RATING_META[record.rating]?.label}`}
                                                                    >
                                                                        <span
                                                                            className="grid h-4 w-4 place-items-center rounded-sm text-[9px] font-bold"
                                                                            style={{
                                                                                backgroundColor: `${RATING_META[record.rating]?.tone}22`,
                                                                                color: RATING_META[record.rating]?.tone,
                                                                                border: `1px solid ${RATING_META[record.rating]?.tone}55`,
                                                                            }}
                                                                        >
                                                                            {record.rating}
                                                                        </span>
                                                                        {RATING_META[record.rating]?.short}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                aria-label="Remove activity"
                                                                className="text-xs text-white/45 hover:text-ps-red"
                                                                onClick={() =>
                                                                    removeActivity(weekISO, day, slot, a.id)
                                                                }
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </li>
                                                );
                                            })
                                        )}
                                    </ul>
                                    <button
                                        type="button"
                                        data-testid="schedule-add-activity"
                                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-ps-turf/50 bg-ps-turf/10 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ps-turf transition hover:border-ps-turf hover:bg-ps-turf/20 hover:text-white"
                                        onClick={() => openAdd(day, slot)}
                                    >
                                        <span className="text-base leading-none">+</span>
                                        Add activity
                                    </button>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {adding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
                    <div className="ps-card w-full max-w-lg p-6">
                        <p className="ps-label">
                            Add activity · {DAY_LABELS[adding.day]} ·{' '}
                            {adding.slot === 'EVE' ? 'Evening' : adding.slot}
                        </p>

                        <div className="mt-4 space-y-4">
                            <label className="block">
                                <span className="ps-label">Type</span>
                                <select
                                    className="ps-input mt-2"
                                    value={form.type}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, type: e.target.value }))
                                    }
                                >
                                    {ACTIVITY_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="ps-label">Title (optional)</span>
                                <input
                                    className="ps-input mt-2"
                                    value={form.title}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, title: e.target.value }))
                                    }
                                    placeholder="Short label"
                                />
                            </label>

                            <label className="block">
                                <span className="ps-label">Time (optional)</span>
                                <input
                                    className="ps-input mt-2"
                                    value={form.time}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, time: e.target.value }))
                                    }
                                    placeholder="e.g. 09:00"
                                />
                            </label>

                            <label className="block">
                                <span className="ps-label">Note (optional)</span>
                                <textarea
                                    className="ps-input mt-2"
                                    value={form.note}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, note: e.target.value }))
                                    }
                                    rows={2}
                                />
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                className="ps-btn-secondary text-xs"
                                onClick={() => setAdding(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="ps-btn-primary text-xs"
                                onClick={submitAdd}
                            >
                                Save activity
                            </button>
                        </div>
                    </div>
                </div>
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
        </div>
    );
}
