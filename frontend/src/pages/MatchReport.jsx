import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/**
 * =========================
 * YOUTUBE BROADCAST
 * =========================
 */
function YouTubeBroadcast() {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-sm font-semibold mb-3">
                Match Broadcast Feed
            </p>

            <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10">
                <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/Vj6kDXmz43I"
                    title="Match Broadcast"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    );
}

/**
 * =========================
 * SIMPLE RADAR (CLEAN UX)
 * =========================
 */
function SimpleRadar({ data }) {
    const items = [
        { k: "scanning", label: "Scanning" },
        { k: "awareness", label: "Awareness" },
        { k: "tempo", label: "Tempo" },
        { k: "decisionSpeed", label: "Decision" },
    ];

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-4">
                Player Performance
            </h3>

            <div className="space-y-4">
                {items.map((i) => (
                    <div key={i.k}>
                        <div className="flex justify-between text-xs text-white/60">
                            <span>{i.label}</span>
                            <span className="text-green-400 font-bold">
                                {data[i.k]} / 100
                            </span>
                        </div>

                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-2 bg-green-400"
                                style={{ width: `${data[i.k]}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * =========================
 * CAREER CARD
 * =========================
 */
function CareerCard() {
    return (
        <div className="mt-10 ps-card p-6 flex justify-between border border-white/10 bg-white/5 rounded-2xl">
            <div>
                <p className="ps-label">Career Mode Profile</p>
                <h1 className="text-2xl font-bold uppercase mt-3">
                    Liam Carter
                </h1>
                <p className="text-white/60 text-sm">
                    U12 Academy · CM · Age 11
                </p>

                <div className="mt-4 text-xs text-white/50 space-y-1">
                    <p>📈 Scanning improving</p>
                    <p>📈 Awareness growth trend</p>
                    <p>📉 Tempo fluctuating under pressure</p>
                </div>
            </div>

            <div className="text-right">
                <p className="ps-label">Football IQ</p>
                <div className="text-3xl font-bold text-green-400">
                    70
                </div>
            </div>
        </div>
    );
}

/**
 * =========================
 * 🟢 DEVELOPMENT CURVE (REAL GRAPH)
 * =========================
 */
function DevelopmentTimeline() {
    const data = [
        { match: "M1", score: 62 },
        { match: "M2", score: 66 },
        { match: "M3", score: 71 },
        { match: "M4", score: 75 },
        { match: "M5", score: 79 },
    ];

    const width = 600;
    const height = 200;

    const max = 100;
    const min = 50;

    const points = data
        .map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d.score - min) / (max - min)) * height;
            return `${x},${y}`;
        })
        .join(" ");

    return (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">

            <h3 className="text-lg font-semibold">
                Player Development Curve
            </h3>

            <p className="text-xs text-white/50 mb-6">
                Career Mode progression (0–100 cognitive scale)
            </p>

            <div className="overflow-x-auto">
                <svg width={width} height={height} className="w-full">

                    {/* BASE LINE */}
                    <line
                        x1="0"
                        y1={height}
                        x2={width}
                        y2={height}
                        stroke="rgba(255,255,255,0.1)"
                    />

                    {/* CURVE */}
                    <polyline
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3"
                        points={points}
                    />

                    {/* DOTS */}
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * width;
                        const y =
                            height - ((d.score - min) / (max - min)) * height;

                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="4"
                                fill="#22c55e"
                            />
                        );
                    })}
                </svg>
            </div>

            <div className="flex justify-between mt-3 text-xs text-white/50">
                {data.map((d, i) => (
                    <span key={i}>{d.match}</span>
                ))}
            </div>
        </div>
    );
}

/**
 * =========================
 * LOADER (UPLOAD FLOW)
 * =========================
 */
function Loader() {
    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-white">
            <div className="text-center">
                <div className="h-20 w-20 mx-auto border-4 border-white/10 border-t-green-400 rounded-full animate-spin" />

                <h2 className="mt-6 text-2xl font-bold">
                    Processing Match
                </h2>

                <p className="text-white/60 mt-2">
                    AI building player intelligence model...
                </p>
            </div>
        </div>
    );
}

/**
 * =========================
 * MAIN PAGE
 * =========================
 */
export default function MatchReportPage() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleUpload = () => {
        setLoading(true);

        setTimeout(() => {
            setLoading(false);
            navigate("/match-report");
        }, 4000);
    };

    return (
        <div className="mx-auto max-w-6xl px-6 py-16 text-white">

            {/* HEADER + UPLOAD */}
            <div className="flex justify-between items-start">
                <div>
                    <p className="ps-label">AI Match Report</p>
                    <h1 className="mt-2 text-4xl font-bold">
                        Demo Academy vs Rivals FC · U12 League Match
                    </h1>
                    <h2 className="mt-2 text-3xl font-bold">
                        Liam Carter
                    </h2>
                    <p className="mt-2 text-white/60">
                        Cognitive performance + tactical breakdown
                    </p>
                </div>

                <button
                    onClick={handleUpload}
                    className="ps-btn-primary"
                >
                    Upload Match
                </button>
            </div>

            {loading && <Loader />}

            {/* BROADCAST */}
            <div className="mt-10">
                <YouTubeBroadcast />
            </div>

            {/* RADAR + PROFILE */}
            <div className="mt-10 grid md:grid-cols-2 gap-6">
                <SimpleRadar
                    data={{
                        scanning: 70,
                        awareness: 75,
                        tempo: 72,
                        decisionSpeed: 70,
                    }}
                />

                <CareerCard />
            </div>

            {/* DEVELOPMENT CURVE */}
            <DevelopmentTimeline />

            {/* INSIGHTS */}
            {/* <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold">
                    AI Coaching Summary
                </h3>

                <ul className="mt-4 space-y-2 text-white/70">
                    <li>• Scanning improving across matches</li>
                    <li>• Decision speed inconsistent under pressure</li>
                    <li>• Strong progressive passing patterns emerging</li>
                </ul>
            </div> */}

            {/* CTA */}
            <div className="mt-12 text-center">
                <Link to="/upload">
                    <button className="ps-btn-secondary">
                        Upload Full Analysis
                    </button>
                </Link>
            </div>
        </div>
    );
}