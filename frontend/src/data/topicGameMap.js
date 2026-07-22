// Maps quiz topics to concrete training games the player can jump into
// from the results screen. Sourced from the Elite registry (gameRegistry.js)
// so labels and icons stay in sync with the rest of the app.
//
// IMPORTANT: only games that actually have a mounted <Route> in App.jsx are
// routed here. `positioning` and `crossing` elite skills exist in the
// registry but have no route, so we fall back to the closest routed skill
// (scanning / movement respectively).

import { GAME_REGISTRY } from '@/elite/engine/gameRegistry';
import { TOPICS, TOPIC_LABELS } from '@/data/tacticsQuizScenarios';

// Skill ids that DO have a routed page. Update if new elite routes are
// mounted in App.jsx.
const ROUTED_ELITE_SKILLS = {
    decision:   '/elite/games/decision',
    pressing:   '/elite/games/pressing',
    movement:   '/elite/games/movement',
    body_shape: '/elite/games/body-shape',
    striker:    '/elite/games/striker',
    scanning:   '/elite/games/scanning',
    duels:      '/elite/games/defending-duels',
    runs:       '/elite/games/winger-runs',
};

// Foundation games all run inside the /iq-training accordion (no per-game
// route). Recommending them still links to /iq-training.
const FOUNDATION_HUB_PATH = '/iq-training';

// One or more elite skills (highest priority first) that best target the
// topic. Every topic falls onto at least one routed elite skill.
const TOPIC_TO_ELITE_SKILL = {
    // Defender — "1v1" and "marking" quiz topics point at the two new
    // dedicated defending games; the rest fall back to the closest routed
    // skills.
    [TOPICS.ONE_V_ONE_DEF]:    ['duels', 'pressing'],
    [TOPICS.READING_PLAY]:     ['scanning', 'decision'],
    [TOPICS.MARKING]:          ['marking', 'body_shape', 'pressing'],
    [TOPICS.OVERLAPPING_RUNS]: ['movement', 'pressing'],
    [TOPICS.DEFENDING_CROSS]:  ['duels', 'pressing'],

    // Midfielder
    [TOPICS.PROGRESSIVE_PASSING]:     ['decision'],
    [TOPICS.POSITIONING]:             ['scanning', 'movement'],
    [TOPICS.BODY_SHAPE]:              ['body_shape'],
    [TOPICS.RECEIVING_BETWEEN_LINES]: ['body_shape', 'scanning'],

    // Striker / attacker
    [TOPICS.DRIBBLING_1V1]:      ['striker'],
    [TOPICS.CROSSING]:           ['movement', 'striker'], // no crossing route mounted
    [TOPICS.ATTACKING_MOVEMENT]: ['runs', 'movement', 'striker'],
    [TOPICS.FINISHING]:          ['striker'],
    [TOPICS.ONE_V_ONE_ATT]:      ['striker'],
};

/** Resolve a topic slug to a concrete recommended game card.
 *
 * Priority order matters: the first skill in TOPIC_TO_ELITE_SKILL is the
 * canonical target for the topic (e.g. `duels` for 1v1, `marking` for
 * marking). We take the first skill that's usable in EITHER tier and only
 * fall through to the next skill if this one has no foundation game AND no
 * routed elite variant. Tier is then chosen by the player's preference,
 * with fallback to whichever tier the skill actually ships in.
 */
export function gameForTopic(topic, { preferredTier = 'foundation' } = {}) {
    const skills = TOPIC_TO_ELITE_SKILL[topic] || [];

    for (const skillId of skills) {
        const entry = GAME_REGISTRY[skillId];
        if (!entry) continue;
        const hasFoundation = !!entry.foundation;
        const elitePath = ROUTED_ELITE_SKILLS[skillId];
        const hasElite = !!elitePath;
        if (!hasFoundation && !hasElite) continue;

        const useFoundation =
            (preferredTier === 'foundation' && hasFoundation) ||
            (!hasElite);
        if (useFoundation) {
            return {
                skillId,
                tier: 'foundation',
                label: entry.label,
                Icon: entry.Icon,
                colour: entry.colour,
                path: FOUNDATION_HUB_PATH,
            };
        }
        return {
            skillId,
            tier: 'elite',
            label: entry.label,
            Icon: entry.Icon,
            colour: entry.colour,
            path: elitePath,
        };
    }

    return null;
}

/**
 * Build 2–3 game recommendations from a completed attempt's per-topic
 * breakdown ({ topic: score01 }). Lowest topics first. If every topic is
 * strong, we still return 2 "keep sharp" recommendations from the answered
 * topics rather than nothing.
 *
 * Each recommendation carries `why` — the coach-voice one-liner shown on
 * the card ("Your 1v1 read was your lowest — sharpen it here").
 */
export function buildRecommendations(topicBreakdown, {
    preferredTier = 'foundation',
    max = 3,
    remedialThreshold = 0.7,
} = {}) {
    const entries = Object.entries(topicBreakdown || {});
    if (entries.length === 0) return [];

    // Lowest score first, deduped by resolved game path so we don't send
    // the player to the same game twice.
    const sorted = [...entries].sort((a, b) => a[1] - b[1]);

    const everythingStrong = sorted.every(([, s]) => s >= remedialThreshold);

    const seenPaths = new Set();
    const recs = [];
    for (const [topic, score01] of sorted) {
        const game = gameForTopic(topic, { preferredTier });
        if (!game) continue;
        if (seenPaths.has(game.path)) continue;
        seenPaths.add(game.path);
        const topicLabel = TOPIC_LABELS[topic] || topic;
        const why = everythingStrong
            ? `Your ${topicLabel.toLowerCase()} read was strong — keep it sharp here.`
            : (score01 <= 0.34
                ? `Your ${topicLabel.toLowerCase()} was your weakest — sharpen it here.`
                : `Tighten your ${topicLabel.toLowerCase()} with this one.`);
        recs.push({ ...game, topic, topicLabel, score01, why });
        if (recs.length >= max) break;
    }

    // If dedupe left us with only one rec, but there are more answered
    // topics, fall back to allow duplicate game paths so the player still
    // gets at least 2 cards.
    if (recs.length < 2) {
        for (const [topic, score01] of sorted) {
            if (recs.length >= 2) break;
            const game = gameForTopic(topic, { preferredTier });
            if (!game) continue;
            const alreadyPresent = recs.some((r) => r.topic === topic);
            if (alreadyPresent) continue;
            const topicLabel = TOPIC_LABELS[topic] || topic;
            recs.push({
                ...game,
                topic,
                topicLabel,
                score01,
                why: everythingStrong
                    ? `Your ${topicLabel.toLowerCase()} read was strong — keep it sharp here.`
                    : `Tighten your ${topicLabel.toLowerCase()} with this one.`,
            });
        }
    }

    return recs;
}
