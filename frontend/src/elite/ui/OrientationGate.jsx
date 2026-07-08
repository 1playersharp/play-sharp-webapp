import React, { useEffect, useState } from 'react';

/**
 * Full-screen "please rotate your device" gate. Only activates on touch
 * devices held in portrait — desktops and landscape phones fall straight
 * through to the child game. Wraps the Elite game routes so we don't
 * lock the marketing / hub pages.
 */
export default function OrientationGate({ children }) {
  const [locked, setLocked] = useState(() => shouldLock());

  useEffect(() => {
    const update = () => setLocked(shouldLock());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (!locked) return children;

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ ...icon }}>
          <span style={rotateGlyph}>⟳</span>
        </div>
        <div style={title}>Rotate your device</div>
        <div style={sub}>
          The Elite training games are designed for landscape play.
          Turn your phone sideways to continue.
        </div>
      </div>
      <style>{`
        @keyframes ps-rotate-nudge {
          0%   { transform: rotate(-15deg); }
          50%  { transform: rotate( 15deg); }
          100% { transform: rotate(-15deg); }
        }
      `}</style>
    </div>
  );
}

function shouldLock() {
  if (typeof window === 'undefined') return false;
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const isPortrait = window.innerHeight > window.innerWidth;
  return isTouch && isPortrait;
}

const overlay = {
  position: 'fixed', inset: 0, background: '#041018', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100, padding: 24, fontFamily: "'JetBrains Mono', monospace",
};
const card = { maxWidth: 320, textAlign: 'center' };
const icon = {
  fontSize: 64, marginBottom: 22, color: '#facc15',
  animation: 'ps-rotate-nudge 1.8s ease-in-out infinite',
  display: 'inline-block',
};
const rotateGlyph = { display: 'inline-block' };
const title = { fontSize: 20, fontWeight: 900, marginBottom: 10, letterSpacing: 1 };
const sub = { fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' };
