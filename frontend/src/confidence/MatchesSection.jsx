import { useMemo, useState } from 'react';
import { format, startOfDay, isBefore } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import useScheduleStore from '@/state/useScheduleStore';
import useConfidenceStore, {
    findCheckInForMatch,
} from '@/state/useConfidenceStore';
import useObjectivesStore from '@/state/useObjectivesStore';
import { allMatches } from './scheduleHelpers';
import { RATINGS, RATING_META } from './data';
import ReframeCard from './ReframeCard';

export default function MatchesSection() {
    const weeks = useScheduleStore((s) => s.weeks);
    const checkIns = useConfidenceStore((s) => s.checkIns);
    const rateMatch = useConfidenceStore((s) => s.rateMatch);
    const createForMatch = useConfidenceStore((s) => s.createForMatch);
    const objectives = useObjectivesStore((s) => s.objectives);

    const [reframeFor, setReframeFor] = useState(null);

    const matches = useMemo(() => allMatches(weeks), [weeks]);
    const now = new Date();
    const today0 = startOfDay(now);

    // Sort: upcoming first (asc), then past (desc).
    const ordered = useMemo(() => {
        const upcoming = matches
            .filter((m) => !isBefore(startOfDay(m.date), today0))
            .sort((a, b) => a.date - b.date);
        const past = matches
            .filter((m) => isBefore(startOfDay(m.date), today0))
            .sort((a, b) => b.date - a.date);
        return [...upcoming, ...past];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matches]);

    return (
        <section data-testid="objectives-matches">
            <div className="flex items-baseline justify-between">
                <p className="ps-label">Matches</p>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                    {ordered.length} scheduled
                </span>
            </div>

            {ordered.length === 0 ? (
                <div className="ps-card mt-3 p-6 text-sm text-white/60">
                    Add a match to your{' '}
                    <Link to="/schedule" className="text-ps-turf hover:text-white">
                        schedule
                    </Link>{' '}
                    and it'll show up here.
                </div>
            ) : (
                <div className="mt-3 space-y-4">
                    {ordered.map((m) => {
                        const record =
                            findCheckInForMatch(checkIns, m.activity.id) || null;
                        const linked = objectives.filter(
                            (o) => o.matchId === m.activity.id
                        );
                        return (
                            <MatchCard
                                key={m.activity.id}
                                entry={m}
                                record={record}
                                linked={linked}
                                today0={today0}
                                onSave={({ rating, reason }) => {
                                    createForMatch({
                                        matchId: m.activity.id,
                                        dateISO: format(m.date, 'yyyy-MM-dd'),
                                    });
                                    rateMatch(m.activity.id, { rating, reason });
                                    toast.success('Confidence saved');
                                    if (rating <= 2) setReframeFor(m.activity.id);
                                }}
                            />
                        );
                    })}
                </div>
            )}

            {reframeFor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
                    <div className="ps-card w-full max-w-lg p-6">
                        <ReframeCard onDone={() => setReframeFor(null)} />
                    </div>
                </div>
            )}
        </section>
    );
}

function MatchCard({ entry, record, linked, today0, onSave }) {
    const matchId = entry.activity.id;
    const label = entry.activity.title || 'Match';
    const isPast = isBefore(startOfDay(entry.date), today0);

    const [rating, setRating] = useState(record?.rating ? String(record.rating) : '');
    const [reason, setReason] = useState(record?.reason || '');

    const dirty =
        (rating || null) !== (record?.rating ? String(record.rating) : null) ||
        (reason || '').trim() !== (record?.reason || '').trim();

    const canSave = !!rating && dirty;

    const submit = () => {
        if (!canSave) return;
        onSave({ rating: Number(rating), reason: reason.trim() });
    };

    return (
        <div className="ps-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-lg font-semibold text-white">
                        {label}
                    </h3>
                    <p className="mt-0.5 text-xs text-white/55">
                        {format(entry.date, 'EEE d LLL')} ·{' '}
                        {entry.slot === 'EVE' ? 'Evening' : entry.slot}
                    </p>
                </div>
                <span
                    className="rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{
                        borderColor: isPast ? '#8b8f96' : '#aa8119',
                        color: isPast ? '#c0c6d0' : '#aa8119',
                    }}
                >
                    {isPast ? 'Played' : 'Upcoming'}
                </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                    <span className="ps-label">Confidence</span>
                    <select
                        data-testid={`match-confidence-select-${matchId}`}
                        className="ps-input mt-2"
                        value={rating}
                        onChange={(e) => setRating(e.target.value)}
                    >
                        <option value="">Rate your confidence</option>
                        {RATINGS.map((r) => (
                            <option key={r} value={r}>
                                {r} — {RATING_META[r].label}
                            </option>
                        ))}
                    </select>
                </label>
                {rating && (
                    <label className="block">
                        <span className="ps-label">Why?</span>
                        <textarea
                            data-testid={`match-confidence-reason-${matchId}`}
                            className="ps-input mt-2"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                            maxLength={220}
                            placeholder="What's behind that number?"
                        />
                    </label>
                )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
                {record?.rating != null ? (
                    <span
                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]"
                        style={{ color: RATING_META[record.rating].tone }}
                    >
                        <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: RATING_META[record.rating].tone }}
                        />
                        Saved · {RATING_META[record.rating].short}
                    </span>
                ) : (
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                        Not rated yet
                    </span>
                )}
                <button
                    type="button"
                    data-testid={`match-confidence-save-${matchId}`}
                    disabled={!canSave}
                    onClick={submit}
                    className="ps-btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {record?.rating != null ? 'Update confidence' : 'Save confidence'}
                </button>
            </div>

            <MatchObjectives matchId={matchId} objectives={linked} />
        </div>
    );
}

