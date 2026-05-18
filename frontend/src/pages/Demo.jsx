import { useState } from "react";
import ReactionGame from "@/games/ReactionGame";
import DecisionGame from "@/games/DecisionGame";
import ScanningGame from "@/games/ScanningGame";
import PressingGame from "@/games/PressingGame";
import TacticalQuizGame from "@/games/TacticalQuizGame";
import PassMoveGame from "@/games/PassMoveGame";
import { Zap, Brain, Eye, Shield, ClipboardList, Navigation2 } from "lucide-react";
import { submitScore } from "@/services/api";
import { toast } from "sonner";
import { set } from "date-fns";

export default function Demo() {
    const [step, setStep] = useState("intro");

    const [name, setName] = useState("");
    const [club, setClub] = useState("");
    const [age, setAge] = useState("");
    const [position, setPosition] = useState("");

    const [activeGame, setActiveGame] = useState(null);

    const [reactionResult, setReactionResult] = useState(null);
    const [decisionResult, setDecisionResult] = useState(null);
    const [scanningResult, setScanningResult] = useState(null);
    const [pressingResult, setPressingResult] = useState(null);
    const [tacticalQuizResult, setTacticalQuizResult] = useState(null);
    const [passMoveResult, setPassMoveResult] = useState(null);

    const [refreshKey, setRefreshKey] = useState(0);

    // ---------- SAVE SCORE ----------
    const submit = async (gameType, payload) => {
        if (!name.trim() || !club.trim()) return;

        try {
            const parsedAge = age ? Number(age) : null;

            await submitScore({
                name: name.trim(),
                club: club.trim(),
                ...(parsedAge && parsedAge >= 6 && parsedAge <= 99 ? { age: parsedAge } : {}),
                gameType,
                score: payload.score,
                reactionTime: payload.reactionTime ?? null,
            });

            setRefreshKey((k) => k + 1);

            toast.success(`${gameType} saved`);
        } catch {
            toast.error("Couldn't save score");
        }
    };

    // ---------- HANDLERS ----------
    const handleReactionDone = async (r) => {
        setReactionResult(r);
        await submit("reaction", r);
    };

    const handleDecisionDone = async (r) => {
        setDecisionResult(r);
        await submit("decision", r);
    };

    const handleScanningDone = async (r) => {
        setScanningResult(r);
        await submit("scanning", r);
    };

    const handlePressingDone = async (r) => {
        setPressingResult(r);
        await submit("pressing", r);
    };  

    const handleTacticalQuizDone = async (r) => {
        setTacticalQuizResult(r);
        await submit("tactical_quiz", r);
    };
    
    const handlePassMoveDone = async (r) => {
        setPassMoveResult(r);
        await submit("pass_move", r);
    };  

    
    // ---------- FIFA STYLE PLAYER RATING ----------
    const calculateIQ = () => {
        const r = reactionResult?.score || 0;
        const d = decisionResult?.score || 0;
        const s = scanningResult?.score || 0;
        const p = pressingResult?.score || 0;
        const t = tacticalQuizResult?.score || 0;
        const m = passMoveResult?.score || 0;

        const rNorm = Math.min(100, r / 10);
        return Math.round(rNorm * 0.2 + 
            d * 0.2 + 
            s * 0.2 + 
            p * 0.2 + 
            t * 0.1 + 
            m * 0.1
        );
    };

    const iq = calculateIQ();

    // ---------- PLAYER CARD ----------
    const PlayerCard = () => (
        <div className="ps-card p-6 flex justify-between border border-white/10">
            <div>
                <p className="ps-label">Career Mode Profile</p>

                <h1 className="text-2xl font-bold uppercase text-white mt-1">
                    {name || "Player"}
                </h1>

                <p className="text-white/60 text-sm">
                    {club || "No Club"} · Age {age || "—"} · {position || "—"}
                </p>
            </div>

            <div className="text-right">
                <p className="ps-label">Football IQ</p>
                <div className="text-3xl font-bold text-ps-turf">
                    {iq || "—"}
                </div>
                <p className="text-xs text-white/60 mt-1">
                    Includes Reaction, Decision, Scanning, Pressing, Tactical Quiz, and Pass & Move scores
                </p>
            </div>
        </div>
    );

    // =========================================================
    // INTRO (SETUP SCREEN)
    // =========================================================
    if (step === "intro") {
        return (
            <div className="min-h-screen bg-ps-bg text-white p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="ps-card p-8">
                        <p className="ps-label">PlaySharp · Player Information</p>

                        <h1 className="text-3xl font-bold uppercase mt-2">
                            Enter Your Details
                        </h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <input className="ps-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                            <input className="ps-input" placeholder="Club" value={club} onChange={(e) => setClub(e.target.value)} />
                            <select className="ps-input"  value={age} onChange={(e) => setAge(e.target.value)} >
                                <option value="">Select Age</option>
                                {Array.from({ length: 11 }, (_, i) => {
                                    const value = i + 8;
                                    return (
                                        <option key={value} value={value}>
                                            {value} yrs
                                        </option>
                                    );
                                })}
                            </select>
                            <select className="ps-input" value={position} onChange={(e) => setPosition(e.target.value)} >
                                <option value="">Select Position</option>
                                <option value="GK">Goalkeeper (GK)</option>
                                
                                <option value="CB">Centre Back (CB)</option>
                                <option value="LB">Left Back (LB)</option>
                                <option value="RB">Right Back (RB)</option>
                                
                                <option value="CDM">Defensive Midfielder (CDM)</option>
                                <option value="CM">Central Midfielder (CM)</option>
                                <option value="CAM">Attacking Midfielder (CAM)</option>
                                
                                <option value="LW">Left Wing (LW)</option>
                                <option value="LM">Left Midfield (LM)</option>
                                <option value="RM">Right Midfield (RM)</option>
                                <option value="RW">Right Wing (RW)</option>
                                
                                <option value="ST">Striker (ST)</option>
                            </select>
                        </div>

                        <button
                            disabled={!name.trim() || !club.trim()}
                            onClick={() => setStep("select-demo")}
                            className="ps-btn-primary mt-6 w-full"
                        >
                            Continue to Training Hub
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================
    // SELECT DEMO (FIFA HUB)
    // =========================================================
    return (
        <div className="min-h-screen bg-ps-bg text-white p-6">
            <div className="max-w-6xl mx-auto">

                {/* PLAYER CARD */}
                <PlayerCard />

                {/* TITLE */}
                <div className="mt-8">
                    <p className="ps-label">PlaySharp Training Hub</p>
                    <h2 className="text-4xl font-bold uppercase">
                        Select a Drill
                    </h2>
                </div>

                {/* DRILL TILES */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">

                    <div
                        className="ps-card p-6 hover:scale-[1.03] transition cursor-pointer"
                        onClick={() => setActiveGame("reaction")}
                    >
                        <Zap className="text-ps-gold" />
                        <h3 className="mt-3 font-bold uppercase">Reaction</h3>
                    </div>

                    <div
                        className="ps-card p-6 hover:scale-[1.03] transition cursor-pointer"
                        onClick={() => setActiveGame("decision")}
                    >
                        <Brain className="text-ps-pink" />
                        <h3 className="mt-3 font-bold uppercase">Decision</h3>
                    </div>

                    <div
                        className="ps-card p-6 hover:scale-[1.03] transition cursor-pointer"
                        onClick={() => setActiveGame("scanning")}
                    >
                        <Eye className="text-ps-redDeep" />
                        <h3 className="mt-3 font-bold uppercase">Scanning</h3>
                    </div>

                    <div
                        className="ps-card p-6 hover:scale-[1.03] transition cursor-pointer"
                        onClick={() => setActiveGame("pressing")}
                    >
                        <Shield className="text-ps-turf" />
                        <h3 className="mt-3 font-bold uppercase">Pressing</h3>
                    </div>

                    <div
                        className="ps-card p-6 hover:scale-[1.03] transition cursor-pointer"
                        onClick={() => setActiveGame("tactical_quiz")}
                    >
                        <ClipboardList className="text-ps-blue" />
                        <h3 className="mt-3 font-bold uppercase">Tactical Quiz</h3>
                    </div>
                    
                    <div
                        className="ps-card p-6 hover:scale-[1.03] transition cursor-pointer"
                        onClick={() => setActiveGame("pass_move")}
                    >
                        <Navigation2 className="text-white" />
                        <h3 className="mt-3 font-bold uppercase">Pass & Move</h3>
                    </div>

                </div>

                {/* =====================================================
                    TRAINING MODAL
                ===================================================== */}
                {activeGame && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6">
                        <div className="ps-card w-full max-w-4xl p-6">

                            <button
                                className="text-white/60 mb-4"
                                onClick={() => setActiveGame(null)}
                            >
                                ← Back to Hub
                            </button>

                            {activeGame === "reaction" && (
                                <ReactionGame
                                    onComplete={async (r) => {
                                        await handleReactionDone(r);
                                        setActiveGame(null);
                                    }}
                                />
                            )}

                            {activeGame === "decision" && (
                                <DecisionGame
                                    onComplete={async (r) => {
                                        await handleDecisionDone(r);
                                        setActiveGame(null);
                                    }}
                                />
                            )}

                            {activeGame === "scanning" && (
                                <ScanningGame
                                    onComplete={async (r) => {
                                        await handleScanningDone(r);
                                        setActiveGame(null);
                                    }}
                                />
                            )}

                            {activeGame === "pressing" && (
                                <PressingGame
                                    onComplete={async (r) => {
                                        await handlePressingDone(r);
                                        setActiveGame(null);
                                    }}
                                />
                            )}  

                            {activeGame === "tactical_quiz" && (
                                <TacticalQuizGame
                                    onComplete={async (r) => {
                                        await handleTacticalQuizDone(r);
                                        setActiveGame(null);
                                    }}
                                />
                            )}

                            {activeGame === "pass_move" && (
                                <PassMoveGame
                                    onComplete={async (r) => {
                                        await handlePassMoveDone(r);
                                        setActiveGame(null);
                                    }}
                                />
                            )}

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}