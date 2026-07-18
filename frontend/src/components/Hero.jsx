import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Trophy } from "lucide-react";

const HERO_BG =
    "https://images.unsplash.com/photo-1772707681004-ebbce15554d4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwyfHxmb290YmFsbCUyMHRyYWluaW5nJTIwc3RhZGl1bSUyMG5pZ2h0fGVufDB8fHx8MTc3NzgxMzk3MHww&ixlib=rb-4.1.0&q=85";

export default function Hero() {
    return (
        <section
            data-testid="hero-section"
            className="relative overflow-hidden border-b border-white/10"
        >
            {/* Background stadium photo */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `url(${HERO_BG})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center 30%",
                    filter: "grayscale(0.35) contrast(1.1)",
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ps-bg via-ps-bg/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-ps-bg via-transparent to-ps-bg/40" />

            {/* Red diagonal accent bar */}
            <div className="absolute right-0 top-0 hidden h-full w-2 bg-ps-red lg:block" />
            <div className="absolute right-2 top-24 hidden h-16 w-[2px] rotate-12 bg-ps-red lg:block" />

            <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 md:py-28 lg:grid-cols-12">
                <div className="lg:col-span-8">
                    {/* Matchday tag */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-3"
                    >
                        <span className="block h-[2px] w-10 bg-ps-red" />
                        <span className="ps-label text-ps-red">
                            Cognitive Football Training
                        </span>
                        <span className="block h-[2px] w-10 bg-white/20" />
                        <span className="ps-label text-white/55">
                            Est. 2026 · UK
                        </span>
                    </motion.div>

                    {/* Editorial-style headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.05 }}
                        className="ps-section-title mt-6 text-[56px] leading-[0.88] text-white sm:text-6xl md:text-7xl lg:text-[108px]"
                    >
                        Think
                        <span className="mx-3 inline-block rotate-[-2deg] bg-ps-red px-4 text-white">
                            quicker.
                        </span>
                        <br />
                        Move&nbsp;
                        <span className="italic text-ps-red">smarter.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="mt-8 max-w-2xl font-body text-base leading-relaxed text-white/70 md:text-lg"
                    >
                        See the pass before it opens. React before the ball moves.
                        PlaySharp is short, focused drills that train your football
                        brain — so on the pitch, you're already a step ahead.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.25 }}
                        className="mt-10 flex flex-wrap items-center gap-3"
                    >
                        <Link to="/demo" data-testid="hero-cta-start-demo">
                            <button className="ps-btn-primary inline-flex items-center gap-2">
                                Start Demo <ArrowRight size={16} />
                            </button>
                        </Link>
                        <Link to="/pricing" data-testid="hero-cta-pricing">
                            <button className="ps-btn-secondary">
                                View Pricing
                            </button>
                        </Link>
                        <Link to="/contact" data-testid="hero-cta-contact">
                            <button className="ps-btn-secondary">
                                Contact Us
                            </button>
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        className="mt-14 flex max-w-2xl items-stretch gap-0 border-t border-white/10 pt-6"
                    >
                        <div className="flex-1 border-r border-white/10 pr-6">
                            <div className="ps-metric text-2xl text-white md:text-4xl">
                                250<span className="text-ps-red">ms</span>
                            </div>
                            <div className="ps-label mt-1">Avg Reaction Goal</div>
                        </div>
                        <div className="flex-1 border-r border-white/10 px-6">
                            <div className="ps-metric text-2xl text-white md:text-4xl">
                                10<span className="text-white/30">/10</span>
                            </div>
                            <div className="ps-label mt-1">Drill Rounds</div>
                        </div>
                        <div className="flex-1 pl-6">
                            <div className="ps-metric text-2xl text-white md:text-4xl">
                                &lt;60<span className="text-ps-turf">s</span>
                            </div>
                            <div className="ps-label mt-1">To Understand</div>
                        </div>
                    </motion.div>

                    {/* Mobile / tablet stat card. The desktop version lives in
                        the lg:col-span-4 right column below; this is its
                        phone-native equivalent so mobile users see the same
                        "sample session" moment. */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="mt-10 lg:hidden"
                        aria-hidden="true"
                    >
                        <div className="relative bg-ps-ink text-white">
                            <div className="flex items-center justify-between bg-ps-red px-4 py-2">
                                <span className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-white">
                                    Sample Session
                                </span>
                                <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-white">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                    LIVE
                                </span>
                            </div>
                            <div className="px-4 pb-4 pt-4">
                                <div className="grid grid-cols-2 gap-px bg-white/10">
                                    <div className="bg-ps-ink p-3">
                                        <div className="ps-label">Reaction</div>
                                        <div className="ps-metric mt-1 text-xl text-ps-red">
                                            238ms
                                        </div>
                                    </div>
                                    <div className="bg-ps-ink p-3">
                                        <div className="ps-label">Decisions</div>
                                        <div className="ps-metric mt-1 text-xl text-white">
                                            87%
                                        </div>
                                    </div>
                                    <div className="bg-ps-ink p-3">
                                        <div className="ps-label">Scan Rate</div>
                                        <div className="ps-metric mt-1 text-xl text-ps-turf">
                                            4.2/s
                                        </div>
                                    </div>
                                    <div className="bg-ps-ink p-3">
                                        <div className="ps-label">PlaySharp IQ</div>
                                        <div className="ps-metric mt-1 text-xl text-white">
                                            912
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-widest">
                                    <span className="text-white/50">Session 4 · Week 12</span>
                                    <span className="flex items-center gap-1 text-ps-turf">
                                        <Trophy size={9} /> +18 IQ
                                    </span>
                                </div>
                                <div className="mt-2 flex h-1 overflow-hidden bg-white/8">
                                    <div className="h-full w-[78%] bg-ps-red" />
                                    <div className="h-full w-[10%] bg-ps-turf" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right side match-day card */}
                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="hidden lg:col-span-4 lg:block"
                >
                    <div className="relative h-full bg-ps-ink text-white shadow-[0_0_60px_rgba(220,30,40,0.15)]">
                        {/* Red top strip */}
                        <div className="flex items-center justify-between bg-ps-red px-5 py-3">
                            <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-white">
                                Live Session
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-white">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                REC
                            </span>
                        </div>

                        <div className="px-6 pb-6 pt-6">
                            <div className="flex items-baseline justify-between">
                                <div>
                                    <div className="ps-label text-white/45">Player</div>
                                    <div className="mt-1 font-display text-3xl font-black uppercase leading-none text-white">
                                        Marcus J.
                                    </div>
                                    <div className="mt-1 text-xs tracking-wider text-white/50">
                                        South London FC · Age 17
                                    </div>
                                </div>
                                <div className="font-display text-5xl font-black text-ps-red">
                                    #9
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-px border border-white/8 bg-white/10">
                                <div className="bg-ps-ink p-4">
                                    <div className="ps-label">Reaction</div>
                                    <div className="ps-metric mt-2 text-2xl text-ps-red">
                                        238ms
                                    </div>
                                </div>
                                <div className="bg-ps-ink p-4">
                                    <div className="ps-label">Decisions</div>
                                    <div className="ps-metric mt-2 text-2xl text-white">
                                        87%
                                    </div>
                                </div>
                                <div className="bg-ps-ink p-4">
                                    <div className="ps-label">Scan Rate</div>
                                    <div className="ps-metric mt-2 text-2xl text-ps-turf">
                                        4.2/s
                                    </div>
                                </div>
                                <div className="bg-ps-ink p-4">
                                    <div className="ps-label">PlaySharp IQ</div>
                                    <div className="ps-metric mt-2 text-2xl text-white">
                                        912
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5">
                                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                                    <span className="text-white/50">Session 4 · Week 12</span>
                                    <span className="flex items-center gap-1 text-ps-turf">
                                        <Trophy size={10} /> +18 IQ
                                    </span>
                                </div>
                                <div className="mt-2 flex h-1.5 overflow-hidden bg-white/8">
                                    <div className="h-full w-[78%] bg-ps-red" />
                                    <div className="h-full w-[10%] bg-ps-turf" />
                                </div>
                            </div>
                        </div>

                        {/* Diagonal red bottom corner */}
                        <div className="absolute bottom-0 right-0 h-8 w-8 bg-ps-red" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