function MatchObjectives({ matchId, objectives }) {
    const allObjectives = useObjectivesStore((s) => s.objectives);
    const incrementObjective = useObjectivesStore((s) => s.incrementObjective);
    const completeObjective = useObjectivesStore((s) => s.completeObjective);
    const updateObjective = useObjectivesStore((s) => s.updateObjective);
    const removeObjective = useObjectivesStore((s) => s.removeObjective);
    const addObjective = useObjectivesStore((s) => s.addObjective);

    // Filled match objectives across all matches count toward the cap.
    const filledMatchCount = allObjectives.filter(
        (o) => o.category === 'match' && (o.title || '').trim().length > 0
    ).length;
    const atCap = filledMatchCount >= 10;

    const addPlaceholder = () =>
        addObjective({
            category: 'match',
            title: '',
            target: 1,
            unit: '',
            matchId,
        });

    return (
        <div className="mt-5 border-t border-white/5 pt-4">
            <div className="flex items-baseline justify-between">
                <p className="ps-label">Objectives for this match</p>
                <button
                    type="button"
                    data-testid={`match-add-objective-${matchId}`}
                    onClick={addPlaceholder}
                    disabled={atCap}
                    title={atCap ? 'Match objectives cap reached (10)' : undefined}
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-ps-turf hover:text-white disabled:cursor-not-allowed disabled:text-white/30 disabled:hover:text-white/30"
                >
                    + Add objective
                </button>
            </div>

            {objectives.length === 0 ? (
                <p className="mt-2 text-xs text-white/50">
                    No objectives set for this match yet.
                </p>
            ) : (
                <div className="mt-3 space-y-2">
                    {objectives.map((o) =>
                        o.title ? (
                            <FilledObjectiveRow
                                key={o.id}
                                o={o}
                                onIncrement={() => incrementObjective(o.id, 1)}
                                onComplete={() => completeObjective(o.id)}
                                onRemove={() => removeObjective(o.id)}
                            />
                        ) : (
                            <PlaceholderObjectiveRow
                                key={o.id}
                                o={o}
                                onSave={(patch) => updateObjective(o.id, patch)}
                                onRemove={() => removeObjective(o.id)}
                            />
                        )
                    )}
                </div>
            )}
        </div>
    );
}

function FilledObjectiveRow({ o, onIncrement, onComplete, onRemove }) {
    const pct = Math.min(100, Math.round((o.current / Math.max(1, o.target)) * 100));
    return (
        <div
            data-testid={`objective-item-${o.id}`}
            className={`rounded-sm border border-white/10 bg-white/[0.03] p-3 ${
                o.completed ? 'opacity-70' : ''
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p
                        className={`text-sm font-semibold text-white ${
                            o.completed ? 'line-through' : ''
                        }`}
                    >
                        {o.title}
                    </p>
                    <p className="text-[10px] text-white/50">
                        {o.current} / {o.target} {o.unit}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onIncrement}
                        disabled={o.completed}
                        className="ps-btn-secondary text-[10px] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        +1
                    </button>
                    <button
                        type="button"
                        onClick={onComplete}
                        className={
                            o.completed
                                ? 'ps-btn-secondary text-[10px]'
                                : 'ps-btn-primary text-[10px]'
                        }
                    >
                        {o.completed ? 'Reopen' : 'Done'}
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-[10px] text-white/45 hover:text-ps-red"
                    >
                        ×
                    </button>
                </div>
            </div>
            <div className="mt-2 h-1 bg-white/10">
                <div className="h-full bg-ps-turf" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function PlaceholderObjectiveRow({ o, onSave, onRemove }) {
    const [title, setTitle] = useState('');
    const [target, setTarget] = useState(o.target || 5);
    const [unit, setUnit] = useState('');

    const save = () => {
        if (!title.trim()) return;
        onSave({
            title: title.trim(),
            target: Math.max(1, Number(target) || 1),
            unit: unit.trim(),
        });
    };

    return (
        <div className="rounded-sm border border-dashed border-white/20 bg-white/[0.02] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                What's your objective for this match?
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <input
                    className="ps-input sm:col-span-2"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Objective title"
                />
                <input
                    className="ps-input"
                    type="number"
                    min={1}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Target"
                />
                <input
                    className="ps-input"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Unit"
                />
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-[10px] text-white/45 hover:text-ps-red"
                >
                    Remove
                </button>
                <button
                    type="button"
                    onClick={save}
                    disabled={!title.trim()}
                    className="ps-btn-primary text-[10px] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Set objective
                </button>
            </div>
        </div>
    );
}
