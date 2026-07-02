import React from 'react';
import LegacyDecision from '../../../games/DecisionGame.jsx';
import '../../../App.css';

// Foundation wrapper: keeps original game logic but adds UI polish and responsiveness
export default function DecisionGameFoundation(props) {
  return (
    <div className="foundation-game-shell p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg shadow-md">
      <div className="foundation-header mb-4">
        <h2 className="text-xl font-semibold">Decision Game — Foundation</h2>
        <p className="text-sm text-gray-600">Polished UI, smoother animations, coaching hints</p>
      </div>
      <div className="foundation-game-content">
        {/* Render the legacy canvas-based game */}
        <LegacyDecision {...props} />
      </div>
    </div>
  );
}

