import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useObjectivesStore, {
    OBJECTIVE_CATEGORIES,
} from '@/state/useObjectivesStore';
import ConfidenceWidget from '@/confidence/ConfidenceWidget';
import MatchesSection from '@/confidence/MatchesSection';

export default function Objectives() {
    const objectives = useObjectivesStore((s) => s.objectives);
    const addObjective = useObjectivesStore((s) => s.addObjective);
    const incrementObjective = useObjectivesStore((s) => s.incrementObjective);
    const completeObjective = useObjectivesStore((s) => s.completeObjective);
    const removeObjective = useObjectivesStore((s) => s.removeObjective);

    const location = useLocation();
    const initialTab = useMemo(() => {
        const t = new URLSearchParams(location.search).get('tab');
        return OBJECTIVE_CATEGORIES.some((c) => c.value === t) ? t : 'team';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [tab, setTab] = useState(initialTab);

    // Update the active tab when the URL search param changes (e.g. the
    // player clicks the Confidence chip in the banner while already on
    // /objectives).
    useEffect(() => {
        const t = new URLSearchParams(location.search).get('tab');
        if (t && OBJECTIVE_CATEGORIES.some((c) => c.value === t) && t !== tab) {
            setTab(t);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);
    const [form, setForm] = useState({ title: '', target: 10, unit: '' });

    const currentCategory = OBJECTIVE_CATEGORIES.find((c) => c.value === tab);
    const items = useMemo(
        () =>
            objectives
                .filter((o) => o.category === tab)
                .sort((a, b) => a.createdAt - b.createdAt),
        [objectives, tab]
    );

    // Cap at 10 filled objectives per category. Blank auto-placeholders
    // (e.g. the ones created per Match) don't count so they never block a
    // real add.
    const filledInCategory = useMemo(
        () =>
            objectives.filter(
                (o) => o.category === tab && (o.title || '').trim().length > 0
            ).length,
        [objectives, tab]
    );
    const OBJECTIVE_CAP = 10;
    const atCap = filledInCategory >= OBJECTIVE_CAP;

    // Only title + a positive target are required. Unit is optional so the
    // Add button isn't silently gated by a field the player might reasonably
    // leave blank ("Talk more" doesn't have a unit).
    const canAdd =
        !currentCategory?.comingSoon &&
        !atCap &&
        !!form.title.trim() &&
        Number(form.target) > 0;

    const submit = () => {
        if (!canAdd) return;
        addObjective({
            category: tab,
            title: form.title,
            target: Number(form.target),
            unit: form.unit,
        });
        setForm({ title: '', target: 10, unit: '' });
    };

    return (
        <div data-testid="objectives-page" className="mx-auto max-w-7xl px-6 py-10">
            <p className="ps-label">Objectives</p>
            <h1 className="ps-section-title mt-2 text-4xl text-white md:text-5xl">
                Track what you're working on.
            </h1>
            <p
                data-testid="objectives-subtitle"
                className="mt-3 max-w-xl text-base font-medium text-white/75"
            >
                Set and track your training and match objectives.
            </p>

            <div className="mt-8 flex flex-wrap gap-1 border-b border-white/10">
                {OBJECTIVE_CATEGORIES.map((c) => (
                    <button
                        key={c.value}
                        type="button"
                        data-testid={`objectives-tab-${c.value}`}
                        className={[
                            'font-heading text-xs font-semibold uppercase tracking-[0.16em] px-3 py-2 -mb-px border-b-2 transition-colors',
                            tab === c.value
                                ? 'text-white border-ps-red'
                                : 'text-white/55 hover:text-white border-transparent',
                        ].join(' ')}
                        onClick={() => setTab(c.value)}
                    >
                        {c.label}
                        {c.comingSoon && (
                            <span className="ml-2 rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                                Coming soon
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className={tab === 'match' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                    {tab === 'match' && <MatchesSection />}

                    <div className={tab === 'match' ? 'mt-8' : ''}>
                    {currentCategory?.comingSoon ? (
                <div className="ps-card mt-2 p-8 text-center">
                    <p className="ps-label">Season Goals</p>
                    <p className="mt-2 text-white/60">
                        This section is coming soon.
                    </p>
                </div>
            ) : (
                <>
                    {tab !== 'match' && (
                    <div className="ps-card mt-2 p-4">
                        <div className="flex items-baseline justify-between">
                            <p className="ps-label">Add objective</p>
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                                {filledInCategory} / {OBJECTIVE_CAP}
                            </span>
                        </div>
                        <div className="mt-3 space-y-3">
                            <input
                                className="ps-input w-full"
                                placeholder="Objective title (e.g. Crosses into the box)"
                                value={form.title}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, title: e.target.value }))
                                }
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <input
                                    className="ps-input w-full"
                                    type="number"
                                    min={1}
                                    placeholder="Target (e.g. 10)"
                                    value={form.target}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            target: Number(e.target.value),
                                        }))
                                    }
                                />
                                <input
                                    className="ps-input w-full"
                                    placeholder="Unit — optional (reps, count, %, sec interval)"
                                    value={form.unit}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, unit: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                data-testid="objective-add"
                                disabled={!canAdd}
                                className="ps-btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={submit}
                            >
                                Add objective
                            </button>
                            {atCap && (
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                                    Cap reached · remove one to add another
                                </span>
                            )}
                        </div>
                    </div>
                    )}

                    <div className="mt-4 space-y-3">
                        {items.length === 0 ? (
                            <div className="ps-card p-6 text-center text-sm text-white/55">
                                No objectives yet in this category.
                            </div>
                        ) : (
                            items.map((o) => {
                                const pct = Math.min(
                                    100,
                                    Math.round((o.current / Math.max(1, o.target)) * 100)
                                );
                                return (
                                    <div
                                        key={o.id}
                                        data-testid={`objective-item-${o.id}`}
                                        className={`ps-card p-4 ${o.completed ? 'opacity-70' : ''}`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h3
                                                    className={`text-lg font-semibold text-white ${o.completed ? 'line-through' : ''}`}
                                                >
                                                    {o.title}
                                                </h3>
                                                <p className="text-xs text-white/55">
                                                    {o.current} / {o.target} {o.unit}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    data-testid={`objective-increment-${o.id}`}
                                                    className="ps-btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                                                    disabled={o.completed}
                                                    onClick={() => incrementObjective(o.id, 1)}
                                                >
                                                    +1
                                                </button>
                                                <button
                                                    type="button"
                                                    data-testid={`objective-complete-${o.id}`}
                                                    className={
                                                        o.completed
                                                            ? 'ps-btn-secondary text-xs'
                                                            : 'ps-btn-primary text-xs'
                                                    }
                                                    onClick={() => completeObjective(o.id)}
                                                >
                                                    {o.completed ? 'Reopen' : 'Complete'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-xs text-white/45 hover:text-ps-red"
                                                    onClick={() => removeObjective(o.id)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-1 bg-white/10">
                                            <div
                                                className="h-full bg-ps-turf"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
                    </div>
                </div>

                {tab === 'match' && (
                    <aside>
                        <ConfidenceWidget />
                    </aside>
                )}
            </div>
        </div>
    );
}
