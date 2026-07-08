import { useMemo, useState } from 'react';
import useObjectivesStore, {
    OBJECTIVE_CATEGORIES,
} from '@/state/useObjectivesStore';

export default function Objectives() {
    const objectives = useObjectivesStore((s) => s.objectives);
    const addObjective = useObjectivesStore((s) => s.addObjective);
    const incrementObjective = useObjectivesStore((s) => s.incrementObjective);
    const completeObjective = useObjectivesStore((s) => s.completeObjective);
    const removeObjective = useObjectivesStore((s) => s.removeObjective);

    const [tab, setTab] = useState('team');
    const [form, setForm] = useState({ title: '', target: 10, unit: '' });

    const currentCategory = OBJECTIVE_CATEGORIES.find((c) => c.value === tab);
    const items = useMemo(
        () =>
            objectives
                .filter((o) => o.category === tab)
                .sort((a, b) => a.createdAt - b.createdAt),
        [objectives, tab]
    );

    const canAdd =
        !currentCategory?.comingSoon &&
        form.title.trim() &&
        form.unit.trim() &&
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

            {currentCategory?.comingSoon ? (
                <div className="ps-card mt-8 p-8 text-center">
                    <p className="ps-label">Season Goals</p>
                    <p className="mt-2 text-white/60">
                        This section is coming soon.
                    </p>
                </div>
            ) : (
                <>
                    <div className="ps-card mt-6 p-4">
                        <p className="ps-label">Add objective</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-4">
                            <input
                                className="ps-input md:col-span-2"
                                placeholder="Objective title (e.g. Crosses into the box)"
                                value={form.title}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, title: e.target.value }))
                                }
                            />
                            <input
                                className="ps-input"
                                type="number"
                                min={1}
                                placeholder="Target"
                                value={form.target}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        target: Number(e.target.value),
                                    }))
                                }
                            />
                            <input
                                className="ps-input"
                                placeholder="Unit (reps, count, %, sec interval)"
                                value={form.unit}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, unit: e.target.value }))
                                }
                            />
                        </div>
                        <div className="mt-3">
                            <button
                                type="button"
                                data-testid="objective-add"
                                disabled={!canAdd}
                                className="ps-btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={submit}
                            >
                                Add objective
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
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
    );
}
