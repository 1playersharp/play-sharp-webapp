import Leaderboard from "@/components/Leaderboard";

export default function LeaderboardPage() {
    return (
        <div data-testid="leaderboard-page" className="border-b border-white/10">
            <div className="mx-auto max-w-7xl px-6 py-20">
                <p className="ps-label">Performance rankings</p>
                <h1 className="ps-section-title mt-3 text-5xl text-white md:text-6xl">
                    Global Leaderboard.
                </h1>
                <p className="mt-4 max-w-xl text-base text-white/60">
                    The fastest reactions and sharpest decisions across every
                    PlaySharp club. Filter by club or check the weekly
                    challenge.
                </p>

                <div className="mt-12">
                    <Leaderboard defaultGameType="reaction" />
                </div>
            </div>
        </div>
    );
}
