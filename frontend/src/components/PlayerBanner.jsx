import { Link } from 'react-router-dom';
import useProfileStore, { FOOT_OPTIONS } from '@/state/useProfileStore';
import useDnaStore from '@/state/useDnaStore';
import { getArchetype } from '@/dna/data';
import { AvatarView } from '@/components/avatars/PresetAvatars';

const footLabel = (v) => {
    const match = FOOT_OPTIONS.find((f) => f.value === v);
    if (!match) return '';
    if (match.value === 'both') return 'Both feet';
    return `${match.label} footed`;
};

export default function PlayerBanner() {
    const profile = useProfileStore((s) => s.profile);
    const archetypeId = useDnaStore((s) => s.archetypeId);
    const archetype = archetypeId ? getArchetype(archetypeId) : null;
    const displayName = profile.name?.trim() || 'Your Profile';

    const subtitleBits = [
        profile.team?.trim(),
        profile.position || null,
        footLabel(profile.foot),
    ].filter(Boolean);

    return (
        <div
            data-testid="player-banner"
            className="sticky top-16 z-30 border-b border-white/10 bg-ps-bg/85 backdrop-blur supports-[backdrop-filter]:bg-ps-bg/65"
        >
            <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-6">
                <Link
                    to="/profile"
                    data-testid="player-banner-link"
                    className="flex items-center gap-4 min-w-0"
                >
                    <AvatarView
                        avatar={profile.avatar}
                        name={profile.name}
                        className="h-14 w-14 shrink-0"
                        data-testid="player-banner-avatar"
                    />
                    <span className="flex min-w-0 flex-col leading-tight">
                        <span
                            data-testid="player-banner-name"
                            className="truncate font-heading text-base font-semibold uppercase tracking-[0.16em] text-white md:text-lg"
                        >
                            {displayName}
                        </span>
                        {subtitleBits.length > 0 && (
                            <span
                                data-testid="player-banner-subtitle"
                                className="hidden truncate text-sm text-white/60 sm:block"
                            >
                                {subtitleBits.join(' · ')}
                            </span>
                        )}
                    </span>
                </Link>

                {archetype && (
                    <Link
                        to="/dna"
                        data-testid="player-banner-archetype"
                        title={`${archetype.name} — ${archetype.tagline}`}
                        className="inline-flex shrink-0 items-center gap-2 rounded-sm border px-3 py-1.5 transition hover:bg-white/[0.05]"
                        style={{
                            borderColor: `${archetype.accent}55`,
                            backgroundColor: `${archetype.accent}12`,
                        }}
                    >
                        <span className="text-lg leading-none">{archetype.icon}</span>
                        <span className="flex flex-col leading-tight">
                            <span
                                className="text-[9px] font-bold uppercase tracking-[0.22em]"
                                style={{ color: archetype.accent }}
                            >
                                DNA
                            </span>
                            <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-white sm:block">
                                {archetype.name}
                            </span>
                        </span>
                    </Link>
                )}
            </div>
        </div>
    );
}