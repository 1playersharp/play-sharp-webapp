import { useState } from 'react';

const CONTROLLABLES = [
    'Scan before I receive',
    'First touch forward',
    'Talk to my teammates',
];

/**
 * Reframing card — three behavioural beats. Never fires for 3–5 ratings.
 * Never asks the player why they feel bad; the football-specific "Why?"
 * on the check-in captures that already. This card is a coaching moment,
 * not a form.
 */
export default function ReframeCard({ onDone }) {
    const [wentWell, setWentWell] = useState('');
    const [nextTime, setNextTime] = useState('');
    const [pickedControllable, setPickedControllable] = useState(false);

    return (
        <div data-testid="confidence-reframe">
            <p className="ps-label">A quick reframe</p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-white">
                Separate the result from the performance
            </h2>
            <p className="mt-2 text-sm text-white/70">
                The score isn't the same thing as your game. What actually
                happened out there?
            </p>

            <div className="mt-6">
                <p className="ps-label">One thing that went well</p>
                <input
                    className="ps-input mt-2"
                    value={wentWell}
                    onChange={(e) => setWentWell(e.target.value)}
                    maxLength={90}
                    placeholder="e.g. I kept trying"
                />
                <p className="mt-1 text-[10px] text-white/40">
                    Anything counts. Even "I kept going."
                </p>
            </div>

            <div className="mt-5">
                <p className="ps-label">One controllable for next time</p>
                <input
                    className="ps-input mt-2"
                    value={nextTime}
                    onChange={(e) => {
                        setNextTime(e.target.value);
                        setPickedControllable(true);
                    }}
                    maxLength={90}
                    placeholder="Something you can control"
                />
                {!nextTime && !pickedControllable && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {CONTROLLABLES.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => {
                                    setNextTime(c);
                                    setPickedControllable(true);
                                }}
                                className="rounded-sm border border-white/15 bg-white/[0.03] px-2.5 py-1 text-xs text-white/80 transition hover:border-white/40"
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <p className="mt-6 border-t border-white/5 pt-4 text-sm text-white/70">
                One bad session isn't a pattern. Go again.
            </p>

            <div className="mt-5 flex justify-end">
                <button
                    type="button"
                    data-testid="confidence-reframe-done"
                    onClick={onDone}
                    className="ps-btn-primary text-xs"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
