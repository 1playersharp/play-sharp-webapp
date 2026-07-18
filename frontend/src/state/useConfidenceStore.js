import create from 'zustand';
import { persist } from 'zustand/middleware';

// Match-scoped confidence. Every match carries one record; the record may be
// pending (rating: null) until the player rates it. Selectors ignore pending
// records so they never skew the average, trend or support nudge.
//
// Deliberately *decoupled* from useFoundationStore / useEliteStore / iq.js —
// no reads, no writes, no contribution to any IQ rollup, leaderboard, or
// shareable surface.

const DAY_MS = 24 * 60 * 60 * 1000;

const genId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const useConfidenceStore = create(
    persist(
        (set, get) => ({
            checkIns: [], // MatchConfidence[]
            lastNudgeShownAt: null,

            /** Idempotent — no-op if a record already exists for this matchId. */
            createForMatch: ({ matchId, dateISO }) => {
                if (!matchId) return;
                const state = get();
                if (state.checkIns.some((c) => c.matchId === matchId)) return;
                set({
                    checkIns: [
                        ...state.checkIns,
                        {
                            id: genId(),
                            matchId,
                            dateISO: dateISO || null,
                            rating: null,
                            reason: '',
                            createdAt: Date.now(),
                            updatedAt: null,
                        },
                    ],
                });
            },

            rateMatch: (matchId, { rating, reason }) => {
                set((s) => ({
                    checkIns: s.checkIns.map((c) =>
                        c.matchId === matchId
                            ? {
                                  ...c,
                                  rating: rating ?? c.rating,
                                  reason: reason ?? c.reason,
                                  updatedAt: Date.now(),
                              }
                            : c
                    ),
                }));
            },

            removeForMatch: (matchId) =>
                set((s) => ({
                    checkIns: s.checkIns.filter((c) => c.matchId !== matchId),
                })),

            updateDate: (matchId, dateISO) =>
                set((s) => ({
                    checkIns: s.checkIns.map((c) =>
                        c.matchId === matchId ? { ...c, dateISO } : c
                    ),
                })),

            markNudgeShown: () => set({ lastNudgeShownAt: Date.now() }),
        }),
        {
            name: 'playsharp-confidence',
            version: 2,
            // v1 → v2: activity-scoped w/ wentWell + nextTime → match-scoped w/ reason.
            // Drop non-match records; carry numbers straight across; fold the two
            // free-text fields into `reason`.
            migrate: (persistedState, version) => {
                if (!persistedState) return persistedState;
                if (version < 2) {
                    const old = Array.isArray(persistedState.checkIns)
                        ? persistedState.checkIns
                        : [];
                    const checkIns = old
                        .filter((c) => c.activityType === 'match')
                        .map((c) => ({
                            id: c.id || genId(),
                            matchId: c.activityId,
                            dateISO: c.dateISO || null,
                            rating: c.rating ?? null,
                            reason:
                                [c.wentWell, c.nextTime]
                                    .filter(Boolean)
                                    .join(' · ') || '',
                            createdAt: c.createdAt || Date.now(),
                            updatedAt: null,
                        }));
                    return { ...persistedState, checkIns };
                }
                return persistedState;
            },
            partialize: (state) => ({
                checkIns: state.checkIns,
                lastNudgeShownAt: state.lastNudgeShownAt,
            }),
        }
    )
);

/* Pure selectors — pending (rating null) records are always excluded from
   the numeric surfaces so an unrated match never drags the average down. */

const ratedOnly = (checkIns) =>
    (checkIns || []).filter((c) => c.rating != null);

export const recentCheckIns = (checkIns, n = 5) =>
    ratedOnly(checkIns)
        .sort((a, b) => {
            // dateISO first, createdAt as tie-breaker.
            const da = a.dateISO || '';
            const db = b.dateISO || '';
            if (db !== da) return db.localeCompare(da);
            return b.createdAt - a.createdAt;
        })
        .slice(0, n);

export const rollingAverage = (checkIns, n = 5) => {
    const recent = recentCheckIns(checkIns, n);
    if (recent.length < 2) return null;
    return recent.reduce((s, c) => s + c.rating, 0) / recent.length;
};

export const trend = (checkIns) => {
    const rated = recentCheckIns(checkIns, 6);
    if (rated.length < 6) return null;
    const avg = (arr) => arr.reduce((s, c) => s + c.rating, 0) / arr.length;
    const diff = avg(rated.slice(0, 3)) - avg(rated.slice(3, 6));
    if (diff > 0.3) return 'up';
    if (diff < -0.3) return 'down';
    return 'steady';
};

export const needsSupportNudge = (checkIns, lastNudgeShownAt) => {
    const now = Date.now();
    const lowRecent = ratedOnly(checkIns).filter(
        (c) => c.rating <= 2 && now - c.createdAt <= 14 * DAY_MS
    );
    if (lowRecent.length < 3) return false;
    if (!lastNudgeShownAt) return true;
    return now - lastNudgeShownAt >= 7 * DAY_MS;
};

export const findCheckInForMatch = (checkIns, matchId) =>
    (checkIns || []).find((c) => c.matchId === matchId) || null;

// Back-compat alias for older callers still using `activityId` phrasing.
export const findCheckInForActivity = findCheckInForMatch;

export default useConfidenceStore;
