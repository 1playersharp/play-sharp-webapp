import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
} from "recharts";

export default function PlayerRadar({ data }) {
    const chartData = [
        { metric: "Scanning", value: data.scanning },
        { metric: "Awareness", value: data.awareness },
        { metric: "Tempo", value: data.tempo },
        { metric: "Decision", value: data.decisionSpeed },
    ];

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">
                Player Radar
            </h3>

            <RadarChart width={400} height={300} data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis />
                <Radar
                    dataKey="value"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.5}
                />
            </RadarChart>
        </div>
    );
}