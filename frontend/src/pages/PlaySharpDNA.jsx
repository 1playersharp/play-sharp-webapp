import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles, ShieldCheck, Zap } from 'lucide-react';

import useDnaStore from '@/state/useDnaStore';
import { QUESTIONS, ATTRIBUTES, getArchetype } from '@/dna/data';
import { computeAttributes, pickArchetype, topAttributes } from '@/dna/scoring';

const ATTR_LABEL = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, a.label]));

const PHASES = {
    INTRO: 'intro',
    ASSESSMENT: 'assessment',
    ANALYSING: 'analysing',
    REVEAL: 'reveal',
};

const ANALYSIS_LINES = [
    { label: 'Analysing football decisions',          duration: 700 },
    { label: 'Evaluating leadership signals',         duration: 550 },
    { label: 'Reading creativity patterns',           duration: 550 },
    { label: 'Testing decision-making tempo',         duration: 550 },
    { label: 'Comparing against thousands of profiles', duration: 700 },
    { label: 'Building your PlaySharp DNA',           duration: 550 },
];

/* ─── Intro phase ────────────────────────────────────────────── */
function Intro({ existingArchetypeId, onStart, onView }) {
    return (
        <div className="mx-auto max-w-3xl">
            <p className="ps-label">PlaySharp DNA</p>
            <h1 className="ps-section-title mt-2 text-4xl text-white md:text-6xl">
                Discover your football identity
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/70">
                Answer eight football situations. Our scouting engine maps your instincts
                against twelve cognitive attributes and reveals your PlaySharp archetype.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                    { Icon: Sparkles,    title: '8 scenarios', copy: 'Football decisions, not personality quizzes.' },
                    { Icon: Zap,         title: '12 attributes', copy: 'Every answer scores multiple traits.' },
                    { Icon: ShieldCheck, title: '12 archetypes', copy: 'Discover which type of player you are.' },
                ].map(({ Icon, title, copy }) => (
                    <div key={title} className="ps-card p-4">
                        <Icon className="text-ps-turf" />
                        <p className="mt-3 font-heading text-sm font-semibold uppercase tracking-[0.16em] text-white">
                            {title}
                        </p>
                        <p className="mt-1 text-xs text-white/60">{copy}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
                <button
                    type="button"
                    data-testid="dna-start"
                    onClick={onStart}
                    className="ps-btn-primary text-xs"
                >
                    {existingArchetypeId ? 'Retake assessment' : 'Start assessment'}
                </button>
                {existingArchetypeId && (
                    <button
                        type="button"
                        data-testid="dna-view-existing"
                        onClick={onView}
                        className="ps-btn-secondary text-xs"
                    >
                        View my DNA
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Assessment phase ───────────────────────────────────────── */
function Assessment({ answers, setAnswers, onFinish, onExit }) {
    const [idx, setIdx] = useState(() => {
        const firstUnanswered = QUESTIONS.findIndex((q) => !answers[q.id]);
        return firstUnanswered === -1 ? 0 : firstUnanswered;
    });
    const q = QUESTIONS[idx];
    const selected = answers[q.id];
    const progress = ((idx + (selected ? 1 : 0)) / QUESTIONS.length) * 100;

    const pick = (optId) => {
        setAnswers((prev) => ({ ...prev, [q.id]: optId }));
    };

    const goNext = () => {
        if (idx < QUESTIONS.length - 1) {
            setIdx((i) => i + 1);
        } else {
            onFinish();
        }
    };

    return (
        <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
                <button
                    type="button"
                    data-testid="dna-back"
                    onClick={() => (idx > 0 ? setIdx((i) => i - 1) : onExit())}
                    className="inline-flex items-center gap-1.5 text-xs text-white/55 transition hover:text-white"
                >
                    <ArrowLeft size={14} /> Back
                </button>
                <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/50">
                    Question {idx + 1} of {QUESTIONS.length}
                </span>
            </div>

            {/* progress bar */}
            <div
                data-testid="dna-progress"
                className="mb-8 h-1 w-full overflow-hidden rounded-full bg-white/10"
            >
                <div
                    className="h-full bg-ps-red transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <p className="ps-label">Scenario</p>
            <h2
                data-testid="dna-question"
                className="mt-2 font-heading text-2xl font-semibold text-white md:text-3xl"
            >
                {q.prompt}
            </h2>

            <div className="mt-6 grid gap-3">
                {q.options.map((opt) => {
                    const isSelected = selected === opt.id;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            data-testid={`dna-option-${q.id}-${opt.id}`}
                            onClick={() => pick(opt.id)}
                            className={[
                                'ps-card flex items-center justify-between gap-4 p-4 text-left transition',
                                isSelected
                                    ? 'border-ps-red bg-ps-red/10 ring-1 ring-ps-red/40'
                                    : 'hover:border-white/25 hover:bg-white/[0.03]',
                            ].join(' ')}
                        >
                            <span className="flex items-center gap-4">
                                <span
                                    className={[
                                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                                        isSelected
                                            ? 'border-ps-red bg-ps-red text-white'
                                            : 'border-white/30 text-white/60',
                                    ].join(' ')}
                                >
                                    {opt.id.toUpperCase()}
                                </span>
                                <span className="text-sm text-white/85 md:text-base">
                                    {opt.label}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    type="button"
                    data-testid="dna-next"
                    disabled={!selected}
                    onClick={goNext}
                    className="ps-btn-primary inline-flex items-center gap-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {idx === QUESTIONS.length - 1 ? 'Analyse my DNA' : 'Next scenario'}
                    <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}

/* ─── Analysing phase ────────────────────────────────────────── */
function Analysing({ onDone }) {
    const [lineIdx, setLineIdx] = useState(0);
    const [lineProgress, setLineProgress] = useState(0);

    useEffect(() => {
        if (lineIdx >= ANALYSIS_LINES.length) {
            const t = setTimeout(onDone, 300);
            return () => clearTimeout(t);
        }
        const line = ANALYSIS_LINES[lineIdx];
        const start = performance.now();
        let raf;
        const tick = (now) => {
            const pct = Math.min(1, (now - start) / line.duration);
            setLineProgress(pct);
            if (pct < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                setLineIdx((i) => i + 1);
                setLineProgress(0);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [lineIdx, onDone]);

    return (
        <div className="mx-auto max-w-2xl">
            <p className="ps-label">PlaySharp Scout</p>
            <h2 className="ps-section-title mt-2 text-3xl text-white md:text-4xl">
                Analysing your football decisions…
            </h2>

            <div
                data-testid="dna-analysing"
                className="mt-8 space-y-5 font-mono text-xs text-white/80"
            >
                {ANALYSIS_LINES.map((line, i) => {
                    const active = i === lineIdx;
                    const done = i < lineIdx;
                    const width = done ? 1 : active ? lineProgress : 0;
                    return (
                        <div key={line.label}>
                            <div className="flex items-baseline justify-between">
                                <span
                                    className={[
                                        'uppercase tracking-[0.14em]',
                                        done ? 'text-ps-turf' : active ? 'text-white' : 'text-white/40',
                                    ].join(' ')}
                                >
                                    {line.label}…
                                </span>
                                <span className="text-[10px] text-white/40">
                                    {done ? '100%' : `${Math.round(width * 100)}%`}
                                </span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                                <div
                                    className={[
                                        'h-full transition-[width] duration-100 ease-linear',
                                        done ? 'bg-ps-turf' : 'bg-ps-red',
                                    ].join(' ')}
                                    style={{ width: `${width * 100}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── Attribute bar ──────────────────────────────────────────── */
function AttributeBar({ label, value, delay = 0, accent = '#DC1E28' }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setDisplay(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return (
        <div>
            <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
                    {label}
                </span>
                <span className="font-mono text-xs text-white/60">{display}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                    className="h-full rounded-full transition-[width] duration-1000 ease-out"
                    style={{ width: `${display}%`, backgroundColor: accent }}
                />
            </div>
        </div>
    );
}

/* ─── Reveal phase ───────────────────────────────────────────── */
function Reveal({ attributes, archetypeId, onRetake }) {
    const archetype = getArchetype(archetypeId);
    const top = useMemo(() => topAttributes(attributes, 6), [attributes]);
    const rest = useMemo(
        () =>
            ATTRIBUTES.filter((a) => !top.some((t) => t.key === a.key)).map((a) => ({
                key: a.key,
                value: attributes[a.key],
            })),
        [attributes, top]
    );

    if (!archetype) return null;

    return (
        <div className="mx-auto max-w-5xl">
            <p className="ps-label">Your PlaySharp DNA</p>

            {/* archetype card */}
            <div
                data-testid="dna-archetype-card"
                className="ps-card relative mt-4 overflow-hidden p-8 md:p-10"
                style={{
                    borderColor: archetype.accent,
                    boxShadow: `0 0 60px -20px ${archetype.accent}`,
                }}
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                        background: `radial-gradient(600px circle at 20% 0%, ${archetype.accent}44, transparent 60%)`,
                    }}
                />
                <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
                    <div
                        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg text-5xl md:h-28 md:w-28 md:text-6xl"
                        style={{
                            backgroundColor: `${archetype.accent}22`,
                            border: `1px solid ${archetype.accent}66`,
                        }}
                    >
                        {archetype.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p
                            className="text-[10px] font-bold uppercase tracking-[0.28em]"
                            style={{ color: archetype.accent }}
                        >
                            Archetype
                        </p>
                        <h1
                            data-testid="dna-archetype-name"
                            className="mt-1 font-heading text-3xl font-semibold text-white md:text-5xl"
                        >
                            {archetype.name}
                        </h1>
                        <p className="mt-2 text-sm text-white/70 md:text-base">
                            {archetype.tagline}
                        </p>
                        <p className="mt-4 text-sm text-white/80 md:text-base">
                            {archetype.description}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {archetype.positions.map((p) => (
                                <span
                                    key={p}
                                    className="rounded-sm bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80"
                                >
                                    {p}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* top attributes */}
            <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="ps-card p-6">
                    <p className="ps-label">Top attributes</p>
                    <div className="mt-4 space-y-4">
                        {top.map((a, i) => (
                            <AttributeBar
                                key={a.key}
                                label={ATTR_LABEL[a.key]}
                                value={a.value}
                                delay={i * 120}
                                accent={archetype.accent}
                            />
                        ))}
                    </div>
                </div>

                <div className="ps-card p-6">
                    <p className="ps-label">Other traits</p>
                    <div className="mt-4 space-y-3">
                        {rest.map((a, i) => (
                            <AttributeBar
                                key={a.key}
                                label={ATTR_LABEL[a.key]}
                                value={a.value}
                                delay={(top.length + i) * 80}
                                accent="#8b5cf6"
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* strengths / weaknesses / training */}
            <div className="mt-8 grid gap-6 md:grid-cols-3">
                <div className="ps-card p-6">
                    <p className="ps-label text-ps-turf">Strengths</p>
                    <ul className="mt-3 space-y-2 text-sm text-white/80">
                        {archetype.strengths.map((s) => (
                            <li key={s} className="flex gap-2">
                                <span className="text-ps-turf">✓</span>
                                <span>{s}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="ps-card p-6">
                    <p className="ps-label text-ps-red">Watch outs</p>
                    <ul className="mt-3 space-y-2 text-sm text-white/80">
                        {archetype.weaknesses.map((w) => (
                            <li key={w} className="flex gap-2">
                                <span className="text-ps-red">!</span>
                                <span>{w}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="ps-card p-6">
                    <p className="ps-label text-ps-gold">Training focus</p>
                    <ul className="mt-3 space-y-2 text-sm text-white/80">
                        {archetype.training.map((t) => (
                            <li key={t} className="flex gap-2">
                                <span className="text-ps-gold">→</span>
                                <span>{t}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mt-8 flex justify-center">
                <button
                    type="button"
                    data-testid="dna-retake"
                    onClick={onRetake}
                    className="ps-btn-secondary inline-flex items-center gap-2 text-xs"
                >
                    <RotateCcw size={13} /> Retake assessment
                </button>
            </div>
        </div>
    );
}

/* ─── Root component ─────────────────────────────────────────── */
export default function PlaySharpDNA() {
    const attributes = useDnaStore((s) => s.attributes);
    const archetypeId = useDnaStore((s) => s.archetypeId);
    const setResult = useDnaStore((s) => s.setResult);
    const resetDna = useDnaStore((s) => s.reset);

    const [phase, setPhase] = useState(archetypeId ? PHASES.REVEAL : PHASES.INTRO);
    const [answers, setAnswers] = useState({});

    const start = () => {
        setAnswers({});
        setPhase(PHASES.ASSESSMENT);
    };

    const finishAssessment = () => setPhase(PHASES.ANALYSING);

    const finishAnalysing = () => {
        const attrs = computeAttributes(answers);
        const chosen = pickArchetype(attrs);
        setResult({ attributes: attrs, archetypeId: chosen });
        setPhase(PHASES.REVEAL);
    };

    return (
        <div data-testid="dna-page" className="mx-auto max-w-7xl px-6 py-10">
            {phase === PHASES.INTRO && (
                <Intro
                    existingArchetypeId={archetypeId}
                    onStart={start}
                    onView={() => setPhase(PHASES.REVEAL)}
                />
            )}
            {phase === PHASES.ASSESSMENT && (
                <Assessment
                    answers={answers}
                    setAnswers={setAnswers}
                    onFinish={finishAssessment}
                    onExit={() => setPhase(PHASES.INTRO)}
                />
            )}
            {phase === PHASES.ANALYSING && <Analysing onDone={finishAnalysing} />}
            {phase === PHASES.REVEAL && attributes && archetypeId && (
                <Reveal
                    attributes={attributes}
                    archetypeId={archetypeId}
                    onRetake={() => {
                        resetDna();
                        start();
                    }}
                />
            )}
        </div>
    );
}
