import React from 'react';
import Legacy from '../../../games/ScanningGame.jsx';

export default function ScanningGameFoundation(props) {
  return (
    <div className="foundation-game-shell p-3 bg-white rounded-lg shadow-sm">
      <div className="foundation-header mb-2">
        <h2 className="text-lg font-medium">Scanning — Foundation</h2>
      </div>
      <Legacy {...props} />
    </div>
  );
}

