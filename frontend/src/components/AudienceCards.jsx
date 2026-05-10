import { motion } from "framer-motion";
import { Zap, Brain, Trophy, GraduationCap } from "lucide-react";

const AUDIENCE = [
    {
        key: "players",
        title: "Players",
        Icon: Zap,
        kpi: "+22% reaction speed",
        copy: "Faster reactions, better decisions, sharper scanning. Train like elite athletes.",
        bullets: ["Sub-300ms reaction targets", "Decision accuracy tracking", "Personal best history"],
        image: "https://images.unsplash.com/photo-1772707681004-ebbce15554d4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwyfHxmb290YmFsbCUyMHRyYWluaW5nJTIwc3RhZGl1bSUyMG5pZ2h0fGVufDB8fHx8MTc3NzgxMzk3MHww&ixlib=rb-4.1.0&q=85",
    },
    {
        key: "coaches",
        title: "Coaches",
        Icon: Brain,
        kpi: "Track tactical IQ",
        copy: "Build tactical awareness, monitor player progress, run focused micro-sessions.",
        bullets: ["Cognitive performance metrics", "Per-player progression", "Designed for warm-ups"],
        image: "https://static.prod-images.emergentagent.com/jobs/11e47a01-0d53-49e0-ad4f-66f4f563ae1a/images/e6d86e4a22b1a91c8cd70b5615f8ceb25a738a8f790aedd2e2f337fedafafde0.png",
    },
    {
        key: "clubs",
        title: "Clubs",
        Icon: Trophy,
        kpi: "Internal competition",
        copy: "Run weekly challenges and squad-wide leaderboards to drive competitive edge.",
        bullets: ["Club leaderboards", "Weekly cognitive challenges", "Multi-team support"],
        image: "https://static.prod-images.emergentagent.com/jobs/11e47a01-0d53-49e0-ad4f-66f4f563ae1a/images/d4805fcb51f0c896d8820ef6faac9f77cde7ca499b493b416067033267686410.png",
    },
    {
        key: "schools",
        title: "Schools",
        Icon: GraduationCap,
        kpi: "Structured PE",
        copy: "Add structured cognitive training to PE and football academies, ages 10+.",
        bullets: ["Curriculum-friendly drills", "Browser-based, zero install", "Safe, classroom-ready"],
        image: "https://static.prod-images.emergentagent.com/jobs/11e47a01-0d53-49e0-ad4f-66f4f563ae1a/images/d4805fcb51f0c896d8820ef6faac9f77cde7ca499b493b416067033267686410.png",
    },
];

export default function AudienceCards() {
    return (
        <section
            id="audience"
            data-testid="audience-section"
            className="border-b border-white/10"
        >
            <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="ps-label">Built for</p>
                        <h2 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                            Every part of the football pyramid.
                        </h2>
                    </div>
                    <p className="max-w-md text-sm text-white/55">
                        From grassroots schools to academy clubs, PlaySharp
                        plugs into the modern football workflow — players,
                        coaches, clubs, schools.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {AUDIENCE.map((a, i) => (
                        <motion.div
                            key={a.key}
                            data-testid={`audience-card-${a.key}`}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            whileHover={{ y: -4 }}
                            className="ps-card group relative overflow-hidden"
                        >
                            <div className="relative h-40 overflow-hidden">
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                                    style={{ backgroundImage: `url(${a.image})` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-ps-surface via-ps-surface/40 to-transparent" />
                                <div className="absolute right-3 top-3 border border-white/15 bg-black/40 px-2 py-1 backdrop-blur">
                                    <a.Icon size={14} className="text-white" />
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="ps-label text-ps-turf">{a.kpi}</p>
                                <h3 className="mt-2 font-heading text-2xl font-bold uppercase tracking-tight text-white">
                                    {a.title}
                                </h3>
                                <p className="mt-2 text-sm text-white/60">{a.copy}</p>
                                <ul className="mt-4 space-y-1.5 border-t border-white/5 pt-4">
                                    {a.bullets.map((b) => (
                                        <li
                                            key={b}
                                            className="flex items-center gap-2 text-xs text-white/55"
                                        >
                                            <span className="h-1 w-1 bg-ps-red" />
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
