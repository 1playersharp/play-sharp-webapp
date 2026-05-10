import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";

const PLANS = [
    {
        key: "free",
        name: "Free",
        price: "£0",
        period: "forever",
        tagline: "Try the full demo, no credit card required.",
        features: [
            "Limited reaction drill (5 rounds)",
            "Limited decision drill (3 scenarios)",
            "Personal leaderboard only",
            "Single-player only",
        ],
        cta: "Start Free",
        href: "/demo",
        dataTestId: "pricing-card-free",
        ctaTestId: "pricing-cta-free",
        accent: null,
    },
    {
        key: "individual",
        name: "Individual Player",
        price: "£29",
        period: "/month",
        tagline: "For players serious about training their brain.",
        features: [
            "Full reaction speed drills",
            "Scanning ability training",
            "Decision-making under pressure",
            "Football intelligence scoring",
            "Global leaderboard access",
            "Personal progression history",
        ],
        cta: "Start Free Demo",
        href: "/demo",
        dataTestId: "pricing-card-individual",
        ctaTestId: "pricing-cta-individual",
        accent: null,
    },
    {
        key: "team",
        name: "Team",
        price: "£249",
        period: "/month",
        tagline: "For clubs & teams. Squad-level cognitive performance.",
        features: [
            "Everything in Individual",
            "Expanded drill library",
            "Advanced analytics dashboard",
            "Personalised training insights",
            "Team leaderboard & challenges",
            "Up to 30 players per team",
        ],
        coming: "AI Coaching",
        cta: "Contact Sales",
        href: "/contact",
        dataTestId: "pricing-card-team",
        ctaTestId: "pricing-cta-team",
        accent: "red",
        featured: true,
    },
    {
        key: "school",
        name: "School",
        price: "Contact",
        period: "for price",
        tagline: "Curriculum-friendly PE integration.",
        features: [
            "Everything in Team",
            "Global + school-wide leaderboards",
            "Classroom-safe mode",
            "Teacher admin dashboard",
            "PE curriculum alignment (KS3–KS5)",
            "Unlimited students",
        ],
        coming: "AI Coaching",
        cta: "Contact Sales",
        href: "/contact",
        dataTestId: "pricing-card-school",
        ctaTestId: "pricing-cta-school",
        accent: "turf",
    },
    {
        key: "academy",
        name: "Academy",
        price: "Contact",
        period: "for price",
        tagline: "For professional academies & development pathways.",
        features: [
            "Everything in Team",
            "Global + academy-wide leaderboards",
            "Age-group cohorts (U9–U18)",
            "Player development tracking",
            "Scout-ready performance reports",
            "Multi-team & multi-site support",
        ],
        coming: "AI Coaching",
        cta: "Contact Sales",
        href: "/contact",
        dataTestId: "pricing-card-academy",
        ctaTestId: "pricing-cta-academy",
        accent: "turf",
    },
];

function FeatureRow({ children }) {
    return (
        <li className="flex items-start gap-3 py-2 text-sm text-white/80">
            <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center border border-ps-turf/40 bg-ps-turf/10 text-ps-turf">
                <Check size={11} strokeWidth={3} />
            </span>
            <span>{children}</span>
        </li>
    );
}

function PlanCard({ plan }) {
    const isFeatured = plan.featured;
    const isContact = plan.price === "Contact";

    return (
        <div
            data-testid={plan.dataTestId}
            className={[
                "relative flex flex-col bg-ps-surface p-7 transition-all",
                isFeatured ? "ps-trace-border" : "border border-white/10 hover:border-ps-red/50",
            ].join(" ")}
            style={{ borderRadius: 2 }}
        >
            {isFeatured && (
                <div className="absolute -top-3 left-6 bg-ps-red px-2 py-1 font-display text-[10px] font-black uppercase tracking-[0.2em] text-white">
                    Most Popular
                </div>
            )}

            <div className="flex items-center justify-between">
                <p className="ps-label">{plan.name}</p>
                {plan.coming && (
                    <span className="inline-flex items-center gap-1 border border-ps-turf/40 bg-ps-turf/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-ps-turf">
                        <Sparkles size={10} /> {plan.coming} soon
                    </span>
                )}
            </div>

            <div className="mt-3 flex items-baseline gap-1">
                <span
                    className={[
                        "font-display font-black text-white",
                        isContact ? "text-3xl md:text-4xl" : "text-5xl md:text-6xl",
                    ].join(" ")}
                >
                    {plan.price}
                </span>
                <span className="font-body text-sm text-white/55">{plan.period}</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/55">{plan.tagline}</p>

            <ul className="mt-6 flex-1 border-t border-white/5 pt-4">
                {plan.features.map((f) => (
                    <FeatureRow key={f}>{f}</FeatureRow>
                ))}
                {plan.coming && (
                    <li className="mt-2 flex items-start gap-3 py-2 text-sm text-white/70">
                        <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center border border-ps-turf/40 bg-ps-turf/10 text-ps-turf">
                            <Sparkles size={10} />
                        </span>
                        <span>
                            <strong className="text-ps-turf">{plan.coming}</strong>
                            <span className="ml-1 text-white/55">— coming soon</span>
                        </span>
                    </li>
                )}
            </ul>

            <Link to={plan.href} className="mt-6 block">
                <button
                    data-testid={plan.ctaTestId}
                    className={[
                        "w-full",
                        isFeatured ? "ps-btn-primary" : "ps-btn-secondary",
                    ].join(" ")}
                >
                    {plan.cta}
                </button>
            </Link>
        </div>
    );
}

export default function PricingCards() {
    return (
        <div
            data-testid="pricing-cards"
            className="mx-auto grid max-w-7xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5"
        >
            {PLANS.map((p) => (
                <PlanCard key={p.key} plan={p} />
            ))}
        </div>
    );
}

export { PLANS };
