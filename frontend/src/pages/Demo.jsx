import { useState, useEffect } from "react";
import useEliteStore from '@/elite/engine/useEliteStore';
import ReactionGame from "@/games/ReactionGame";
import DecisionGame from "@/games/DecisionGame";
import ScanningGame from "@/games/ScanningGame";
import PressingGame from "@/games/PressingGame";
import TacticalQuizGame from "@/games/TacticalQuizGame";
import PassMoveGame from "@/games/PassMoveGame";
import { Zap, Brain, Eye, Shield, ClipboardList, Navigation2, Footprints, Users, Target } from "lucide-react";
import { Link, useLocation } from 'react-router-dom';
import { submitScore } from "@/services/api";
import { toast } from "sonner";
import { set } from "date-fns";

export default function Demo() {
    const location = useLocation();
    const returningProfile = location.state && location.state.playerProfile;

    const [step, setStep] = useState(returningProfile ? "select-demo" : "intro");

    const [firstname, setFirstname] = useState(returningProfile?.firstname || "");
    const [lastname, setLastname] = useState(returningProfile?.lastname || "");
    const [club, setClub] = useState(returningProfile?.club || "");
    const [age, setAge] = useState(returningProfile?.age != null ? String(returningProfile.age) : "");
    const [position, setPosition] = useState(returningProfile?.position || "");
    const [gender, setGender] = useState(returningProfile?.gender || "");

    const [activeGame, setActiveGame] = useState(null);

    const [reactionResult, setReactionResult] = useState(null);
    const [decisionResult, setDecisionResult] = useState(null);
    const [scanningResult, setScanningResult] = useState(null);
    const [pressingResult, setPressingResult] = useState(null);
    const [tacticalQuizResult, setTacticalQuizResult] = useState(null);
    const [passMoveResult, setPassMoveResult] = useState(null);
    // ELITE results are stored in Zustand so they persist across routes
    const eliteDecisionResult = useEliteStore(state => state.eliteDecisionResult);
    const elitePressingResult = useEliteStore(state => state.elitePressingResult);
    const eliteMovementResult = useEliteStore(state => state.eliteMovementResult);
    const eliteBodyShapeResult = useEliteStore(state => state.eliteBodyShapeResult);
    const eliteStrikerResult = useEliteStore(state => state.eliteStrikerResult);

    const [refreshKey, setRefreshKey] = useState(0);

    // ---------- SAVE SCORE ----------
    const submit = async (gameType, payload) => {
        if (!firstname.trim() || !lastname.trim() || !club.trim()) return;

        try {
            const parsedAge = age ? Number(age) : null;

            await submitScore({
                firstname: firstname.trim(),
                lastname: lastname.trim(),
                club: club.trim(),
                gender: gender.trim(),
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

    const computeFoundationIQ = () => {
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

    const computeEliteIQ = () => {
        const d = eliteDecisionResult?.score ?? null;
        const p = elitePressingResult?.score ?? null;

        const values = [d, p].filter(v => v !== null && v !== undefined);
        if (values.length === 0) return 0;

        const normed = values.map(v => Math.max(0, Math.min(100, Number(v) || 0)));
        const sum = normed.reduce((a,b) => a + b, 0);
        return Math.round(sum / normed.length);
    };

    const foundationIQ = computeFoundationIQ();
    const eliteIQ = computeEliteIQ();
    const overallIQ = Math.round(foundationIQ * 0.7 + eliteIQ * 0.3);

    // ---------- PLAYER CARD ----------
    const PlayerCard = () => (
        <div className="ps-card p-6 flex justify-between border border-white/10">
            <div>
                <p className="ps-label">Career Mode Profile</p>

                <h1 className="text-2xl font-bold uppercase text-white mt-1">
                    {firstname || "Player"} {lastname || "Player"}
                </h1>

                <p className="text-white/60 text-sm">
                    {club || "No Club"} · Age {age || "—"} · {position || "—"} · {gender || "—"}
                </p>
            </div>

            <div className="text-right">
                <p className="ps-label">Football IQ</p>
                <div className="text-3xl font-bold text-ps-turf">
                    {overallIQ || "—"}
                </div>
                <p className="text-xs text-white/60 mt-1">
                    Foundation IQ: {foundationIQ} · Elite IQ: {eliteIQ}
                </p>
                <p className="text-xs text-white/60 mt-1">
                    Foundation contributes 70% and Elite contributes 30% (10% per Elite game)
                </p>
            </div>
        </div>
    );

    // =========================================================
    // INTRO (SETUP SCREEN)
    // =========================================================
    if (step === "intro") {
        return (
            <div className="min-h-screen bg-ps-bg text-white p-16">
                <div className="max-w-6xl mx-auto">
                    <div className="ps-card p-14">
                        <p className="ps-label">PlaySharp · Player Information</p>

                        <h1 className="text-3xl font-bold uppercase mt-2">
                            Enter Your Details
                        </h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <input className="ps-input" placeholder="First Name" value={firstname} onChange={(e) => setFirstname(e.target.value)} />
                            <input className="ps-input" placeholder="Last Name" value={lastname} onChange={(e) => setLastname(e.target.value)} />
                            <input className="ps-input" placeholder="Current Club" value={club} onChange={(e) => setClub(e.target.value)} />
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
                            <select className="ps-input" value={gender} onChange={(e) => setGender(e.target.value)} >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select> 
                        </div>

                        <button
                            disabled={!firstname.trim() || !lastname.trim() || !club.trim()}
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
        <div className="min-h-screen bg-ps-bg text-white p-7">
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

                {/* FOUNDATION GAMES */}
                <div className="mt-8">
                    <p className="ps-label">FOUNDATION GAMES</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">

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
                </div>

                {/* ELITE GAMES */}
                <div className="mt-8">
                    <p className="ps-label">ELITE GAMES</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
                        {
                          /* pass player profile via router state so Elite pages can receive it */
                        }
                        <Link to="/elite/games/decision" state={{ playerProfile: { firstname, lastname, club, age: age ? Number(age) : null, position, gender } }} className="ps-card p-6 hover:scale-[1.03] transition">
                            <Brain className="text-ps-pink" />
                            <h3 className="mt-3 font-bold uppercase">Decision — ELITE 3D {eliteDecisionResult ? <span className="text-ps-turf font-bold ml-2">✓</span> : null}</h3>
                            <p className="text-xs text-white/60 mt-1">Cinematic analysis & tactical AI</p>
                        </Link>

                        <Link to="/elite/games/pressing" state={{ playerProfile: { firstname, lastname, club, age: age ? Number(age) : null, position, gender } }} className="ps-card p-6 hover:scale-[1.03] transition">
                            <Shield className="text-ps-turf" />
                            <h3 className="mt-3 font-bold uppercase">Pressing — ELITE 3D {elitePressingResult ? <span className="text-ps-turf font-bold ml-2">✓</span> : null}</h3>
                            <p className="text-xs text-white/60 mt-1">Dynamic pressing AI & compactness</p>
                        </Link>

                        <Link to="/elite/games/movement" state={{ playerProfile: { firstname, lastname, club, age: age ? Number(age) : null, position, gender } }} className="ps-card p-6 hover:scale-[1.03] transition">
                            <Footprints className="text-ps-pink" />
                            <h3 className="mt-3 font-bold uppercase">Movement — ELITE 3D {eliteMovementResult ? <span className="text-ps-turf font-bold ml-2">✓</span> : null}</h3>
                            <p className="text-xs text-white/60 mt-1">Curved runs, deceleration & timing off the ball</p>
                        </Link>

                        <Link to="/elite/games/body-shape" state={{ playerProfile: { firstname, lastname, club, age: age ? Number(age) : null, position, gender } }} className="ps-card p-6 hover:scale-[1.03] transition">
                            <Users className="text-ps-blue" />
                            <h3 className="mt-3 font-bold uppercase">Body Shape — ELITE 3D {eliteBodyShapeResult ? <span className="text-ps-turf font-bold ml-2">✓</span> : null}</h3>
                            <p className="text-xs text-white/60 mt-1">Read the passer, open your body, first-touch away</p>
                        </Link>

                        <Link to="/elite/games/striker" state={{ playerProfile: { firstname, lastname, club, age: age ? Number(age) : null, position, gender } }} className="ps-card p-6 hover:scale-[1.03] transition">
                            <Target className="text-ps-gold" />
                            <h3 className="mt-3 font-bold uppercase">Striker — ELITE 3D {eliteStrikerResult ? <span className="text-ps-turf font-bold ml-2">✓</span> : null}</h3>
                            <p className="text-xs text-white/60 mt-1">Service types, keeper reads & goal-mouth finishing</p>
                        </Link>
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