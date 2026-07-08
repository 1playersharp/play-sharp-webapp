import Hero from "@/components/Hero";
import ProductExplainer from "@/components/ProductExplainer";
import AudienceCards from "@/components/AudienceCards";
import DemoPreview from "@/components/DemoPreview";
import PricingCards from "@/components/PricingCards";
import ContactCTA from "@/components/ContactCTA";
import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div data-testid="home-page">
            <Hero />
            <ProductExplainer />
            <AudienceCards />
            <DemoPreview />

        {/* AI Match Analysis CTA */}
        <section className="border-b border-white/10">
            <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">

                <div className="text-center">
                    <p className="ps-label">AI Match Analysis</p>

                    <h2 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                        Turn your Veo footage into elite performance insights.
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl text-sm text-white/55">
                        Upload a full match and get AI-powered breakdowns of scanning,
                        decision-making, tempo control, and off-ball intelligence.
                    </p>

                    <div className="mt-8 flex justify-center gap-4">
                        <Link to="/match-report">
                            <button className="ps-btn-secondary">
                                 Upload Match
                            </button>
                        </Link>

                        <Link to="/match-report">
                            <button className="ps-btn-primary">
                                View Example Report
                            </button>
                        </Link>     
            </div>
        </div>

        {/* Mini preview cards */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold">Scanning Intelligence</h3>
                <p className="mt-2 text-sm text-white/60">
                    Measure how often players check space before receiving.
                </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold">Decision Speed</h3>
                <p className="mt-2 text-sm text-white/60">
                    Track how quickly players execute under pressure.
                </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold">Game Tempo Control</h3>
                <p className="mt-2 text-sm text-white/60">
                    Understand who controls rhythm in possession.
                </p>
            </div>
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
