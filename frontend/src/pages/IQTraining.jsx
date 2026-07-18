import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import useEliteStore from '@/elite/engine/useEliteStore';
import useFoundationStore from '@/state/useFoundationStore';
import useProfileStore from '@/state/useProfileStore';
import { submitScore } from '@/services/api';

import {
    POSITIONS,
    DEMO_PLAYABLE,
    resolveGame,
} from '@/elite/engine/gameRegistry';

const splitName = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return {
        firstname: parts[0] || '',
        lastname: parts.slice(1).join(' '),
    };
};

// Profile store uses long-form position codes (RCB, CDM, CAM, ...). The IQ
// accordion is keyed by the eight canonical short codes (GK, CB, FB, DM, CM,
// AM, W, ST). Fold the long codes down.
const PROFILE_POSITION_TO_SHORT = {
    GK:  'GK',
    RB:  'FB', LB:  'FB',
    RCB: 'CB', LCB: 'CB',
    CDM: 'DM',
    CM:  'CM',
    CAM: 'AM',
    RW:  'W',  LW:  'W',
    ST:  'ST',
};

const toShortPosition = (raw) => PROFILE_POSITION_TO_SHORT[raw] || null;

const POSITION_LABELS = {
    GK: 'Goalkeeper',
    CB: 'Centre Back',
    FB: 'Fullback',
    DM: 'Defensive Midfielder',
    CM: 'Central Midfielder',
    AM: 'Attacking Midfielder',
    W:  'Winger',
    ST: 'Striker',
};

