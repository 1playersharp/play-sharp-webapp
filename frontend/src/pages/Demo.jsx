import { useState } from "react";
import ReactionGame from "@/games/ReactionGame";
import DecisionGame from "@/games/DecisionGame";
import ScanningGame from "@/games/ScanningGame";
import Leaderboard from "@/components/Leaderboard";
import { Link } from "react-router-dom";
import { Activity, Brain, Eye, Trophy, ArrowRight } from "lucide-react";
import { submitScore } from "@/services/api";
import { toast } from "sonner";

const STEPS = [
    { key: "intro", label: "Setup" },
    { key: "reaction", label: "Reaction" },
    { key: "decision", label: "Decision" },
    { key: "scanning", label: "Scanning" },
    { key: "leaderboard", label: "Leaderboard" },
];

export default function Demo() {
    const [step, setStep] = useState("intro");
    const [name, setName] = useState("");
    const [club, setClub] = useState("");
    const [age, setAge] = useState("");
    const [reactionResult, setReactionResult] = useState(null);
    const [decisionResult, setDecisionResult] = useState(null);
    const [scanningResult, setScanningResult] = useState(null);
    const [coachNotes, setCoachNotes] = useState([]);
    const [canonicalClub, setCanonicalClub] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    const stepIdx = STEPS.findIndex((s) => s.key === step);

    const submit = async (gameType, payload) => {
        if (!name.trim() || !club.trim()) return;
        try {
            const parsedAge = age ? Number(age) : null;
            const res = await submitScore({
                name: name.trim(),
                club: club.trim(),
                ...(parsedAge && parsedAge >= 6 && parsedAge <= 99 ? { age: parsedAge } : {}),
                gameType,
                score: payload.score,
                reactionTime: payload.reactionTime ?? null,
            });
            if (res?.club) setCanonicalClub(res.club);
            setRefreshKey((k) => k + 1);
            const msg =
                gameType === "reaction"
                    ? `Reaction saved (${Math.round(payload.reactionTime)}ms)`
                    : gameType === "decision"
                        ? `Decision saved (${payload.score}/100)`
                        : `Scanning saved (${payload.score}/100)`;
            toast.success(msg);
        } catch {
            toast.error("Couldn't save score (continuing demo)");
        }
    };

    const handleReactionDone = async (result) => {
        setReactionResult(result);
        await submit("reaction", result);
    };
    const handleDecisionDone = async (result) => {
        setDecisionResult(result);
        if (Array.isArray(result.decisions)) setCoachNotes(result.decisions);
        await submit("decision", result);
    };
    const handleScanningDone = async (result) => {
        setScanningResult(result);
        await submit("scanning", result);
    };

    return (
        <div data-testid="demo-page">
            {/* Stepper */}
            <section className="border-b border-white/10 bg-ps-surface/40">
                <div className="mx-auto max-w-7xl px-6 py-6">
                    <div className="flex items-center gap-3 overflow-x-auto">
                        {STEPS.map((s, i) => {
                            const active = i === stepIdx;
                            const done = i < stepIdx;
                            return (
                                <div
                                    key={s.key}
                                    className="flex flex-none items-center gap-3"
                                >
                                    <span
                                        className={[
                                            "grid h-7 w-7 place-items-center border font-mono text-xs",
                                            active
                                                ? "border-ps-red bg-ps-red text-white"
                                                : done
                                                    ? "border-ps-turf bg-ps-turf/10 text-ps-turf"
                                                    : "border-white/15 bg-ps-surface text-white/40",
                                        ].join(" ")}
                                    >
                                        {i + 1}
                                    </span>
                                    <span
                                        className={[
                                            "font-heading text-xs font-bold uppercase tracking-[0.2em]",
                                            active
                                                ? "text-white"
                                                : done
                                                    ? "text-white/65"
                                                    : "text-white/35",
                                        ].join(" ")}
                                    >
                                        {s.label}
                                    </span>
                                    {i < STEPS.length - 1 && (
                                        <span className="h-px w-8 bg-white/15" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-12">
                {step === "intro" && (
                    <div data-testid="demo-step-intro" className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <p className="ps-label">PlaySharp · 90s Demo</p>
                            <h1 className="ps-section-title mt-3 text-5xl text-white md:text-6xl">
                                Reaction → Decision → Scanning → Leaderboard.
                            </h1>
                            <p className="mt-5 max-w-xl text-base text-white/65">
                                You'll run a 5-round reaction drill, a 4-scenario
                                decision drill, a 5-round scanning drill, then see
                                your scores on the global leaderboard. Built to take
                                under 90 seconds.
                            </p>

                            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div className="ps-card p-4">
                                    <Activity size={16} className="text-ps-red" />
                                    <p className="ps-label mt-3">Step 1</p>
                                    <p className="mt-1 font-heading text-base font-bold uppercase text-white">
                                        Reaction
                                    </p>
                                </div>
                                <div className="ps-card p-4">
                                    <Brain size={16} className="text-ps-red" />
                                    <p className="ps-label mt-3">Step 2</p>
                                    <p className="mt-1 font-heading text-base font-bold uppercase text-white">
                                        Decision
                                    </p>
                                </div>
                                <div className="ps-card p-4">
                                    <Eye size={16} className="text-ps-red" />
                                    <p className="ps-label mt-3">Step 3</p>
                                    <p className="mt-1 font-heading text-base font-bold uppercase text-white">
                                        Scanning
                                    </p>
                                </div>
                                <div className="ps-card p-4">
                                    <Trophy size={16} className="text-ps-turf" />
                                    <p className="ps-label mt-3">Step 4</p>
                                    <p className="mt-1 font-heading text-base font-bold uppercase text-white">
                                        Rank
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5">
                            <div className="ps-card p-8">
                                <p className="ps-label">Player setup</p>
                                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className="ps-label" htmlFor="demo-name">Player name</label>
                                        <input
                                            id="demo-name"
                                            data-testid="demo-input-name"
                                            className="ps-input mt-2"
                                            type="text"
                                            placeholder="e.g. Marcus J."
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="ps-label" htmlFor="demo-age">Age</label>
                                        <input
                                            id="demo-age"
                                            data-testid="demo-input-age"
                                            className="ps-input mt-2"
                                            type="number"
                                            min="6"
                                            max="99"
                                            placeholder="e.g. 17"
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <label className="ps-label" htmlFor="demo-club">Club / School</label>
                                    <input
                                        id="demo-club"
                                        data-testid="demo-input-club"
                                        className="ps-input mt-2"
                                        type="text"
                                        placeholder="e.g. South London FC"
                                        value={club}
                                        onChange={(e) => setClub(e.target.value)}
                                    />
                                </div>
                                <button
                                    data-testid="demo-start-button"
                                    disabled={!name.trim() || !club.trim()}
                                    onClick={() => setStep("reaction")}
                                    className="ps-btn-primary mt-8 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Start Demo <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === "reaction" && (
                    <div data-testid="demo-step-reaction">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <p className="ps-label">Step 1 / 4</p>
                                <h2 className="font-heading text-3xl font-bold uppercase text-white">
                                    Reaction Drill
                                </h2>
                            </div>
                            <button
                                data-testid="demo-skip-reaction"
                                onClick={() => setStep("decision")}
                                className="ps-btn-secondary"
                            >
                                Skip →
                            </button>
                        </div>
                        <ReactionGame
                            onComplete={async (r) => {
                                await handleReactionDone(r);
                                setStep("decision");
                            }}
                        />
                    </div>
                )}

                {step === "decision" && (
                    <div data-testid="demo-step-decision">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <p className="ps-label">Step 2 / 4</p>
                                <h2 className="font-heading text-3xl font-bold uppercase text-white">
                                    Decision Drill
                                </h2>
                            </div>
                            <button
                                data-testid="demo-skip-decision"
                                onClick={() => setStep("scanning")}
                                className="ps-btn-secondary"
                            >
                                Skip →
                            </button>
                        </div>
                        <DecisionGame
                            onComplete={async (r) => {
                                await handleDecisionDone(r);
                                setStep("scanning");
                            }}
                        />
                    </div>
                )}

                {step === "scanning" && (
                    <div data-testid="demo-step-scanning">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <p className="ps-label">Step 3 / 4</p>
                                <h2 className="font-heading text-3xl font-bold uppercase text-white">
                                    Scanning Drill
                                </h2>
                            </div>
                            <button
                                data-testid="demo-skip-scanning"
                                onClick={() => setStep("leaderboard")}
                                className="ps-btn-secondary"
                            >
                                Skip →
                            </button>
                        </div>
                        <ScanningGame
                            onComplete={async (r) => {
                                await handleScanningDone(r);
                                setStep("leaderboard");
                            }}
                        />
                    </div>
                )}

                {step === "leaderboard" && (
                    <div data-testid="demo-step-leaderboard">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <p className="ps-label">Step 4 / 4 · Complete</p>
                                <h2 className="font-heading text-3xl font-bold uppercase text-white">
                                    Your performance
                                </h2>
                            </div>
                            <Link to="/contact">
                                <button className="ps-btn-primary" data-testid="demo-finish-cta">
                                    Talk to Sales
                                </button>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="ps-card p-6">
                                <p className="ps-label">Reaction</p>
                                <div className="ps-metric mt-3 text-ps-red">
                                    {reactionResult
                                        ? `${Math.round(reactionResult.reactionTime)}ms`
                                        : "—"}
                                </div>
                                <p className="mt-2 text-xs text-white/45">
                                    {reactionResult
                                        ? `Score ${reactionResult.score}/1000`
                                        : "Skipped"}
                                </p>
                            </div>
                            <div className="ps-card p-6">
                                <p className="ps-label">Decision</p>
                                <div className="ps-metric mt-3 text-ps-turf">
                                    {decisionResult ? `${decisionResult.score}/100` : "—"}
                                </div>
                                <p className="mt-2 text-xs text-white/45">
                                    {decisionResult
                                        ? `Avg ${Math.round(decisionResult.avgTime || 0)}ms across ${decisionResult.total} scenarios`
                                        : "Skipped"}
                                </p>
                            </div>
                            <div className="ps-card p-6" data-testid="demo-summary-scanning">
                                <p className="ps-label">Scanning</p>
                                <div className="ps-metric mt-3 text-white">
                                    {scanningResult ? `${scanningResult.score}/100` : "—"}
                                </div>
                                <p className="mt-2 text-xs text-white/45">
                                    {scanningResult
                                        ? `${scanningResult.correct}/${scanningResult.total} correct · ${Math.round(scanningResult.avgTime || 0)}ms avg`
                                        : "Skipped"}
                                </p>
                            </div>
                            <div className="ps-card p-6">
                                <p className="ps-label">Football IQ</p>
                                <div className="ps-metric mt-3 text-white">
                                    {(() => {
                                        const r = reactionResult?.score || 0;
                                        const d = decisionResult?.score || 0;
                                        const s = scanningResult?.score || 0;
                                        // Reaction normalized to 0-100 (raw is 0-1000) before blending.
                                        const rNorm = Math.min(100, r / 10);
                                        const iq = Math.round(rNorm * 0.35 + d * 0.35 + s * 0.30);
                                        return iq || "—";
                                    })()}
                                </div>
                                <p className="mt-2 text-xs text-white/45">
                                    Composite metric
                                </p>
                            </div>
                        </div>

                        {coachNotes.length > 0 && (
                            <div className="mt-12" data-testid="coach-notes-panel">
                                <p className="ps-label text-ps-red">Coach's Notes</p>
                                <h3 className="ps-section-title mt-2 text-2xl text-white md:text-3xl">
                                    Advisory feedback on your decisions.
                                </h3>
                                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {coachNotes.map((d, i) => {
                                        const matchesPick =
                                            d.recommendedKey && d.recommendedKey === d.picked;
                                        return (
                                            <div
                                                key={d.scenarioId}
                                                data-testid={`coach-note-${i}`}
                                                className="ps-card p-5"
                                                style={{ borderLeft: "3px solid #DC1E28" }}
                                            >
                                                <p className="ps-label">
                                                    Scenario {i + 1} · {d.scenarioTitle}
                                                </p>
                                                <p className="mt-3 font-display text-xs uppercase tracking-[0.2em] text-white/45">
                                                    Your call · {d.picked} — {d.pickedLabel}
                                                </p>
                                                <p className="mt-2 font-body text-sm leading-relaxed text-white/80">
                                                    {d.pickedReason}
                                                </p>
                                                {!matchesPick && d.recommendedLabel && (
                                                    <div className="mt-4 border-t border-white/8 pt-3">
                                                        <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ps-turf">
                                                            Coach's preferred call · {d.recommendedKey} — {d.recommendedLabel}
                                                        </p>
                                                        <p className="mt-2 font-body text-xs leading-relaxed text-white/55">
                                                            {d.recommendedReason}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="mt-12">
                            <h3 className="font-heading text-2xl font-bold uppercase text-white">
                                Live Leaderboard
                            </h3>
                            <p className="ps-label mt-1">
                                Your score is live · filter by club or week
                            </p>
                            <div className="mt-6">
                                <Leaderboard
                                    defaultGameType="reaction"
                                    embed
                                    limit={30}
                                    refreshKey={refreshKey}
                                    highlightName={name}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>

        </div>
    );
}
