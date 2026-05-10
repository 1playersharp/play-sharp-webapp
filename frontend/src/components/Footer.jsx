import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer
            data-testid="site-footer"
            className="border-t border-white/10 bg-ps-bg"
        >
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-4">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center border border-white/15 bg-ps-red/15">
                            <span className="block h-2 w-2 rotate-45 bg-ps-red" />
                        </span>
                        <span className="font-heading text-2xl font-black uppercase tracking-tight">
                            Play<span className="text-ps-red">Sharp</span>
                        </span>
                    </div>
                    <p className="mt-4 max-w-md font-body text-sm leading-relaxed text-white/55">
                        Cognitive football training built for clubs, schools,
                        and academies. Faster reactions. Sharper decisions.
                        Higher football IQ.
                    </p>
                    <p className="mt-6 ps-label text-white/40">
                        Think quicker. Move smarter.
                    </p>
                </div>

                <div>
                    <p className="ps-label">Product</p>
                    <ul className="mt-4 space-y-3 font-body text-sm">
                        <li>
                            <Link
                                to="/demo"
                                className="text-white/65 hover:text-white"
                            >
                                Live Demo
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/games/reaction"
                                className="text-white/65 hover:text-white"
                            >
                                Reaction Drill
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/games/decision"
                                className="text-white/65 hover:text-white"
                            >
                                Decision Drill
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/leaderboard"
                                className="text-white/65 hover:text-white"
                            >
                                Leaderboard
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <p className="ps-label">Company</p>
                    <ul className="mt-4 space-y-3 font-body text-sm">
                        <li>
                            <Link
                                to="/pricing"
                                className="text-white/65 hover:text-white"
                            >
                                Pricing
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/contact"
                                className="text-white/65 hover:text-white"
                            >
                                Contact Sales
                            </Link>
                        </li>
                        <li className="text-white/45">Clubs &amp; Schools</li>
                        <li className="text-white/45">Partnerships</li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-white/5">
                <div className="mx-auto flex max-w-7xl flex-col items-start gap-2 px-6 py-5 text-xs text-white/40 md:flex-row md:items-center md:justify-between">
                    <p>© {new Date().getFullYear()} PlaySharp Ltd. All rights reserved.</p>
                    <p className="font-mono">v1.0 · MVP</p>
                </div>
            </div>
        </footer>
    );
}
