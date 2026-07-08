import { ATTRIBUTE_KEYS, ARCHETYPES, QUESTIONS } from './data';

// Turn `{ q1: 'a', q2: 'c', ... }` into per-attribute 0–100 scores.
// Base 55 + 8 per award-hit, clamped to 100. Any unrewarded attribute stays
// at the baseline so the radar/bars never look empty.
export function computeAttributes(answers) {
    const hits = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 0]));
    for (const q of QUESTIONS) {
        const optId = answers[q.id];
        if (!optId) continue;
        const opt = q.options.find((o) => o.id === optId);
        if (!opt) continue;
        for (const attr of opt.awards) hits[attr] += 1;
    }
    const scores = {};
    for (const k of ATTRIBUTE_KEYS) {
        scores[k] = Math.min(100, 55 + hits[k] * 8);
    }
    return scores;
}

// Archetype pick:
//  - regular archetypes score = avg of their 3 signature attribute scores
//  - "complete" = avg(all) minus 2*stddev (rewards balance)
// Highest wins.
export function pickArchetype(attrs) {
    const values = Object.values(attrs);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const variance =
        values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);

    let winner = null;
    let winnerScore = -Infinity;

    for (const a of ARCHETYPES) {
        const score =
            a.id === 'complete'
                ? avg - stddev * 2
                : a.signatureAttrs.reduce((s, k) => s + (attrs[k] || 0), 0) /
                  a.signatureAttrs.length;
        if (score > winnerScore) {
            winnerScore = score;
            winner = a.id;
        }
    }
    return winner;
}

export function topAttributes(attrs, n = 5) {
    return Object.entries(attrs)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, n);
}
