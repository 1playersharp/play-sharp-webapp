import { useEffect, useRef, useState } from "react";
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
    if (idx === 0) return "text-ps-red";
    if (idx === 1) return "text-white";
    if (idx === 2) return "text-ps-turf";
    return "text-white/40";
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

    // Scroll the user's own row into view whenever rows change and we have a name to match.
    useEffect(() => {
        if (highlightName && meRowRef.current) {
            try {
                meRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
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
                const names = (data || []).map((c) => c.name).filter(Boolean);
                setClubOptions(["All", ...names]);
            })
            .catch(() => active && setClubOptions(["All"]));
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetchLeaderboard(gameType, { club, period, limit })
            .then((data) => {
                if (active) setRows(data.results || []);
            })
            .catch(() => {
                if (active) setRows([]);
            })
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [gameType, club, period, refreshKey, limit]);

    // When refreshKey changes, also re-fetch the dynamic club options so a
    // freshly-submitted club shows up in the filter dropdown.
    useEffect(() => {
        if (refreshKey === 0) return;
        let active = true;
        listClubs()
            .then((data) => {
                if (!active) return;
                const names = (data || []).map((c) => c.name).filter(Boolean);
                setClubOptions(["All", ...names]);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [refreshKey]);

    return (
        <div data-testid="leaderboard-component" className="w-full">
            <div className="mb-6 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
                <Tabs value={gameType} onValueChange={setGameType}>
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
                    <Select value={club} onValueChange={setClub}>
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

                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger
                            data-testid="leaderboard-period-filter"
                            className="h-10 w-40 rounded-none border-white/15 bg-ps-surface font-heading text-xs uppercase tracking-[0.16em] text-white"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/15 bg-ps-surface text-white">
                            <SelectItem value="all" data-testid="period-option-all">
                                All time
                            </SelectItem>
                            <SelectItem value="weekly" data-testid="period-option-weekly">
                                Weekly challenge
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="border border-white/10 bg-ps-surface">
                <div className="grid grid-cols-12 border-b border-ps-red bg-ps-red/95 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white md:px-6">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Player</div>
                    <div className="col-span-4 hidden md:block">Club</div>
                    <div className="col-span-3 text-right md:col-span-3">
                        {gameType === "reaction" ? "Reaction" : "Score"}
                    </div>
                </div>

                {loading && (
                    <div
                        data-testid="leaderboard-loading"
                        className="flex items-center justify-center py-16 text-white/40"
                    >
                        <Loader2 className="animate-spin" size={20} />
                    </div>
                )}

                {!loading && rows.length === 0 && (
                    <div
                        data-testid="leaderboard-empty"
                        className="flex flex-col items-center justify-center gap-2 py-16 text-white/45"
                    >
                        <Trophy size={20} className="text-white/30" />
                        <p className="font-body text-sm">No scores yet — be the first.</p>
                    </div>
                )}

                {!loading &&
                    rows.map((r, idx) => {
                        const isMe =
                            highlightName &&
                            r.name &&
                            r.name.trim().toLowerCase() === highlightName.trim().toLowerCase();
                        return (
                            <div
                                key={r.id}
                                ref={isMe ? meRowRef : undefined}
                                data-testid={`leaderboard-row-${idx}`}
                                className={[
                                    "grid grid-cols-12 items-center border-b px-4 py-3 transition-colors md:px-6",
                                    isMe
                                        ? "border-ps-red/40 bg-ps-red/10 hover:bg-ps-red/15"
                                        : "border-white/5 hover:bg-white/[0.03]",
                                    !isMe && idx < 3 ? "bg-white/[0.015]" : "",
                                ].join(" ")}
                            >
                                <div
                                    className={[
                                        "col-span-1 font-mono text-base font-bold",
                                        rankBadge(idx),
                                    ].join(" ")}
                                >
                                    {String(idx + 1).padStart(2, "0")}
                                </div>
                                <div className="col-span-4">
                                    <div className="flex items-center gap-2 font-heading text-base font-semibold uppercase tracking-wide text-white">
                                        {r.name}
                                        {isMe && (
                                            <span
                                                data-testid={`leaderboard-row-${idx}-you`}
                                                className="border border-ps-red bg-ps-red px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white"
                                            >
                                                You
                                            </span>
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
                                        ? `${r.reactionTime?.toFixed?.(0) ?? "—"} ms`
                                        : `${r.score} pts`}
                                </div>
                            </div>
                        );
                    })}
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
