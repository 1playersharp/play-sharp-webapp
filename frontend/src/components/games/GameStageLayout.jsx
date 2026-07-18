import { useEffect, useState } from 'react';

/**
 * useMobileLandscape — true on any viewport that is BOTH in landscape
 * orientation AND under ~1024px wide (mobile / small tablet). Desktop
 * users in landscape stay in the stacked layout because there's usually
 * enough vertical room; only tight rotated phones need the side panel.
 */
export function useMobileLandscape(maxWidth = 1024) {
    const [isLandscape, setIsLandscape] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(`(orientation: landscape) and (max-width: ${maxWidth}px)`).matches;
    });
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const mq = window.matchMedia(`(orientation: landscape) and (max-width: ${maxWidth}px)`);
        const update = () => setIsLandscape(mq.matches);
        update();
        if (mq.addEventListener) {
            mq.addEventListener('change', update);
            return () => mq.removeEventListener('change', update);
        }
        // Safari < 14 fallback
        mq.addListener(update);
        return () => mq.removeListener(update);
    }, [maxWidth]);
    return isLandscape;
}

/**
 * GameStageLayout — mobile-safe wrapper for training games.
 *
 * Rule enforced: while a game is in a live/in-motion phase, no
 * instructional element may cover the play area.
 *
 * Portrait / desktop: stacked column (panel above OR below canvas).
 * Mobile landscape (≤ 1024px wide, landscape orientation): flex row —
 * canvas grows, panel is a fixed-width sidebar next to it.
 *
 * Props:
 *   canvas    — the play area (canvas element wrapped in a `position: relative`
 *               container so spatial badges positioned by % still work).
 *   panel     — instructional/status content shown alongside the canvas. Pass
 *               `null` for phases where no panel is needed (intro/feedback that
 *               renders its own centred overlay outside the layout).
 *   panelSide — 'above' | 'below' — where the panel docks in portrait. Games
 *               with a title-first pattern typically use 'above'; games with
 *               a status ticker use 'below'.
 *   panelWidth — width of the sidebar in mobile-landscape (default 220px).
 *   className / style — passthrough on the root wrapper.
 *
 * Anything the caller wants layered ON TOP of the canvas at pitch coordinates
 * (spatial answer badges, player-name tags, target pins) MUST live inside the
 * `canvas` prop's container, not next to it — the canvas wrapper is the
 * positioning context those absolutes rely on.
 */
export default function GameStageLayout({
    canvas,
    panel = null,
    panelSide = 'above',
    panelWidth = 220,
    className,
    style,
}) {
    const landscape = useMobileLandscape();

    if (landscape) {
        return (
            <div
                data-testid="game-stage-layout"
                data-orientation="landscape"
                className={className}
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    gap: 10,
                    width: '100%',
                    ...style,
                }}
            >
                <div style={{ flex: '1 1 auto', minWidth: 0, position: 'relative' }}>{canvas}</div>
                {panel && (
                    <aside
                        data-testid="game-stage-panel"
                        style={{
                            flex: `0 0 ${panelWidth}px`,
                            maxWidth: panelWidth,
                            maxHeight: '100%',
                            overflowY: 'auto',
                        }}
                    >
                        {panel}
                    </aside>
                )}
            </div>
        );
    }

    return (
        <div
            data-testid="game-stage-layout"
            data-orientation="portrait"
            className={className}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                width: '100%',
                ...style,
            }}
        >
            {panel && panelSide === 'above' && (
                <div data-testid="game-stage-panel">{panel}</div>
            )}
            <div style={{ position: 'relative' }}>{canvas}</div>
            {panel && panelSide === 'below' && (
                <div data-testid="game-stage-panel">{panel}</div>
            )}
        </div>
    );
}
