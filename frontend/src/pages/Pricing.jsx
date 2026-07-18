import PricingCards from "@/components/PricingCards";
import ContactCTA from "@/components/ContactCTA";
import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";

// Columns: Free, Individual, Team, School, Academy
// Cell value: true, false, "soon", or a short string (e.g. "Up to 40")
const ROWS = [
    ["Reaction speed drills", "5 rounds", true, true, true, true],
    ["Decision drills", "3 scenarios", true, true, true, true],
    ["Scanning ability training", false, true, true, true, true],
    ["Football intelligence scoring", false, true, true, true, true],
    ["Personal progression history", false, true, true, true, true],
    ["Global leaderboard access", "view-only", true, true, true, true],
    ["Expanded drill library", false, false, true, true, true],
    ["Advanced analytics dashboard", false, false, true, true, true],
    ["Personalised training insights", false, false, true, true, true],
    ["Team leaderboard", false, false, true, true, true],
    ["Up to 40 player-models", false, false, true, "unlimited", "multi-team"],
    ["School-wide leaderboard", false, false, false, true, false],
    ["Classroom-safe mode", false, false, false, true, false],
    ["PE curriculum alignment", false, false, false, true, false],
    ["Teacher admin dashboard", false, false, false, true, false],
    ["Academy-wide leaderboard", false, false, false, false, true],
    ["Age-group cohorts (U9–U21)", false, false, false, false, true],
    ["Player development tracking", false, false, false, false, true],
    ["Scout-ready performance reports", false, false, false, false, true],
    ["Multi-team & multi-site support", false, false, false, false, true],
    ["AI Coaching", false, false, "soon", "soon", "soon"],
];

const HEADERS = ["Feature", "Free", "Individual", "Team", "School", "Academy"];

function Cell({ value }) {
    if (value === true)
        return (
            <span className="inline-grid h-5 w-5 place-items-center border border-ps-turf/40 bg-ps-turf/10 text-ps-turf">
                <Check size={11} strokeWidth={3} />
            </span>
        );
    if (value === false)
        return (
            <span className="inline-grid h-5 w-5 place-items-center border border-white/10 bg-white/5 text-white/30">
                —
            </span>
        );
    if (value === "soon")
        return (
            <span className="inline-flex items-center gap-1 border border-ps-turf/40 bg-ps-turf/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ps-turf">
                <Sparkles size={9} /> Soon
            </span>
        );
    return (
        <span className="text-[11px] uppercase tracking-wider text-white/70">
            {value}
        </span>
    );
}

export default function Pricing() {
    return (
        <div data-testid="pricing-page">
            <section className="border-b border-white/10">
                <div className="mx-auto max-w-7xl px-6 py-20">
                    <p className="ps-label">Pricing</p>
                    <h1 className="ps-section-title mt-3 text-5xl text-white md:text-6xl">
                        Choose your training plan.
                    </h1>
                    <p className="mt-4 max-w-xl text-base text-white/60">
                        Free to try. Paid plans for serious training. Contact us
                        for school or academy pilots — bespoke pricing based on
                        squad size.
                    </p>

                    <div className="mt-12">
                        <PricingCards />
                    </div>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link to="/demo" data-testid="pricing-page-cta-demo">
                            <button className="ps-btn-secondary">
                                Start Free Demo
                            </button>
                        </Link>
                        <Link to="/contact" data-testid="pricing-page-cta-contact">
                            <button className="ps-btn-secondary">
                                Contact Sales
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Comparison */}
            <section className="border-b border-white/10">
                <div className="mx-auto max-w-7xl px-6 py-20">
                    <p className="ps-label text-center">Plan comparison</p>
                    <h2 className="ps-section-title mt-3 text-center text-3xl text-white md:text-4xl">
                        What's in each tier.
                    </h2>

                    <div className="mt-10 overflow-x-auto">
                        <div className="min-w-[900px] border border-white/10 bg-ps-surface">
                            {/* Header row */}
                            <div className="grid grid-cols-12 border-b border-white/15 px-4 py-4 md:px-6">
                                {HEADERS.map((h, i) => (
                                    <div
                                        key={h}
                                        className={[
                                            "ps-label",
                                            i === 0 ? "col-span-4" : "col-span-[1.6]",
                                            i === 0 ? "" : "text-center",
                                            i === 3 ? "text-ps-red" : "",
                                        ].join(" ")}
                                        style={i > 0 ? { gridColumn: "span 1.6 / span 1.6" } : undefined}
                                    >
                                        {h}
                                    </div>
                                ))}
                            </div>

                            {/* Body — using CSS grid with custom cols to fit 5 tier columns */}
                            <div className="divide-y divide-white/5">
                                {ROWS.map(([label, ...cells]) => (
                                    <div
                                        key={label}
                                        className="grid items-center px-4 py-3 md:px-6"
                                        style={{
                                            gridTemplateColumns: "minmax(0, 2.5fr) repeat(5, minmax(0, 1fr))",
                                        }}
                                    >
                                        <div className="font-body text-sm text-white/85">
                                            {label}
                                        </div>
                                        {cells.map((c, i) => (
                                            <div key={i} className="flex justify-center">
                                                <Cell value={c} />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ContactCTA />
        </div>
    );
}
