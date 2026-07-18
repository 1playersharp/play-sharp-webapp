import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

import useProfileStore from '@/state/useProfileStore';
import useTacticsQuizStore from '@/state/useTacticsQuizStore';
import {
    POSITIONS,
    PROFILE_POSITION_TO_BUCKET,
    SCENARIOS_PER_ATTEMPT,
    MAX_WEIGHT,
    sampleScenarios,
} from '@/data/tacticsQuizScenarios';
import { buildRecommendations } from '@/data/topicGameMap';

import PositionSelect from '@/components/tacticsQuiz/PositionSelect';
import ScenarioPitch, { TOTAL_MOTION_MS } from '@/components/tacticsQuiz/ScenarioPitch';
import QuestionPanel from '@/components/tacticsQuiz/QuestionPanel';
import ResultsSummary from '@/components/tacticsQuiz/ResultsSummary';

// After the pitch animation settles, wait a beat before revealing the
// question so the user has a moment to actually watch the play resolve.
const QUESTION_REVEAL_DELAY_MS = TOTAL_MOTION_MS + 500;

// Best-answer weight in each option list; used to name the "stronger option"
// in per-question feedback.
const bestChoiceIndex = (scenario) =>
    scenario.choices.reduce(
        (best, c, i, arr) => (c.weight > arr[best].weight ? i : best),
        0,
    );

const initialState = () => ({
    stage: 'select',        // 'select' | 'quiz' | 'results'
    positionKey: null,
    scenarios: [],          // the 4 scenarios sampled for this attempt
    scenarioIdx: 0,
    picked: null,           // index of picked option, or null
    results: [],            // [{ topic, title, pickedIdx, pickedWeight, bestIdx }]
    replayNonce: 0,
});

