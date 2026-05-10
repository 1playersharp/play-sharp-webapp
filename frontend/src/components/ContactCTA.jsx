import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function ContactCTA() {
    return (
        <section
            data-testid="contact-cta-section"
            className="border-b border-white/10"
        >
            <div className="relative mx-auto max-w-7xl px-6 py-24">
                <div className="ps-card relative overflow-hidden p-10 md:p-16">
                    <div className="ps-grid absolute inset-0 opacity-30" />
                    <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-ps-red/15 to-transparent" />
                    <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                        <div className="max-w-2xl">
                            <p className="ps-label text-ps-turf">For Clubs &amp; Schools</p>
                            <h3 className="ps-section-title mt-3 text-3xl text-white md:text-5xl">
                                Want PlaySharp at your club or school?
                            </h3>
                            <p className="mt-4 max-w-xl text-base text-white/60">
                                Book a 20-minute call. We'll set up a pilot for
                                your squad — drills, leaderboards, and a
                                progress dashboard tailored to your team.
                            </p>
                        </div>
                        <Link to="/contact" data-testid="contact-cta-button">
                            <button className="ps-btn-primary inline-flex items-center gap-2 whitespace-nowrap">
                                Contact Us <ArrowRight size={16} />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
