import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";

import { fetchLeaderboard, listClubs } from "@/services/api";
import { Loader2, Trophy } from "lucide-react";

function rankBadge(idx) {
    if (idx === 0) return "text-yellow-300";
    if (idx === 1) return "text-slate-200";
    if (idx === 2) return "text-amber-600";
    return "text-white/40";
}

function podiumStyles(idx) {
    if (idx === 0) {
        return "border-yellow-400/40 bg-yellow-500/10 shadow-[0_0_30px_rgba(250,204,21,0.15)]";
    }

    if (idx === 1) {
        return "border-slate-300/30 bg-slate-200/5 shadow-[0_0_24px_rgba(226,232,240,0.10)]";
    }

    if (idx === 2) {
        return "border-amber-700/40 bg-amber-700/10 shadow-[0_0_24px_rgba(180,83,9,0.15)]";
    }

    return "";
}

function podiumIcon(idx) {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return null;
}

export default function Leaderboard({
    defaultGameType = "reaction",
    embed = false,
    refreshKey = 0,
    highlightName = null,
    limit = 20,
}) {
    const [gameType, setGameType] = useState(defaultGameType);
    const [club, setClub] = useState("All");
    const [period, setPeriod] = useState("all");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clubOptions, setClubOptions] = useState(["All"]);

    const meRowRef = useRef(null);

    useEffect(() => {
        if (highlightName && meRowRef.current) {
            try {
                meRowRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            } catch (e) {
                /* noop */
            }
        }
    }, [rows, highlightName]);

    useEffect(() => {
        let active = true;

        listClubs()
            .then((data) => {
                if (!active) return;

                const names = (data || [])
                    .map((c) => c.name)
                    .filter(Boolean);

                setClubOptions(["All", ...names]);
            })
            .catch(() => {
                if (active) {
                    setClubOptions(["All"]);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        setLoading(true);

        fetchLeaderboard(gameType, {
            club,
            period,
            limit,
        })
            .then((data) => {
                if (active) {
                    setRows(data.results || []);
                }
            })
            .catch(() => {
                if (active) {
                    setRows([]);
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [gameType, club, period, refreshKey, limit]);

    useEffect(() => {
        if (refreshKey === 0) return;

        let active = true;

        listClubs()
            .then((data) => {
                if (!active) return;

                const names = (data || [])
                    .map((c) => c.name)
                    .filter(Boolean);

                setClubOptions(["All", ...names]);
            })
            .catch(() => {});

        return () => {
            active = false;
        };
    }, [refreshKey]);

    return (
        <div
            data-testid="leaderboard-component"
            className="w-full"
        >
            <div className="mb-6 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
                <Tabs
                    value={gameType}
                    onValueChange={setGameType}
                >
                    <TabsList
                        data-testid="leaderboard-tabs"
                        className="border border-white/10 bg-ps-surface p-1"
                    >
                        <TabsTrigger
                            value="reaction"
                            data-testid="leaderboard-tab-reaction"
                            className="font-heading text-xs font-bold uppercase tracking-[0.18em] data-[state=active]:bg-ps-red data-[state=active]:text-white"
                        >
                            Reaction
                        </TabsTrigger>

                        <TabsTrigger
                            value="decision"
                            data-testid="leaderboard-tab-decision"
                            className="font-heading text-xs font-bold uppercase tracking-[0.18em] data-[state=active]:bg-ps-red data-[state=active]:text-white"
                        >
                            Decision
                        </TabsTrigger>

                        <TabsTrigger
                            value="scanning"
                            data-testid="leaderboard-tab-scanning"
                            className="font-heading text-xs font-bold uppercase tracking-[0.18em] data-[state=active]:bg-ps-red data-[state=active]:text-white"
                        >
                            Scanning
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="reaction" />
                    <TabsContent value="decision" />
                    <TabsContent value="scanning" />
                </Tabs>

                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={club}
                        onValueChange={setClub}
                    >
                        <SelectTrigger
                            data-testid="leaderboard-club-filter"
                            className="h-10 w-44 rounded-none border-white/15 bg-ps-surface font-heading text-xs uppercase tracking-[0.16em] text-white"
                        >
                            <SelectValue placeholder="Club" />
                        </SelectTrigger>

                        <SelectContent className="border-white/15 bg-ps-surface text-white">
                            {clubOptions.map((c) => (
                                <SelectItem
                                    key={c}
                                    value={c}
                                    data-testid={`club-option-${c.replace(/\s/g, "-")}`}
                                    className="font-body text-sm"
                                >
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={period}
                        onValueChange={setPeriod}
                    >
                        <SelectTrigger
                            data-testid="leaderboard-period-filter"
                            className="h-10 w-40 rounded-none border-white/15 bg-ps-surface font-heading text-xs uppercase tracking-[0.16em] text-white"
                        >
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent className="border-white/15 bg-ps-surface text-white">
                            <SelectItem
                                value="all"
                                data-testid="period-option-all"
                            >
                                All time
                            </SelectItem>

                            <SelectItem
                                value="weekly"
                                data-testid="period-option-weekly"
                            >
                                Weekly challenge
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="overflow-hidden border border-white/10 bg-ps-surface">
                <div className="grid grid-cols-12 border-b border-ps-red bg-ps-red/95 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white md:px-6">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Player</div>
                    <div className="col-span-4 hidden md:block">Club</div>

                    <div className="col-span-3 text-right md:col-span-3">
                        {gameType === "reaction"
                            ? "Reaction"
                            : "Score"}
                    </div>
                </div>

                {loading && (
                    <div
                        data-testid="leaderboard-loading"
                        className="flex items-center justify-center py-16 text-white/40"
                    >
                        <Loader2
                            className="animate-spin"
                            size={20}
                        />
                    </div>
                )}

                {!loading && rows.length === 0 && (
                    <div
                        data-testid="leaderboard-empty"
                        className="flex flex-col items-center justify-center gap-2 py-16 text-white/45"
                    >
                        <Trophy
                            size={20}
                            className="text-white/30"
                        />

                        <p className="font-body text-sm">
                            No scores yet — be the first.
                        </p>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {!loading &&
                        rows.map((r, idx) => {
                            const isMe =
                                highlightName &&
                                r.name &&
                                r.name.trim().toLowerCase() ===
                                    highlightName.trim().toLowerCase();

                            return (
                                <motion.div
                                    key={r.id || r._id || idx}
                                    layout
                                    layoutScroll
                                    initial={{
                                        opacity: 0,
                                        y: 16,
                                        scale: idx < 3 ? 0.96 : 1,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale:
                                            idx === 0
                                                ? [1, 1.015, 1]
                                                : 1,
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: -10,
                                    }}
                                    transition={{
                                        layout: {
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 38,
                                        },
                                        scale: {
                                            duration: 1.8,
                                            repeat:
                                                idx === 0
                                                    ? Infinity
                                                    : 0,
                                        },
                                        opacity: {
                                            duration: 0.2,
                                        },
                                    }}
                                    ref={isMe ? meRowRef : undefined}
                                    data-testid={`leaderboard-row-${idx}`}
                                    className={[
                                        "grid grid-cols-12 items-center border-b px-4 py-3 transition-all md:px-6",
                                        isMe
                                            ? "border-ps-red/40 bg-ps-red/10 hover:bg-ps-red/15"
                                            : "border-white/5 hover:bg-white/[0.03]",
                                        idx < 3
                                            ? podiumStyles(idx)
                                            : "",
                                    ].join(" ")}
                                >
                                    <motion.div
                                        layout
                                        className={[
                                            "col-span-1 flex items-center gap-2 font-mono text-base font-bold",
                                            rankBadge(idx),
                                        ].join(" ")}
                                    >
                                        {podiumIcon(idx) && (
                                            <motion.span
                                                initial={{
                                                    scale: 0.6,
                                                    rotate: -12,
                                                }}
                                                animate={{
                                                    scale: 1,
                                                    rotate: 0,
                                                }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 400,
                                                    damping: 10,
                                                }}
                                                className="text-lg"
                                            >
                                                {podiumIcon(idx)}
                                            </motion.span>
                                        )}

                                        <span>
                                            {String(idx + 1).padStart(2, "0")}
                                        </span>
                                    </motion.div>

                                    <div className="col-span-4">
                                        <div className="flex items-center gap-2 font-heading text-base font-semibold uppercase tracking-wide text-white">
                                            {r.name}

                                            {isMe && (
                                                <motion.span
                                                    initial={{
                                                        scale: 0.8,
                                                        opacity: 0,
                                                    }}
                                                    animate={{
                                                        scale: 1,
                                                        opacity: 1,
                                                    }}
                                                    className="border border-ps-red bg-ps-red px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white"
                                                >
                                                    You
                                                </motion.span>
                                            )}
                                        </div>

                                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 md:hidden">
                                            {r.club}
                                        </div>
                                    </div>

                                    <div className="col-span-4 hidden font-body text-sm text-white/60 md:block">
                                        {r.club}
                                    </div>

                                    <div className="col-span-3 text-right font-mono text-base font-bold text-white md:col-span-3">
                                        {gameType === "reaction"
                                            ? typeof r.reactionTime ===
                                              "number"
                                                ? `${Math.round(
                                                      r.reactionTime
                                                  )} ms`
                                                : "— ms"
                                            : `${r.score} pts`}
                                    </div>
                                </motion.div>
                            );
                        })}
                </AnimatePresence>
            </div>

            {!embed && (
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/40">
                    {gameType === "reaction"
                        ? "Lower reaction time = better"
                        : "Higher score = better"}
                </p>
            )}
        </div>
    );
}