// Confidence-first scale. Low is information, not failure — tones are muted
// greys/blues, never red or alarming.
export const RATING_META = {
    1: { label: 'Not confident',    short: 'Not confident',    tone: '#8A93A6' },
    2: { label: 'Low confidence',   short: 'Low',              tone: '#6E86B8' },
    3: { label: 'Fairly confident', short: 'Fairly',           tone: '#4C9AD4' },
    4: { label: 'Confident',        short: 'Confident',        tone: '#2FB89A' },
    5: { label: 'Highly confident', short: 'Highly confident', tone: '#00E5A0' },
};

export const RATINGS = [1, 2, 3, 4, 5];

/** Accepts a float (rolling average) and returns the nearest whole-number label. */
export function labelForRating(value) {
    if (value == null) return '—';
    const n = Math.max(1, Math.min(5, Math.round(value)));
    return RATING_META[n].label;
}

// Neutral, controllable, football-only fallbacks (kid-safe).
export const GENERIC_CONTROLLABLES = [
    'Scan before I receive',
    'First touch forward',
    'Talk to my teammates',
];

// Only these activity types trigger a check-in. Match-only for now —
// training was intentionally dropped so the track stays focused on the
// player's match-day confidence rather than every session.
export const PROMPT_ACTIVITY_TYPES = new Set([
    'match',
]);
