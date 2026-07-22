import {
    Zap, Brain, Eye, Shield, ClipboardList,
    Navigation2, Users, Target, Compass, Send, Footprints, Swords, UserCheck, Route,
} from 'lucide-react';

import ReactionGame from '@/games/ReactionGame';
import DecisionGame from '@/games/DecisionGame';
import ScanningGame from '@/games/ScanningGame';
import PressingGame from '@/games/PressingGame';
import TacticalQuizGame from '@/games/TacticalQuizGame';
import PassMoveGame from '@/games/PassMoveGame';
import MarkingGame from '@/games/MarkingGame';

// Position rows shown in the IQ Training accordion.
export const POSITIONS = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST'];

export const GAME_REGISTRY = {
    reaction: {
        label: 'Reaction', Icon: Zap, colour: 'text-ps-gold',
        foundation: { Cmp: ReactionGame },
        elite: null,
    },
    decision: {
        label: 'Decision', Icon: Brain, colour: 'text-ps-pink',
        foundation: { Cmp: DecisionGame },
        elite: { path: '/elite/games/decision', description: 'Cinematic analysis & tactical AI' },
    },
    scanning: {
        label: 'Scanning', Icon: Eye, colour: 'text-ps-redDeep',
        foundation: { Cmp: ScanningGame },
        elite: { path: '/elite/games/scanning', description: 'Check your shoulders, build the picture, receive on the half-turn' },
    },
    pressing: {
        label: 'Pressing', Icon: Shield, colour: 'text-ps-turf',
        foundation: { Cmp: PressingGame },
        elite: { path: '/elite/games/pressing', description: 'Dynamic pressing AI & compactness' },
    },
    tactical_quiz: {
        label: 'Tactical Quiz', Icon: ClipboardList, colour: 'text-ps-blue',
        foundation: { Cmp: TacticalQuizGame },
        elite: null,
    },
    pass_move: {
        label: 'Pass & Move', Icon: Navigation2, colour: 'text-white',
        foundation: { Cmp: PassMoveGame },
        elite: null,
    },
    movement: {
        label: 'Movement', Icon: Footprints, colour: 'text-ps-pink',
        foundation: null,
        elite: { path: '/elite/games/movement', description: 'Curved runs, deceleration & timing off the ball' },
    },
    body_shape: {
        label: 'Body Shape', Icon: Users, colour: 'text-ps-blue',
        foundation: null,
        elite: { path: '/elite/games/body-shape', description: 'Read the passer, open your body, first-touch away' },
    },
    striker: {
        label: 'Striker', Icon: Target, colour: 'text-ps-gold',
        foundation: null,
        elite: { path: '/elite/games/striker', description: 'Service types, keeper reads & goal-mouth finishing' },
    },
    positioning: {
        label: 'Positioning', Icon: Compass, colour: 'text-ps-turf',
        foundation: null,
        elite: { path: '/elite/games/positioning', description: 'Find & occupy space between the lines' },
    },
    crossing: {
        label: 'Crossing', Icon: Send, colour: 'text-ps-pink',
        foundation: null,
        elite: { path: '/elite/games/crossing', description: 'Delivery type, target & timing from wide' },
    },
    marking: {
        label: 'Marking', Icon: UserCheck, colour: 'text-ps-blue',
        foundation: { Cmp: MarkingGame },
        elite: null,
    },
    duels: {
        label: 'Defending Duels', Icon: Swords, colour: 'text-ps-red',
        foundation: null,
        elite: { path: '/elite/games/defending-duels', description: 'Engage or jockey — 1v1s, cover, and 2v1 overloads' },
    },
    runs: {
        label: 'Runs — Lose Your Marker', Icon: Route, colour: 'text-ps-pink',
        foundation: null,
        elite: { path: '/elite/games/winger-runs', description: 'Freeze-frame runs: out-to-in, in-to-out, double move, blind side, underlap' },
    },
};

