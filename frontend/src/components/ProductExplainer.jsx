import { Eye, Gauge, GitBranch } from "lucide-react";

const PILLARS = [
    {
        Icon: Gauge,
        label: "Cognitive Football Training",
        title: "Train the brain, not just the body.",
        copy: "Football is decided in milliseconds. PlaySharp builds cognitive load into short, repeatable browser drills — used pre-session or as warm-ups.",
    },
    {
        Icon: GitBranch,
        label: "Short Interactive Drills",
        title: "60 seconds. Real measurement.",
        copy: "Each drill is fast, designed to fit in a warm-up or homework slot. Game-feel built with Phaser. Data captured every round.",
    },
    {
        Icon: Eye,
        label: "Measurable Performance",
        title: "Numbers a coach can use.",
        copy: "Track reaction in milliseconds, decision accuracy %, and football IQ over time — per player, per squad, per club.",
    },
];

export default function ProductExplainer() {
    return (
        <section
            id="product"
            data-testid="product-explainer-section"
            className="border-b border-white/10"
        >
            <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                        <p className="ps-label">What is PlaySharp?</p>
                        <h2 className="ps-section-title mt-3 text-4xl text-white md:text-5xl">
                            Cognitive training,
                            <br />
                            <span className="text-ps-red">measured in ms.</span>
                        </h2>
                        <p className="mt-6 max-w-md text-base leading-relaxed text-white/65">
                            PlaySharp is a browser-based cognitive training
                            platform purpose-built for football. Players sharpen
                            reaction speed, scanning, and decision-making
                            through short, measurable drills. Coaches get the
                            numbers. Clubs get the leaderboard.
                        </p>
                    </div>

                    <div className="lg:col-span-7">
                        <div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 md:grid-cols-3">
                            {PILLARS.map((p) => (
                                <div
                                    key={p.label}
                                    data-testid={`pillar-${p.label.toLowerCase().replace(/\s/g, "-")}`}
                                    className="flex flex-col gap-4 bg-ps-surface p-6"
                                >
                                    <div className="grid h-10 w-10 place-items-center border border-white/10 bg-ps-red/10">
                                        <p.Icon size={16} className="text-ps-red" />
                                    </div>
                                    <p className="ps-label text-white/55">{p.label}</p>
                                    <h3 className="font-heading text-xl font-bold uppercase tracking-tight text-white">
                                        {p.title}
                                    </h3>
                                    <p className="text-sm text-white/60">{p.copy}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
