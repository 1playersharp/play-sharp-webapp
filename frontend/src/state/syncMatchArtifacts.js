import useConfidenceStore from './useConfidenceStore';
import useObjectivesStore from './useObjectivesStore';

/**
 * Called after a Match activity is added to the schedule. Idempotent so
 * repeatedly editing a match never spawns duplicate confidence records or
 * placeholder objectives.
 */
export function onMatchCreated({ activityId, dateISO, title }) {
    useConfidenceStore.getState().createForMatch({
        matchId: activityId,
        dateISO,
    });
    useObjectivesStore.getState().createForMatch({
        matchId: activityId,
        dateISO,
        title: '', // blank placeholder — player fills it in
        category: 'match',
        target: null,
        unit: '',
    });
}

/**
 * Called when a Match activity is deleted or its type changed away from
 * Match. Only bin records the player never touched — never silently delete
 * their work.
 */
export function onMatchRemoved(activityId) {
    const conf = useConfidenceStore.getState();
    const objs = useObjectivesStore.getState();

    const c = conf.checkIns.find((x) => x.matchId === activityId);
    if (c && c.rating == null && !c.reason) {
        conf.removeForMatch(activityId);
    }

    objs.objectives
        .filter((o) => o.matchId === activityId && !o.title && o.current === 0)
        .forEach((o) => objs.removeObjective(o.id));
}

/** Called when a Match activity's date changes. */
export function onMatchMoved(activityId, dateISO) {
    useConfidenceStore.getState().updateDate?.(activityId, dateISO);
    useObjectivesStore.getState().updateDate?.(activityId, dateISO);
}