export default function TacticsQuiz() {
    const profilePosition = useProfileStore((s) => s.profile?.position);
    const preferredTier = useProfileStore((s) => s.profile?.tier) || 'foundation';
    const recordAttempt = useTacticsQuizStore((s) => s.recordAttempt);
    const [state, setState] = useState(initialState());
    const [questionOpen, setQuestionOpen] = useState(false);

    const position = state.positionKey ? POSITIONS[state.positionKey] : null;
    const scenario = state.scenarios[state.scenarioIdx] || null;
    const suggestedKey = useMemo(
        () => PROFILE_POSITION_TO_BUCKET[profilePosition] ?? null,
        [profilePosition],
    );

    useEffect(() => {
        if (state.stage !== 'quiz' || !scenario) return undefined;
        setQuestionOpen(false);
        const t = setTimeout(() => setQuestionOpen(true), QUESTION_REVEAL_DELAY_MS);
        return () => clearTimeout(t);
    }, [state.stage, state.scenarioIdx, state.replayNonce, scenario]);

    const startPosition = (key) => {
        const p = POSITIONS[key];
        if (!p || p.comingSoon || !p.scenarios.length) return;
        const picked = sampleScenarios(key, SCENARIOS_PER_ATTEMPT);
        setState({
            ...initialState(),
            stage: 'quiz',
            positionKey: key,
            scenarios: picked,
        });
    };

    const goHome = () => setState(initialState());

    const replayCurrentAnimation = () => {
        setState((s) => ({ ...s, replayNonce: s.replayNonce + 1 }));
    };

    const pickAnswer = (i) => {
        if (state.picked != null) return;
        const chosen = scenario.choices[i];
        const bestIdx = bestChoiceIndex(scenario);
        setState((s) => ({
            ...s,
            picked: i,
            results: [
                ...s.results,
                {
                    topic: scenario.topic,
                    title: scenario.title,
                    pickedIdx: i,
                    pickedWeight: chosen.weight,
                    bestIdx,
                },
            ],
        }));
    };

    const advance = () => {
        const isLast = state.scenarioIdx >= state.scenarios.length - 1;
        if (!isLast) {
            setState((s) => ({
                ...s,
                scenarioIdx: s.scenarioIdx + 1,
                picked: null,
                replayNonce: s.replayNonce + 1,
            }));
            return;
        }

        // Finalise: compute weighted score + per-topic breakdown, record,
        // then move to results.
        const total = state.scenarios.length;
        const maxPossible = total * MAX_WEIGHT;
        const sumWeights = state.results.reduce((a, r) => a + r.pickedWeight, 0);
        const scorePercent = Math.round((sumWeights / maxPossible) * 100);

        const topicBreakdown = {};
        state.results.forEach((r) => {
            // If the same topic appears twice in one attempt, average the
            // two picks — otherwise the breakdown would silently overwrite.
            const prev = topicBreakdown[r.topic];
            const val = r.pickedWeight / MAX_WEIGHT;
            topicBreakdown[r.topic] = prev == null ? val : (prev + val) / 2;
        });

        const recommendations = buildRecommendations(topicBreakdown, {
            preferredTier,
        });

        recordAttempt({
            positionKey: state.positionKey,
            scorePercent,
            topicBreakdown,
            recommendations,
        });

        toast.success(
            `Tactics Quiz · ${position.label} · IQ ${scorePercent}`,
        );

        setState((s) => ({ ...s, stage: 'results' }));
    };

    // ------- Render branches -------

    if (state.stage === 'select') {
        return (
            <div data-testid="tactics-quiz-page" className="mx-auto max-w-5xl px-6 py-10">
                <p className="ps-label">Tactics Quiz</p>
                <h1 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                    Read the game before it happens
                </h1>
                <p className="mt-3 max-w-xl text-base font-medium text-white/75">
                    Pick a position. Watch the scenario play out, then make the call.
                </p>

                <div className="mt-8">
                    <PositionSelect suggestedKey={suggestedKey} onPick={startPosition} />
                </div>
            </div>
        );
    }

    if (state.stage === 'quiz' && scenario && position) {
        const total = state.scenarios.length;
        const done = state.scenarioIdx;
        return (
            <div data-testid="tactics-quiz-page" className="mx-auto max-w-4xl px-6 py-10">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        data-testid="tactics-quiz-back"
                        onClick={goHome}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 transition hover:text-ps-red"
                    >
                        <ChevronLeft size={16} strokeWidth={2.4} />
                        Positions
                    </button>
                    <span className="rounded-full border border-ps-red/40 bg-ps-red/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ps-red">
                        {position.label}
                    </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span
                        data-testid="tactics-quiz-progress-label"
                        className="text-xs font-mono uppercase tracking-widest text-white/55"
                    >
                        Scenario {state.scenarioIdx + 1} / {total}
                    </span>
                    <div className="flex gap-1.5" data-testid="tactics-quiz-progress-dots">
                        {state.scenarios.map((_, i) => (
                            <span
                                key={i}
                                aria-hidden
                                className={[
                                    'h-2 w-2 rounded-full',
                                    i < done ? 'bg-ps-red' :
                                    i === done ? 'bg-white' :
                                    'bg-white/15',
                                ].join(' ')}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-4">
                    <ScenarioPitch
                        scenario={scenario}
                        nonce={state.replayNonce}
                        onReplay={replayCurrentAnimation}
                    />
                </div>

                <div className="mt-4">
                    <h2 className="ps-section-title text-2xl text-white">
                        {scenario.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/70">
                        {scenario.caption}
                    </p>
                </div>

                {questionOpen && (
                    <div className="mt-4">
                        <QuestionPanel
                            scenario={scenario}
                            picked={state.picked}
                            onPick={pickAnswer}
                            onNext={advance}
                            isLast={state.scenarioIdx === total - 1}
                        />
                    </div>
                )}
            </div>
        );
    }

    if (state.stage === 'results' && position) {
        const total = state.scenarios.length;
        const maxPossible = total * MAX_WEIGHT;
        const sumWeights = state.results.reduce((a, r) => a + r.pickedWeight, 0);
        const scorePercent = Math.round((sumWeights / maxPossible) * 100);

        const topicBreakdown = {};
        state.results.forEach((r) => {
            const prev = topicBreakdown[r.topic];
            const val = r.pickedWeight / MAX_WEIGHT;
            topicBreakdown[r.topic] = prev == null ? val : (prev + val) / 2;
        });

        const recommendations = buildRecommendations(topicBreakdown, {
            preferredTier,
        });

        return (
            <div data-testid="tactics-quiz-page" className="mx-auto max-w-3xl px-6 py-10">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        data-testid="tactics-quiz-back"
                        onClick={goHome}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 transition hover:text-ps-red"
                    >
                        <ChevronLeft size={16} strokeWidth={2.4} />
                        Positions
                    </button>
                    <span className="rounded-full border border-ps-red/40 bg-ps-red/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ps-red">
                        {position.label}
                    </span>
                </div>
                <div className="mt-8">
                    <ResultsSummary
                        positionLabel={position.label}
                        scorePercent={scorePercent}
                        topicBreakdown={topicBreakdown}
                        recommendations={recommendations}
                        onReplayPosition={() => startPosition(state.positionKey)}
                        onPickAnother={goHome}
                    />
                </div>
            </div>
        );
    }

    return null;
}
