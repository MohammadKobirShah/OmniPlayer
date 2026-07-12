import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';

/**
 * Detect Smart TV / Android TV / Fire TV / Tizen / webOS platforms.
 * Sets tvMode = true in store when detected.
 */

interface TVPlatformInfo {
  isTv: boolean;
  platform: 'tizen' | 'webos' | 'androidtv' | 'firetv' | 'chromecast' | 'roku' | 'xbox' | 'playstation' | 'generic-tv' | 'desktop';
}

export function detectTVPlatform(): TVPlatformInfo {
  const ua = navigator.userAgent.toLowerCase();
  const w = window as any;

  // Samsung Tizen
  if (ua.includes('tizen') || ua.includes('samsung') || w.tizen) {
    return { isTv: true, platform: 'tizen' };
  }

  // LG webOS
  if (ua.includes('webos') || ua.includes('web0s') || ua.includes('lgwebos') || w.webOS || w.PalmSystem) {
    return { isTv: true, platform: 'webos' };
  }

  // Amazon Fire TV
  if (ua.includes('silk') && ua.includes('fire') || ua.includes('aftb') || ua.includes('aftm') || ua.includes('afts') || ua.includes('aftt') || ua.includes('aftss')) {
    return { isTv: true, platform: 'firetv' };
  }

  // Android TV (must check before generic Android)
  if ((ua.includes('android') && ua.includes('tv')) || ua.includes('android tv') || ua.includes('atv') || w.AndroidTV) {
    return { isTv: true, platform: 'androidtv' };
  }

  // Generic Android with large screen & no touch (likely Android TV box)
  if (ua.includes('android') && !('ontouchstart' in window) && screen.width >= 960) {
    return { isTv: true, platform: 'androidtv' };
  }

  // Chromecast
  if (ua.includes('crkey') || ua.includes('chromecast')) {
    return { isTv: true, platform: 'chromecast' };
  }

  // Xbox
  if (ua.includes('xbox') || ua.includes('xboxone') || w.Windows?.Xbox) {
    return { isTv: true, platform: 'xbox' };
  }

  // PlayStation
  if (ua.includes('playstation') || ua.includes('ps4') || ua.includes('ps5')) {
    return { isTv: true, platform: 'playstation' };
  }

  // Roku
  if (ua.includes('roku')) {
    return { isTv: true, platform: 'roku' };
  }

  // Heuristic: no touch + no fine pointer = likely TV or set-top box
  if (typeof matchMedia !== 'undefined') {
    const noFinePointer = matchMedia('(pointer: coarse)').matches || !matchMedia('(pointer: fine)').matches;
    const noHover = !matchMedia('(hover: hover)').matches;
    const noTouch = !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
    if (noFinePointer && noHover && noTouch && screen.width >= 960) {
      return { isTv: true, platform: 'generic-tv' };
    }
  }

  return { isTv: false, platform: 'desktop' };
}

/**
 * Hook: auto-detects TV at mount, sets store.tvMode
 */
export function useTVDetection() {
  useEffect(() => {
    const info = detectTVPlatform();
    if (info.isTv) {
      usePlayerStore.getState().setTvMode(true);
      usePlayerStore.getState().setReduceMotion(true); // TVs benefit from less animation
      document.documentElement.classList.add('is-tv', `tv-${info.platform}`);
      console.log(`[OmniStream] TV platform detected: ${info.platform}`);
    }
  }, []);
}
