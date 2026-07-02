import React from 'react';
import Legacy from '../../../games/PressingGame.jsx';

export default function PressingGameFoundation(props) {
  return (
    <div className="foundation-game-shell p-3 bg-white rounded-lg shadow-sm">
      <div className="foundation-header mb-2">
        <h2 className="text-lg font-medium">Pressing — Foundation</h2>
      </div>
      <Legacy {...props} />
    </div>
  );
}

