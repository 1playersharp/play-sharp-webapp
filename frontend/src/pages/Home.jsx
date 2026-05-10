import Hero from "@/components/Hero";
import ProductExplainer from "@/components/ProductExplainer";
import AudienceCards from "@/components/AudienceCards";
import DemoPreview from "@/components/DemoPreview";
import PricingCards from "@/components/PricingCards";
import ContactCTA from "@/components/ContactCTA";
import Leaderboard from "@/components/Leaderboard";
import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div data-testid="home-page">
            <Hero />
            <ProductExplainer />
            <AudienceCards />
            <DemoPreview />

            {/* Leaderboard preview */}
            <section className="border-b border-white/10">
                <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
                    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                        <div>
                            <p className="ps-label">Leaderboard preview</p>
                            <h2 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                                The fastest brains rise to the top.
                            </h2>
                        </div>
                        <Link to="/leaderboard">
                            <button
                                data-testid="home-leaderboard-cta"
                                className="ps-btn-secondary"
                            >
                                View Full Leaderboard
                            </button>
                        </Link>
                    </div>
                    <div className="mt-10">
                        <Leaderboard defaultGameType="reaction" embed />
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section
                id="pricing"
                data-testid="home-pricing-section"
                className="border-b border-white/10"
            >
                <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
                    <div className="text-center">
                        <p className="ps-label">Pricing</p>
                        <h2 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                            Simple plans. Real outcomes.
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-sm text-white/55">
                            Start free with a demo. Pick Basic for individual
                            players, or Advanced for squads, clubs, and
                            academies.
                        </p>
                    </div>
                    <div className="mt-12">
                        <PricingCards />
                    </div>
                </div>
            </section>

            <ContactCTA />
        </div>
    );
}