/** Resolve one skill id to whatever's renderable for this player's tier, falling back to the other tier. */
export function resolveGame(skillId, preferredTier) {
    const entry = GAME_REGISTRY[skillId];
    if (!entry) return null;
    const primary = entry[preferredTier];
    const otherTier = preferredTier === 'elite' ? 'foundation' : 'elite';
    const fallback = entry[otherTier];
    const resolved = primary || fallback;
    if (!resolved) return null;
    const tier = primary ? preferredTier : otherTier;
    return { skillId, tier, label: entry.label, Icon: entry.Icon, colour: entry.colour, ...resolved };
}

/**
 * The two PLAYABLE games per position (real, clickable). Each entry is an
 * `{ id, tier? }` object. When `tier` is set it forces that variant regardless
 * of the player's profile tier; otherwise the player's tier is used (with
 * bidirectional fallback via `resolveGame`).
 */
export const DEMO_PLAYABLE = {
    GK: [{ id: 'reaction' },                     { id: 'scanning' }],
    // Defender/CB — includes the two new defending games (marking + duels).
    CB: [{ id: 'pressing', tier: 'elite' },      { id: 'decision' },        { id: 'marking' },            { id: 'duels', tier: 'elite' }],
    // Full Back — same defending pair, keeps their existing pressing/decision.
    FB: [{ id: 'pressing', tier: 'elite' },      { id: 'decision', tier: 'elite' }, { id: 'marking' },     { id: 'duels', tier: 'elite' }],
    // NOTE: DM/CM/AM intentionally carry THREE playable games instead of the
    // usual two — 'scanning' is the highest-value midfield objective and the
    // rigged-player scanning game was built specifically for these positions.
    // Breaks the "exactly 2 per position" rule; kept explicit for review.
    DM: [{ id: 'movement', tier: 'elite' },      { id: 'body_shape' },      { id: 'scanning', tier: 'elite' }, { id: 'decision', tier: 'elite' }],
    CM: [{ id: 'movement', tier: 'elite' },      { id: 'body_shape' },      { id: 'scanning', tier: 'elite' }, { id: 'decision', tier: 'elite' }],
    AM: [{ id: 'movement', tier: 'elite' },      { id: 'positioning' },     { id: 'scanning', tier: 'elite' }, { id: 'decision', tier: 'elite' }],
    W:  [{ id: 'striker' },                      { id: 'crossing' },        { id: 'decision', tier: 'elite' }, { id: 'runs', tier: 'elite' }],
    ST: [{ id: 'body_shape' },                   { id: 'striker' }],
};

// Roadmap teasers — intentionally not rendered for now; revive when the
// games ship. Kept intact so bringing them back is a one-line change in
// pages/IQTraining.jsx.
export const COMING_SOON = {
    GK: [{ id: 'gk_distribution',    label: 'Distribution' },      { id: 'gk_command_area',     label: 'Command of the area' }],
    CB: [{ id: 'cb_heading',         label: 'Defensive heading' }, { id: 'cb_tackling',         label: 'When to tackle' }],
    FB: [{ id: 'fb_1v1',             label: '1v1 defending' },     { id: 'fb_overlap',          label: 'Overlapping runs' }],
    DM: [{ id: 'dm_positioning',     label: 'Positioning' },       { id: 'dm_tackling',         label: 'When to tackle' }],
    CM: [{ id: 'cm_tempo',           label: 'Tempo control' },     { id: 'cm_press_resistance', label: 'Press resistance' }],
    AM: [{ id: 'am_pockets',         label: 'Finding pockets' },   { id: 'am_through_balls',    label: 'Through balls' }],
    W:  [{ id: 'w_dribbling',        label: '1v1 dribbling' },     { id: 'w_attacking_runs',    label: 'Attacking runs' }],
    ST: [{ id: 'st_attacking_runs',  label: 'Attacking runs' },    { id: 'st_box_movement',     label: 'Movement in the box' }],
};
