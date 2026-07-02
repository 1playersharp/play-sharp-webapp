import React from 'react';

export default function EliteGameShell({ title, subtitle, children, onBack }) {
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#041018' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>← Back to Hub</button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>{subtitle || ''}</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

