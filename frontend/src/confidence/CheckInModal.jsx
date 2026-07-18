import { useState } from 'react';
import { format } from 'date-fns';
import useConfidenceStore, {
    findCheckInForMatch,
} from '@/state/useConfidenceStore';
import { RATINGS, RATING_META } from './data';
import ReframeCard from './ReframeCard';

/**
 * MatchConfidenceModal — 1–5 rating + free-text reason for a Match activity.
 * If the saved rating is ≤ 2, the same modal advances to the reframing card.
 * Reuses the schedule's existing overlay pattern.
 */
export default function CheckInModal({ entry, onClose }) {
    const rateMatch = useConfidenceStore((s) => s.rateMatch);
    const createForMatch = useConfidenceStore((s) => s.createForMatch);
    const existing = useConfidenceStore((s) =>
        findCheckInForMatch(s.checkIns, entry.activity.id)
    );

    const [phase, setPhase] = useState('rate'); // 'rate' | 'reframe'
    const [rating, setRating] = useState(existing?.rating ?? '');
    const [reason, setReason] = useState(existing?.reason || '');

    const dateISO = format(entry.date, 'yyyy-MM-dd');
    const label = entry.activity.title || 'Match';
    const dirty =
        (rating || null) !== (existing?.rating ?? null) ||
        (reason || '').trim() !== (existing?.reason || '').trim();

    const save = () => {
        if (!rating) return;
        // Ensure a record exists (idempotent).
        createForMatch({ matchId: entry.activity.id, dateISO });
        rateMatch(entry.activity.id, {
            rating: Number(rating),
            reason: reason.trim(),
        });
        if (Number(rating) <= 2) {
            setPhase('reframe');
        } else {
            onClose?.();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
            <div
                data-testid="confidence-check-in-modal"
                className="ps-card w-full max-w-lg p-6"
            >
                {phase === 'rate' && (
                    <>
                        <p className="ps-label">Match confidence</p>
                        <h2 className="mt-2 font-heading text-xl font-semibold text-white">
                            {label}
                        </h2>
                        <p className="mt-1 text-xs text-white/50">
                            {format(entry.date, 'EEE d LLL')}
                        </p>

                        {entry.activity.matchGoal && (
                            <p className="mt-4 rounded-sm border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                                    You said you'd
                                </span>
                                <br />
                                <span className="text-white/85">{entry.activity.matchGoal}</span>
                            </p>
                        )}

                        <label className="mt-5 block">
                            <span className="ps-label">Rate your confidence</span>
                            <select
                                data-testid={`match-confidence-select-${entry.activity.id}`}
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
                            <label className="mt-4 block">
                                <span className="ps-label">Why?</span>
                                <textarea
                                    data-testid={`match-confidence-reason-${entry.activity.id}`}
                                    className="ps-input mt-2"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={2}
                                    maxLength={220}
                                    placeholder="What's behind that number?"
                                />
                            </label>
                        )}

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                className="ps-btn-secondary text-xs"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                data-testid="confidence-save"
                                disabled={!rating || !dirty}
                                onClick={save}
                                className="ps-btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Save
                            </button>
                        </div>
                    </>
                )}

                {phase === 'reframe' && <ReframeCard onDone={onClose} />}
            </div>
        </div>
    );
}
