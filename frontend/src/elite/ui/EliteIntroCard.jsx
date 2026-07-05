import React, { useEffect, useRef, useState } from 'react';

/**
 * Pre-game brief shown at the start of every Elite session. Matches the
 * dark, mono-font styling of EliteScoreCard / feedback cards, with a
 * per-game accent colour on the top border and Start button.
 *
 * Auto-dismisses at ~8 s so repeat players aren't blocked; users can hit
 * Enter/Space or the Start button to skip immediately.
 */
const DEFAULT_AUTO_DISMISS_MS = 8000;

export default function EliteIntroCard({
  title,
  objective,
  controls = [],
  accent = '#2ead3c',
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
  onStart,
}) {
  const [remaining, setRemaining] = useState(Math.ceil(autoDismissMs / 1000));
  const firedRef = useRef(false);

  const fireStart = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onStart && onStart();
  };

  useEffect(() => {
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const r = Math.max(0, Math.ceil((autoDismissMs - elapsed) / 1000));
      setRemaining(r);
      if (elapsed >= autoDismissMs) fireStart();
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDismissMs]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fireStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={overlay}>
      <style>{`
        @keyframes ps-intro-in {
          0%   { transform: translateY(20px) scale(0.94); opacity: 0; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
      `}</style>
      <div style={{ ...card, borderTop: `4px solid ${accent}` }}>
        <div style={eyebrow}>ELITE BRIEF</div>
        <div style={titleStyle}>{title}</div>
        <div style={objectiveStyle}>{objective}</div>

        {controls.length > 0 && (
          <>
            <div style={sectionHeader}>Controls</div>
            <div style={{ marginBottom: 22 }}>
              {controls.map((c, i) => (
                <div key={i} style={controlRow}>
                  <span
                    style={{
                      ...controlKey,
                      background: hexAlpha(accent, 0.16),
                      color: accent,
                      borderColor: hexAlpha(accent, 0.7),
                    }}
                  >
                    {c.keys}
                  </span>
                  <span style={controlAction}>{c.action}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={buttonRow}>
          <button
            onClick={fireStart}
            style={{ ...startBtn, background: accent }}
          >
            Start ▶
          </button>
          <div style={autoDismiss}>
            Auto-starts in <strong>{remaining}s</strong> · press <strong>Space</strong> to begin
          </div>
        </div>
      </div>
    </div>
  );
}

// Turn "#2ead3c" or "0x2ead3c" into an rgba() string with the given alpha.
function hexAlpha(hex, a) {
  let raw = String(hex).trim();
  if (raw.startsWith('#')) raw = raw.slice(1);
  if (raw.startsWith('0x')) raw = raw.slice(2);
  if (raw.length === 3) raw = raw.split('').map((c) => c + c).join('');
  const num = parseInt(raw, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const overlay = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', zIndex: 40, padding: 24,
};
const card = {
  maxWidth: 500, width: '100%',
  background: '#080e0a',
  padding: '24px 28px',
  border: '1px solid rgba(255,255,255,0.08)',
  fontFamily: "'JetBrains Mono', monospace",
  color: '#fff',
  animation: 'ps-intro-in 0.38s ease-out',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};
const eyebrow = {
  fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase', marginBottom: 8,
};
const titleStyle = { fontSize: 24, fontWeight: 900, letterSpacing: 1.2, marginBottom: 12 };
const objectiveStyle = {
  fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, marginBottom: 22,
};
const sectionHeader = {
  fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.55)',
  textTransform: 'uppercase', marginBottom: 10,
};
const controlRow = {
  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
};
const controlKey = {
  padding: '5px 12px', border: '1px solid', borderRadius: 4,
  minWidth: 82, textAlign: 'center',
  fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
};
const controlAction = { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 };
const buttonRow = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
  flexWrap: 'wrap',
};
const startBtn = {
  padding: '11px 24px', border: 'none', borderRadius: 4, cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase',
  color: '#0a0a0a',
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
};
const autoDismiss = {
  fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1,
};
