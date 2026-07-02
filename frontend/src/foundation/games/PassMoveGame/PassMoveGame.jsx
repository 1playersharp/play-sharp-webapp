import React from 'react';
import LegacyPassMove from '../../../games/PassMoveGame.jsx';

export default function PassMoveGameFoundation(props) {
  return (
    <div className="foundation-game-shell p-4 bg-white rounded-lg shadow-sm">
      <div className="foundation-header mb-3">
        <h2 className="text-lg font-medium">Pass & Move — Foundation</h2>
        <p className="text-xs text-gray-500">Simplified visuals, clearer coaching overlays</p>
      </div>
      <LegacyPassMove {...props} />
    </div>
  );
}