export default function IQTraining() {
    const profile = useProfileStore((s) => s.profile);
    const setFoundationResult = useFoundationStore((s) => s.setFoundationResult);

    // Foundation results, indexed by skillId.
    const reactionResult     = useFoundationStore((s) => s.reactionResult);
    const decisionResult     = useFoundationStore((s) => s.decisionResult);
    const scanningResult     = useFoundationStore((s) => s.scanningResult);
    const pressingResult     = useFoundationStore((s) => s.pressingResult);
    const tacticalQuizResult = useFoundationStore((s) => s.tacticalQuizResult);
    const passMoveResult     = useFoundationStore((s) => s.passMoveResult);

    // Elite results, indexed by skillId. New games (positioning / crossing)
    // will be added to the elite store by the companion build; the selectors
    // stay defined so the ✓ appears once those keys exist.
    const eliteDecisionResult    = useEliteStore((s) => s.eliteDecisionResult);
    const elitePressingResult    = useEliteStore((s) => s.elitePressingResult);
    const eliteBodyShapeResult   = useEliteStore((s) => s.eliteBodyShapeResult);
    const eliteStrikerResult     = useEliteStore((s) => s.eliteStrikerResult);
    const eliteScanningResult    = useEliteStore((s) => s.eliteScanningResult);
    const elitePositioningResult = useEliteStore((s) => s.elitePositioningResult);
    const eliteCrossingResult    = useEliteStore((s) => s.eliteCrossingResult);

    const RESULTS_BY_SKILL = {
        foundation: {
            reaction:      reactionResult,
            decision:      decisionResult,
            scanning:      scanningResult,
            pressing:      pressingResult,
            tactical_quiz: tacticalQuizResult,
            pass_move:     passMoveResult,
        },
        elite: {
            decision:    eliteDecisionResult,
            pressing:    elitePressingResult,
            body_shape:  eliteBodyShapeResult,
            striker:     eliteStrikerResult,
            scanning:    eliteScanningResult,
            positioning: elitePositioningResult,
            crossing:    eliteCrossingResult,
        },
    };

    const playerShort = toShortPosition(profile.position);
    const hasPosition = !!playerShort;
    const defaultOpen = playerShort || POSITIONS[0];

    const [openPosition, setOpenPosition] = useState(defaultOpen);
    const [activeGame, setActiveGame] = useState(null); // { skillId, ...resolved } or null

    const { firstname, lastname } = splitName(profile.name);
    const playerProfile = {
        firstname,
        lastname,
        club: '',
        age: null,
        position: profile.position || '',
        gender: '',
    };

    const preferredTier = profile.tier || 'foundation';

    const submit = async (gameType, payload) => {
        setFoundationResult(gameType, payload);
        if (!firstname) return;
        try {
            await submitScore({
                firstname,
                lastname,
                club: '',
                gender: '',
                gameType,
                score: payload.score,
                reactionTime: payload.reactionTime ?? null,
            });
            toast.success(`${gameType} saved`);
        } catch {
            // silent — local persistence still works
        }
    };

    const togglePosition = (pos) => {
        setActiveGame(null);
        setOpenPosition((cur) => (cur === pos ? null : pos));
    };

    const resultFor = (resolved) =>
        resolved ? (RESULTS_BY_SKILL[resolved.tier]?.[resolved.skillId] ?? null) : null;

    return (
        <div data-testid="iq-training-page" className="mx-auto max-w-7xl px-6 py-10">
            <p className="ps-label">Training Games</p>
            <h1 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                Select a Position
            </h1>
            <p
                data-testid="iq-training-subtitle"
                className="mt-3 max-w-xl text-base font-medium text-white/75"
            >
                Train your reactions, decisions and tactical brain — grouped by position.
            </p>

            {!hasPosition && (
                <p
                    data-testid="iq-training-position-hint"
                    className="mt-4 text-sm text-white/60"
                >
                    Set your position in your profile to see your recommended drills.
                </p>
            )}

            <section className="mt-8 divide-y divide-white/5 border-y border-white/5">
                {POSITIONS.map((pos) => {
                    const isOpen = openPosition === pos;
                    const isYou = hasPosition && playerShort === pos;
                    const playable = (DEMO_PLAYABLE[pos] || [])
                        .map(({ id, tier }) => resolveGame(id, tier || preferredTier))
                        .filter(Boolean);

                    return (
                        <div key={pos} data-testid={`iq-training-position-${pos}`}>
                            <button
                                type="button"
                                data-testid={`iq-training-position-toggle-${pos}`}
                                aria-expanded={isOpen}
                                aria-controls={`iq-training-panel-${pos}`}
                                onClick={() => togglePosition(pos)}
                                className="flex w-full items-center justify-between px-1 py-5 text-left transition hover:bg-white/[0.02]"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="text-lg font-bold uppercase tracking-[0.24em] text-white">
                                        {POSITION_LABELS[pos] || pos}
                                    </span>
                                    {isYou && (
                                        <span
                                            data-testid={`iq-training-you-badge-${pos}`}
                                            className="rounded-sm bg-ps-turf/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ps-turf"
                                        >
                                            You
                                        </span>
                                    )}
                                </span>
                                <ChevronDown
                                    className={[
                                        'h-5 w-5 text-white/50 transition-transform',
                                        isOpen ? 'rotate-180' : '',
                                    ].join(' ')}
                                />
                            </button>

                            {isOpen && (
                                <div
                                    id={`iq-training-panel-${pos}`}
                                    data-testid={`iq-training-panel-${pos}`}
                                    className="grid gap-6 pb-6 md:grid-cols-2"
                                >
                                    {playable.map((resolved) => {
                                        const { skillId, tier, label, Icon, colour, Cmp, path, description } = resolved;
                                        const result = resultFor(resolved);
                                        const testId = `iq-training-card-${pos}-${skillId}`;

                                        if (tier === 'elite') {
                                            return (
                                                <Link
                                                    key={skillId}
                                                    to={path}
                                                    state={{ playerProfile }}
                                                    data-testid={testId}
                                                    className="ps-card p-6 transition hover:scale-[1.02]"
                                                >
                                                    <Icon className={colour} />
                                                    <h3 className="mt-3 font-bold uppercase text-white">
                                                        {label} — ELITE 3D
                                                        {result && (
                                                            <span className="ml-2 font-bold text-ps-turf">✓</span>
                                                        )}
                                                    </h3>
                                                    <p className="mt-1 text-xs text-white/60">{description}</p>
                                                </Link>
                                            );
                                        }

                                        return (
                                            <button
                                                key={skillId}
                                                type="button"
                                                data-testid={testId}
                                                className="ps-card p-6 text-left transition hover:scale-[1.02]"
                                                onClick={() => setActiveGame({ skillId, Cmp })}
                                            >
                                                <Icon className={colour} />
                                                <h3 className="mt-3 font-bold uppercase text-white">
                                                    {label}
                                                    {result && (
                                                        <span className="ml-2 font-bold text-ps-turf">✓</span>
                                                    )}
                                                </h3>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </section>

            {activeGame && activeGame.Cmp && (() => {
                const ActiveCmp = activeGame.Cmp;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
                        <div className="ps-card w-full max-w-4xl p-6">
                            <button
                                type="button"
                                className="mb-4 text-white/60 hover:text-white"
                                onClick={() => setActiveGame(null)}
                            >
                                ← Back to Hub
                            </button>
                            <ActiveCmp
                                onComplete={async (r) => {
                                    await submit(activeGame.skillId, r);
                                    setActiveGame(null);
                                }}
                            />
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
