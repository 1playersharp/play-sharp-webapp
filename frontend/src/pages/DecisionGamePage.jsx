import { useState } from "react";
import DecisionGame from "@/games/DecisionGame";
import { Link } from "react-router-dom";
import { submitScore } from "@/services/api";
import { toast } from "sonner";

export default function DecisionGamePage() {
    const [name, setName] = useState("");
    const [club, setClub] = useState("");
    const [age, setAge] = useState("");
    const [started, setStarted] = useState(false);
    const [result, setResult] = useState(null);

    const handleComplete = async (r) => {
        setResult(r);
        try {
            const parsedAge = age ? Number(age) : null;
            await submitScore({
                name: name.trim(),
                club: club.trim(),
                ...(parsedAge && parsedAge >= 6 && parsedAge <= 99 ? { age: parsedAge } : {}),
                gameType: "decision",
                score: r.score,
            });
            toast.success(`Score saved (${r.score}/100)`);
        } catch {
            toast.error("Couldn't save score");
        }
    };

    return (
        <div data-testid="decision-game-page" className="mx-auto max-w-7xl px-6 py-12">
            <p className="ps-label">Drill</p>
            <h1 className="ps-section-title mt-3 text-4xl text-white md:text-5xl">
                Decision Game
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/60">
                4 animated football scenarios — channel runs, wide overloads,
                defensive shape, box arrivals. Watch the play unfold, then
                pick A / B / C.
            </p>

            {!started && (
                <div className="ps-card mt-10 max-w-2xl p-8">
                    <p className="ps-label">Player setup</p>
                    <input
                        data-testid="decision-input-name"
                        className="ps-input mt-4"
                        type="text"
                        placeholder="Player name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        data-testid="decision-input-age"
                        className="ps-input mt-4"
                        type="number"
                        min="6"
                        max="99"
                        placeholder="Age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                    />
                    <div className="mt-6">
                        <label className="ps-label" htmlFor="decision-club">Club / School</label>
                        <input
                            id="decision-club"
                            data-testid="decision-input-club"
                            className="ps-input mt-2"
                            type="text"
                            placeholder="e.g. South London FC"
                            value={club}
                            onChange={(e) => setClub(e.target.value)}
                        />
                    </div>
                    <button
                        data-testid="decision-start-button"
                        onClick={() => setStarted(true)}
                        disabled={!name.trim() || !club.trim()}
                        className="ps-btn-primary mt-8 disabled:opacity-50"
                    >
                        Begin Drill
                    </button>
                </div>
            )}

            {started && !result && (
                <div className="mt-10">
                    <DecisionGame onComplete={handleComplete} />
                </div>
            )}

            {result && (
                <div data-testid="decision-result" className="mt-10 grid gap-4 md:grid-cols-3">
                    <div className="ps-card p-6">
                        <p className="ps-label">Score</p>
                        <div className="ps-metric mt-3 text-ps-turf">
                            {result.score}<span className="text-white/30">/100</span>
                        </div>
                    </div>
                    <div className="ps-card p-6">
                        <p className="ps-label">Aligned with coach</p>
                        <div className="ps-metric mt-3 text-white">
                            {result.matchesCoach}/{result.total}
                        </div>
                    </div>
                    <div className="ps-card p-6">
                        <p className="ps-label">Avg decision time</p>
                        <div className="ps-metric mt-3 text-ps-red">
                            {Math.round(result.avgTime)}ms
                        </div>
                    </div>
                    <div className="md:col-span-3 flex flex-wrap gap-3">
                        <button
                            data-testid="decision-restart"
                            onClick={() => {
                                setResult(null);
                                setStarted(false);
                            }}
                            className="ps-btn-secondary"
                        >
                            Run Again
                        </button>
                        <Link to="/leaderboard">
                            <button className="ps-btn-primary">View Leaderboard</button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
