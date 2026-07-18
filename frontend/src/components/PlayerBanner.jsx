import { Link } from 'react-router-dom';
import useProfileStore, { FOOT_OPTIONS } from '@/state/useProfileStore';
import useDnaStore from '@/state/useDnaStore';
import useTacticsQuizStore from '@/state/useTacticsQuizStore';
import { useFootballIQ } from '@/state/iq';
import useConfidenceStore, {
    rollingAverage,
} from '@/state/useConfidenceStore';
import { labelForRating, RATING_META } from '@/confidence/data';
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
    const { overallIQ } = useFootballIQ();
    const tacticsIQ = useTacticsQuizStore((s) => s.latestAttempt?.scorePercent ?? null);
    const confidenceCheckIns = useConfidenceStore((s) => s.checkIns);
    const confidenceAvg = rollingAverage(confidenceCheckIns, 5);
    const confidenceLabel = confidenceAvg != null ? labelForRating(confidenceAvg) : '—';
    const confidenceTone =
        confidenceAvg != null
            ? RATING_META[Math.max(1, Math.min(5, Math.round(confidenceAvg)))].tone
            : '#8b8f96';
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
            <div className="mx-auto flex h-20 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
                <Link
                    to="/profile"
                    data-testid="player-banner-link"
                    className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none sm:gap-4"
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

                {/* On ≤sm, chips collapse to icon-only pills so the banner fits
                    a 390px viewport without horizontal overflow. From sm+ they
                    expand to icon + label as before. */}
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                    {archetype && (
                        <Link
                            to="/dna"
                            data-testid="player-banner-archetype"
                            title={`${archetype.name} — ${archetype.tagline}`}
                            className="inline-flex shrink-0 items-center gap-2 rounded-sm border px-2 py-1.5 transition hover:bg-white/[0.05] sm:px-3"
                            style={{
                                borderColor: `${archetype.accent}55`,
                                backgroundColor: `${archetype.accent}12`,
                            }}
                        >
                            <span className="text-lg leading-none">{archetype.icon}</span>
                            <span className="hidden flex-col leading-tight sm:flex">
                                <span
                                    className="text-[9px] font-bold uppercase tracking-[0.22em]"
                                    style={{ color: archetype.accent }}
                                >
                                    DNA
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
                                    {archetype.name}
                                </span>
                            </span>
                        </Link>
                    )}

                    {tacticsIQ != null && (
                        <Link
                            to="/tactics-quiz"
                            data-testid="player-banner-tactics-iq"
                            title={`Position IQ — from your last Tactics Quiz attempt (${tacticsIQ})`}
                            className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-ps-red/40 bg-ps-red/10 px-2 py-1.5 transition hover:bg-ps-red/20 sm:px-3"
                        >
                            <span className="hidden flex-col leading-tight sm:flex">
                                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-ps-red">
                                    IQ
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
                                    {tacticsIQ}
                                </span>
                            </span>
                            <span className="text-base font-bold text-ps-red sm:hidden" aria-label={`Position IQ ${tacticsIQ}`}>
                                {tacticsIQ}
                            </span>
                        </Link>
                    )}

                    <Link
                        to="/profile"
                        data-testid="player-banner-iq"
                        title="PlaySharp IQ — Foundation 70% + Elite 30%"
                        className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-ps-turf/40 bg-ps-turf/10 px-2 py-1.5 transition hover:bg-ps-turf/20 sm:px-3"
                    >
                        <span className="hidden flex-col leading-tight sm:flex">
                            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-ps-turf">
                                PlaySharp IQ
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
                                {overallIQ || '—'}
                            </span>
                        </span>
                        <span className="text-base font-bold text-ps-turf sm:hidden" aria-label="PlaySharp IQ">
                            {overallIQ || '—'}
                        </span>
                    </Link>

                    <Link
                        to="/objectives?tab=match"
                        data-testid="player-banner-confidence"
                        title={`Confidence — ${confidenceLabel}${confidenceAvg != null ? ` (avg ${confidenceAvg.toFixed(1)})` : ''}`}
                        className="inline-flex shrink-0 items-center gap-2 rounded-sm border px-2 py-1.5 transition hover:bg-white/[0.05] sm:px-3"
                        style={{
                            borderColor: `${confidenceTone}55`,
                            backgroundColor: `${confidenceTone}12`,
                        }}
                    >
                        <span className="hidden flex-col leading-tight sm:flex">
                            <span
                                className="text-[9px] font-bold uppercase tracking-[0.22em]"
                                style={{ color: confidenceTone }}
                            >
                                Confidence
                            </span>
                            <span className="flex items-baseline gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                                {confidenceLabel}
                                {confidenceAvg != null && (
                                    <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-white/45">
                                        avg {confidenceAvg.toFixed(1)}
                                    </span>
                                )}
                            </span>
                        </span>
                        <span
                            className="grid h-6 min-w-6 place-items-center rounded-sm px-1 text-xs font-bold sm:hidden"
                            style={{ color: confidenceTone }}
                            aria-label={`Confidence: ${confidenceLabel}`}
                        >
                            {confidenceAvg != null ? Math.round(confidenceAvg) : '—'}
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
}