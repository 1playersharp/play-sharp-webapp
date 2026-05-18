import { Link } from "react-router-dom";
import { Activity, Brain, Trophy, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const TACTICAL_BG =
    "https://static.prod-images.emergentagent.com/jobs/11e47a01-0d53-49e0-ad4f-66f4f563ae1a/images/8dae8c7efd790c7b6eda837b33805f29c47ce457d964808a20c2b696f966769b.png";

const previews = [
    {
        key: "reaction",
        to: "/games/reaction",
        Icon: Activity,
        title: "Reaction Drill",
        meta: "5 ROUNDS · MS PRECISION",
        desc: "Tap the green circle the instant it flashes. 5 rounds, random positions, ms precision. False starts cost you.",
    },
    {
        key: "decision",
        to: "/games/decision",
        Icon: Brain,
        title: "Decision Drill",
        meta: "5 SCENARIOS · ANIMATED",
        desc: "Animated football scenarios — channel runs, overloads, defensive shape, box arrivals. Watch the play unfold then pick A / B / C.",
    },
    {
        key: "leaderboard",
        to: "/leaderboard",
        Icon: Trophy,
        title: "Leaderboard",
        meta: "GLOBAL · CLUB · WEEKLY",
        desc: "Compete across clubs and schools. Filter by your team or check the weekly challenge view to see who's been training.",
    },
];

export default function DemoPreview() {
    return (
        <section
            id="demo"
            data-testid="demo-preview-section"
            className="relative border-b border-white/10"
        >
            <div
                className="absolute inset-0 opacity-15"
                style={{
                    backgroundImage: `url(${TACTICAL_BG})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ps-bg/85 via-ps-bg/95 to-ps-bg" />

            <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="ps-label">Live Demo</p>
                        <h2 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                            Train your brain like an athlete.
                        </h2>
                    </div>
                    <Link
                        to="/demo"
                        data-testid="demo-preview-cta-start"
                        className="ps-btn-primary inline-flex items-center gap-2"
                    >
                        Run Full Demo <ArrowUpRight size={16} />
                    </Link>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {previews.map((p, i) => (
                        <motion.div
                            key={p.key}
                            data-testid={`demo-preview-${p.key}`}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.5, delay: i * 0.06 }}
                        >
                            <Link to={p.to} className="block">
                                <div className="ps-card group h-full p-6 transition-all hover:-translate-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="grid h-11 w-11 place-items-center border border-white/10 bg-ps-red/10">
                                            <p.Icon size={18} className="text-ps-red" />
                                        </div>
                                        <span className="font-mono text-[10px] tracking-wider text-white/40">
                                            {p.meta}
                                        </span>
                                    </div>
                                    <h3 className="mt-6 font-heading text-2xl font-bold uppercase tracking-tight text-white">
                                        {p.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-white/55">{p.desc}</p>
                                    <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                                        <span className="ps-label text-white/40">Try it</span>
                                        <ArrowUpRight
                                            size={18}
                                            className="text-white/40 transition-all group-hover:text-ps-red group-hover:translate-x-0.5"
                                        />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
