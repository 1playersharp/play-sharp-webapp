import { useEffect, useState } from 'react';

/**
 * Returns true on devices with a coarse pointer (phone / tablet). Elite
 * games use this to swap keyboard-only inputs (WASD / SPACE) for on-screen
 * tap controls without affecting desktop.
 */
export default function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(() => detect());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(pointer: coarse)');
    const onChange = () => setIsTouch(mql.matches);
    // addEventListener isn't supported on older Safari MediaQueryList — fall back.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else if (mql.removeListener) mql.removeListener(onChange);
    };
  }, []);

  return isTouch;
}

function detect() {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}
