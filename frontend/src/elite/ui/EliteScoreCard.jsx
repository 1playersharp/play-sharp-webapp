import React from 'react';

export default function EliteScoreCard({ score, reactionTime, onBack }) {
  return (
    <div style={{ width: 520, background: '#061014', borderRadius: 8, padding: 22, border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'JetBrains Mono', monospace" }}>
      <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Session Complete</h3>
      <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.6)' }}>Your elite score</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#2ead3c' }}>{score}</div>
          {reactionTime != null && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Reaction: {reactionTime} ms</div>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBack} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer' }}>Back to Hub</button>
        </div>
      </div>
    </div>
  );
}

