import Leaderboard from "@/components/Leaderboard";

export default function LeaderboardPage() {
    return (
        <div data-testid="leaderboard-page" className="border-b border-white/10">
            <div className="mx-auto max-w-7xl px-6 py-20">
                <p className="ps-label">Performance rankings</p>
                <h1 className="ps-section-title mt-3 text-5xl text-white md:text-6xl">
                    Global Leaderboard.
                </h1>
                <p
                    data-testid="leaderboard-subtitle"
                    className="mt-3 max-w-xl text-base font-medium text-white/75"
                >
                    See how you rank against other players.
                </p>

                <div className="mt-12">
                    <Leaderboard defaultGameType="reaction" />
                </div>
            </div>
        </div>
    );
}
