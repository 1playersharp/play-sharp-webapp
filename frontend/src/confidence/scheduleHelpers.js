import { addDays, startOfDay, isBefore, isAfter } from 'date-fns';

function* iterActivities(weeks) {
    for (const [weekISO, week] of Object.entries(weeks || {})) {
        const weekStart = new Date(`${weekISO}T00:00:00`);
        for (const dayIndexStr of Object.keys(week)) {
            const dayIndex = Number(dayIndexStr);
            const day = week[dayIndex];
            const date = addDays(weekStart, dayIndex);
            for (const slot of Object.keys(day)) {
                for (const activity of day[slot]) {
                    yield { weekISO, dayIndex, slot, activity, date };
                }
            }
        }
    }
}

/** All match entries across all weeks, in chronological order. */
export const allMatches = (weeks) =>
    [...iterActivities(weeks)]
        .filter((e) => e.activity.type === 'match')
        .sort((a, b) => a.date - b.date);

/** Match entry today or tomorrow — the "within 24h" surface. */
export const nextMatchWithin24h = (weeks, now = new Date()) => {
    const today0 = startOfDay(now);
    const tomorrow0 = addDays(today0, 1);
    let best = null;
    for (const entry of iterActivities(weeks)) {
        if (entry.activity.type !== 'match') continue;
        const d0 = startOfDay(entry.date);
        if (isBefore(d0, today0)) continue;
        if (isAfter(d0, tomorrow0)) continue;
        if (!best || entry.date < best.date) best = entry;
    }
    return best;
};

/**
 * Widget contextual action: pick an unrated match to prompt.
 * Priority: soonest upcoming first, then most recent past.
 */
export const pickUnratedMatch = (weeks, checkIns, now = new Date()) => {
    const today0 = startOfDay(now);
    const ratedIds = new Set(
        (checkIns || [])
            .filter((c) => c.rating != null)
            .map((c) => c.matchId)
    );
    const matches = allMatches(weeks).filter(
        (m) => !ratedIds.has(m.activity.id)
    );
    const upcoming = matches
        .filter((m) => !isBefore(startOfDay(m.date), today0))
        .sort((a, b) => a.date - b.date);
    if (upcoming[0]) return upcoming[0];
    const past = matches
        .filter((m) => isBefore(startOfDay(m.date), today0))
        .sort((a, b) => b.date - a.date);
    return past[0] || null;
};

/** Simple lookup: confidence record for a given match id, or null. */
export const findConfidenceForMatch = (checkIns, matchId) =>
    (checkIns || []).find((c) => c.matchId === matchId) || null;
