export interface DeviceProfile {
  isSmartTV: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  prefersReducedMotion: boolean;
  isLowPerf: boolean;
}

interface NavigatorLike {
  userAgent: string;
  userAgentData?: { mobile?: boolean; platform?: string };
  standalone?: boolean;
  tizen?: unknown;
  webos?: unknown;
  cast?: unknown;
}

/** Parse a `?key=value` from the URL (for manual QA overrides). */
function urlOverride(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get(key);
  return v === '' ? '1' : v;
}

/**
 * Detect the playback device so we can tune the experience:
 *  - Smart TVs (Tizen / webOS / Android TV / Fire TV / HbbTV) get a 60fps
 *    "solid matte" mode (no backdrop-filter) + D-pad spatial navigation.
 *  - Low-power / reduced-motion devices get trimmed animations.
 */
export function detectDevice(): DeviceProfile {
  if (typeof navigator === 'undefined') {
    return {
      isSmartTV: false,
      isMobile: false,
      isDesktop: true,
      isTouch: false,
      prefersReducedMotion: false,
      isLowPerf: false,
    };
  }

  const nav = navigator as NavigatorLike;
  const ua = (nav.userAgent || '').toLowerCase();

  const tvHints = [
    'tv',
    'tizen',
    'webos',
    'netcast',
    'aftt', // Fire TV Stick
    'aftm',
    'bravia',
    'android tv',
    'googletv',
    'hbbtv',
    'viera',
    'smarttv',
    'crkey', // Chromecast
  ];
  const hasTVApi = Boolean(nav.tizen || nav.webos);
  const tvOverride = urlOverride('tv');
  const isSmartTV =
    tvOverride !== null
      ? tvOverride !== '0'
      : hasTVApi || tvHints.some((h) => ua.includes(h));

  const mobileHints = ['mobi', 'android', 'iphone', 'ipad', 'ipod', 'windows phone'];
  const isMobile = nav.userAgentData?.mobile ?? mobileHints.some((h) => ua.includes(h));

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Heuristic low-power: weak CPU cores, very small memory, or reduced motion.
  let isLowPerf = prefersReducedMotion;
  const cores =
    (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 0;
  const mem =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0;
  if (cores && cores <= 4) isLowPerf = true;
  if (mem && mem <= 2) isLowPerf = true;
  const motionOverride = urlOverride('motion');
  if (motionOverride !== null) isLowPerf = motionOverride === '0';

  return {
    isSmartTV,
    isMobile,
    isDesktop: !isSmartTV && !isMobile,
    isTouch:
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0),
    prefersReducedMotion,
    isLowPerf,
  };
}

/** Convenience memoised flag (re-evaluated each call; cheap). */
export function isSmartTV(): boolean {
  return detectDevice().isSmartTV;
}
