import { NavLink, Outlet } from 'react-router-dom';
import { Lock } from 'lucide-react';
import PlayerBanner from '@/components/PlayerBanner';
import useProfileStore, { isProfileComplete } from '@/state/useProfileStore';

const APP_LINKS = [
    { to: '/profile',      label: 'Profile',        testId: 'nav-profile' },
    { to: '/dna',          label: 'PlaySharp DNA',  testId: 'nav-dna',          gated: true },
    { to: '/schedule',     label: 'Schedule',       testId: 'nav-schedule',     gated: true },
    { to: '/objectives',   label: 'Objectives',     testId: 'nav-objectives',   gated: true },
    { to: '/iq-training',  label: 'Training Games', testId: 'nav-iq-training',  gated: true },
    { to: '/tactics-quiz', label: 'Tactics Quiz',   testId: 'nav-tactics-quiz', gated: true },
    { to: '/video-upload', label: 'Video Analysis', testId: 'nav-video-upload', gated: true },
    { to: '/leaderboard',  label: 'Leaderboard',    testId: 'nav-leaderboard',  gated: true },
];

const BASE = 'inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-4 py-2.5 font-heading text-sm font-semibold uppercase tracking-[0.14em] border-b-2 transition-colors';

export default function AppLayout() {
    const complete = useProfileStore((s) => isProfileComplete(s.profile));

    return (
        <div data-testid="app-layout">
            <PlayerBanner />
            <nav
                data-testid="app-nav"
                className="sticky top-[7.5rem] z-20 border-b border-white/10 bg-ps-bg/85 backdrop-blur supports-[backdrop-filter]:bg-ps-bg/65"
            >
                <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2">
                    {APP_LINKS.map((l) => {
                        const locked = l.gated && !complete;
                        if (locked) {
                            return (
                                <span
                                    key={l.to}
                                    data-testid={l.testId}
                                    data-locked="true"
                                    aria-disabled="true"
                                    title="Finish your profile to unlock"
                                    className={`${BASE} cursor-not-allowed border-transparent text-white/30`}
                                >
                                    <Lock size={13} strokeWidth={2.4} />
                                    {l.label}
                                </span>
                            );
                        }
                        return (
                            <NavLink
                                key={l.to}
                                to={l.to}
                                data-testid={l.testId}
                                className={({ isActive }) =>
                                    [
                                        BASE,
                                        isActive
                                            ? 'border-ps-red bg-white/[0.06] text-white'
                                            : 'border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white',
                                    ].join(' ')
                                }
                            >
                                {l.label}
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
            <Outlet />
        </div>
    );
}
