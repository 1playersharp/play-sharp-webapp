import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import useProfileStore, {
    POSITIONS,
    FOOT_OPTIONS,
    isProfileComplete,
    missingProfileFields,
} from '@/state/useProfileStore';
import { useFootballIQ } from '@/state/iq';
import {
    PRESET_AVATARS,
    PresetTile,
    AvatarView,
} from '@/components/avatars/PresetAvatars';

const shallowEqualProfile = (a, b) =>
    a.name === b.name &&
    a.position === b.position &&
    a.avatar === b.avatar &&
    a.team === b.team &&
    a.foot === b.foot;

export default function Profile() {
    const profile = useProfileStore((s) => s.profile);
    const setProfile = useProfileStore((s) => s.setProfile);
    const resetProfile = useProfileStore((s) => s.resetProfile);
    const { foundationIQ, eliteIQ, overallIQ } = useFootballIQ();
    const location = useLocation();

    const [draft, setDraft] = useState(profile);
    const fileInputRef = useRef(null);

    const complete = isProfileComplete(profile);
    const missing = missingProfileFields(profile);
    const bouncedFrom = location.state?.locked ? location.state?.from : null;

    // Sync draft when the underlying profile is reset externally (e.g. via
    // "Reset profile"). Only overwrite the local draft when the store and
    // draft have converged, so we don't blow away unsaved edits every render.
    const dirty = !shallowEqualProfile(draft, profile);
    useEffect(() => {
        if (!dirty) setDraft(profile);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    const update = (patch) => setDraft((d) => ({ ...d, ...patch }));

    const onAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => update({ avatar: ev.target?.result || null });
        reader.readAsDataURL(file);
    };

    const commit = () => {
        setProfile(draft);
        toast.success('Profile updated');
    };

    const discard = () => setDraft(profile);

    const reset = () => {
        resetProfile();
        toast.message('Profile reset');
    };

    const presetTiles = useMemo(() => PRESET_AVATARS, []);

    return (
        <div data-testid="profile-page" className="mx-auto max-w-7xl px-6 py-10">
            <p className="ps-label">Player Profile</p>
            <h1 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                Your PlaySharp Identity
            </h1>
            <p
                data-testid="profile-subtitle"
                className="mt-3 max-w-xl text-base font-medium text-white/75"
            >
                Set up your player identity to unlock the rest of the hub.
            </p>

            {!complete && (
                <div
                    data-testid="profile-lock-callout"
                    className="ps-card mt-6 border-ps-red/50 p-4"
                >
                    <p className="ps-label text-ps-red">
                        {bouncedFrom
                            ? `Finish your profile to unlock ${bouncedFrom}`
                            : 'Complete your profile to unlock the rest'}
                    </p>
                    <p className="mt-1 text-sm text-white/70">
                        Save your name, position, team and preferred foot to
                        access Schedule, Objectives, Training Games, Video Upload
                        and Leaderboard.
                    </p>
                    {missing.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {missing.map((m) => (
                                <li
                                    key={m}
                                    className="rounded-sm bg-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-white/70"
                                >
                                    Missing: {m}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="mt-8 grid gap-6 md:grid-cols-3">
                <div
                    data-testid="profile-edit"
                    className="ps-card p-6 md:col-span-2"
                >
                    <div className="flex items-baseline justify-between">
                        <p className="ps-label">Edit Profile</p>
                        {dirty && (
                            <span
                                data-testid="profile-dirty-indicator"
                                className="text-[10px] font-bold uppercase tracking-[0.24em] text-ps-red"
                            >
                                Unsaved changes
                            </span>
                        )}
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                        <AvatarView
                            avatar={draft.avatar}
                            name={draft.name}
                            className="h-16 w-16"
                            data-testid="profile-avatar"
                        />
                        <div className="flex flex-col items-start gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={onAvatarChange}
                                className="hidden"
                                data-testid="profile-avatar-input"
                            />
                            <button
                                type="button"
                                className="ps-btn-secondary text-xs"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Upload avatar
                            </button>
                            {draft.avatar && (
                                <button
                                    type="button"
                                    className="text-xs text-white/55 hover:text-white"
                                    onClick={() => update({ avatar: null })}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <p className="ps-label">Choose a preset</p>
                        <div
                            data-testid="profile-avatar-presets"
                            className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8"
                        >
                            {presetTiles.map((p) => {
                                const selected = draft.avatar === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        data-testid={`profile-avatar-preset-${p.id.replace('preset:', '')}`}
                                        onClick={() => update({ avatar: p.id })}
                                        aria-label={p.label}
                                        className={[
                                            'block h-14 w-14 overflow-hidden rounded-full border transition',
                                            selected
                                                ? 'border-ps-red ring-2 ring-ps-red/40'
                                                : 'border-white/10 hover:border-white/30',
                                        ].join(' ')}
                                    >
                                        <PresetTile preset={p} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <label className="block">
                            <span className="ps-label">Name</span>
                            <input
                                data-testid="profile-name"
                                className="ps-input mt-2"
                                value={draft.name}
                                onChange={(e) => update({ name: e.target.value })}
                                placeholder="Enter your name"
                            />
                        </label>
                        <label className="block">
                            <span className="ps-label">Position</span>
                            <select
                                data-testid="profile-position"
                                className="ps-input mt-2"
                                value={draft.position}
                                onChange={(e) => update({ position: e.target.value })}
                            >
                                <option value="">Select position</option>
                                {POSITIONS.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="ps-label">Team</span>
                            <input
                                data-testid="profile-team"
                                className="ps-input mt-2"
                                value={draft.team}
                                onChange={(e) => update({ team: e.target.value })}
                                placeholder="Enter your team / club"
                            />
                        </label>
                        <label className="block">
                            <span className="ps-label">Preferred foot</span>
                            <select
                                data-testid="profile-foot"
                                className="ps-input mt-2"
                                value={draft.foot}
                                onChange={(e) => update({ foot: e.target.value })}
                            >
                                <option value="">Select preferred foot</option>
                                {FOOT_OPTIONS.map((f) => (
                                    <option key={f.value} value={f.value}>
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            data-testid="profile-update"
                            disabled={!dirty}
                            className="ps-btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={commit}
                        >
                            Update Profile
                        </button>
                        <button
                            type="button"
                            data-testid="profile-discard"
                            disabled={!dirty}
                            className="text-xs text-white/55 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={discard}
                        >
                            Discard changes
                        </button>
                        <button
                            type="button"
                            data-testid="profile-reset"
                            className="ml-auto text-xs text-white/45 hover:text-ps-red"
                            onClick={reset}
                        >
                            Reset profile
                        </button>
                    </div>
                </div>

                <div
                    data-testid="profile-football-iq"
                    className="ps-card p-6"
                >
                    <p className="ps-label">Football IQ</p>
                    <div className="mt-2 text-5xl font-bold text-ps-turf">
                        {overallIQ || '—'}
                    </div>
                    <p className="mt-2 text-xs text-white/60">
                        Foundation IQ: {foundationIQ} · Elite IQ: {eliteIQ}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                        Foundation contributes 70% and Elite contributes 30%.
                    </p>
                </div>
            </div>
        </div>
    );
}