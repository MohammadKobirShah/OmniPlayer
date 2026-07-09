import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../lib/format';

/**
 * Module-level guard so a touch-tap doesn't double-fire as a synthesized
 * mouse `click` on desktop-style handlers (e.g. the tap layer's onClick).
 * Returns true when the most recent touch interaction is recent.
 */
let lastTouchAt = 0;
export function consumeRecentTouch(): boolean {
  return performance.now() - lastTouchAt < 450;
}

interface TouchState {
  x: number;
  y: number;
  moved: boolean;
  axis: 'none' | 'x' | 'y';
  /** currentTime captured at gesture start (for horizontal seek). */
  seekBase: number;
  /** Volume captured at gesture start (for vertical right). */
  volBase: number;
  /** Brightness captured at gesture start (for vertical left). */
  brightBase: number;
}

const THRESHOLD = 12; // px before an axis is locked
const DOUBLE_TAP_MS = 300;
const LONG_PRESS_MS = 480;

/**
 * Touch gesture layer for mobile:
 *  - horizontal swipe  → seek (preview + commit on release)
 *  - right vertical     → volume
 *  - left vertical      → brightness (CSS filter on the video)
 *  - long press (hold)  → 2× speed while held
 *  - double tap         → ±10s (left / right half)
 *  - single tap         → play / pause (deferred so it can become a double-tap)
 */
export function useGestures(
  layerRef: React.RefObject<HTMLElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  useEffect(() => {
    const layer = layerRef.current;
    const video = videoRef.current;
    if (!layer || !video) return;

    let st: TouchState | null = null;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingTap: ReturnType<typeof setTimeout> | null = null;
    let originalRate = 1;
    let lastTap = 0;
    let rateBoosted = false;

    const resetRateBoost = () => {
      if (rateBoosted) {
        rateBoosted = false;
        usePlayerStore.getState().setPlaybackRate(originalRate);
        usePlayerStore.getState().setGestureHint(null);
      }
    };

    const clearLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const cancelPendingTap = () => {
      if (pendingTap) {
        clearTimeout(pendingTap);
        pendingTap = null;
      }
      lastTap = 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const s = usePlayerStore.getState();
      st = {
        x: t.clientX,
        y: t.clientY,
        moved: false,
        axis: 'none',
        seekBase: video.currentTime,
        volBase: s.volume,
        brightBase: s.brightness,
      };
      originalRate = s.playbackRate;
      clearLongPress();
      longPressTimer = setTimeout(() => {
        if (st && !st.moved && !rateBoosted) {
          rateBoosted = true;
          cancelPendingTap();
          s.setPlaybackRate(2);
          s.setGestureHint({ kind: 'speed', value: 2 });
        }
      }, LONG_PRESS_MS);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!st) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - st.x;
      const dy = t.clientY - st.y;
      const w = layer.clientWidth || window.innerWidth;
      const h = layer.clientHeight || window.innerHeight;

      if (st.axis === 'none') {
        if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
        st.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        clearLongPress();
        cancelPendingTap(); // a swipe is not a tap
        st.moved = true;
      }

      if (st.axis === 'x') {
        e.preventDefault();
        const dur = Number.isFinite(video.duration) ? video.duration : 0;
        // Full-width swipe spans the whole duration.
        const deltaSec = (dx / w) * dur;
        const target = Math.min(dur || 0, Math.max(0, st.seekBase + deltaSec));
        usePlayerStore.getState().setGestureHint({
          kind: 'seek',
          value: target,
          forward: deltaSec >= 0,
        });
      } else {
        e.preventDefault();
        const onRight = st.x > w / 2;
        if (onRight) {
          const vol = Math.min(1, Math.max(0, st.volBase + -dy / h));
          usePlayerStore.getState().setVolume(vol);
          usePlayerStore.getState().setGestureHint({ kind: 'volume', value: vol });
        } else {
          const bright = Math.min(1.8, Math.max(0.25, st.brightBase + -dy / h));
          usePlayerStore.getState().setBrightness(bright);
          usePlayerStore.getState().setGestureHint({ kind: 'brightness', value: bright });
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      clearLongPress();
      resetRateBoost();
      lastTouchAt = performance.now();
      if (!st) return;

      const wasMove = st.moved && st.axis !== 'none';
      if (wasMove) {
        if (st.axis === 'x') {
          // Commit the horizontal seek previewed during the drag.
          const hint = usePlayerStore.getState().gestureHint;
          if (hint && hint.kind === 'seek') {
            video.currentTime = hint.value;
          }
        }
        usePlayerStore.getState().setGestureHint(null);
        st = null;
        return;
      }

      // ---- Tap detection ----
      const touch = e.changedTouches[0];
      const now = performance.now();
      const sinceLast = now - lastTap;
      st = null;

      if (sinceLast > 0 && sinceLast < DOUBLE_TAP_MS && touch) {
        // Double tap → ±10s by screen half. Cancel the pending single-tap.
        cancelPendingTap();
        const onLeft = touch.clientX < (layer.clientWidth || window.innerWidth) / 2;
        const dur = Number.isFinite(video.duration) ? video.duration : Infinity;
        const target = Math.min(dur, Math.max(0, video.currentTime + (onLeft ? -10 : 10)));
        video.currentTime = target;
        usePlayerStore.getState().setGestureHint({
          kind: 'seek',
          value: target,
          forward: !onLeft,
        });
        setTimeout(() => usePlayerStore.getState().setGestureHint(null), 650);
        return;
      }

      // Single tap → play / pause, deferred in case a 2nd tap makes it a double.
      const firedAt = now;
      lastTap = now;
      pendingTap = setTimeout(() => {
        pendingTap = null;
        if (lastTap === firedAt) {
          if (video.paused) video.play().catch(() => {});
          else video.pause();
        }
      }, DOUBLE_TAP_MS);
    };

    const onTouchCancel = () => {
      clearLongPress();
      resetRateBoost();
      cancelPendingTap();
      usePlayerStore.getState().setGestureHint(null);
      st = null;
    };

    layer.addEventListener('touchstart', onTouchStart, { passive: true });
    layer.addEventListener('touchmove', onTouchMove, { passive: false });
    layer.addEventListener('touchend', onTouchEnd);
    layer.addEventListener('touchcancel', onTouchCancel);

    return () => {
      layer.removeEventListener('touchstart', onTouchStart);
      layer.removeEventListener('touchmove', onTouchMove);
      layer.removeEventListener('touchend', onTouchEnd);
      layer.removeEventListener('touchcancel', onTouchCancel);
      clearLongPress();
      cancelPendingTap();
    };
  }, [layerRef, videoRef]);
}

/** Build the textual label shown inside the on-screen gesture indicator. */
export function gestureHintLabel(hint: {
  kind: 'seek' | 'volume' | 'brightness' | 'speed';
  value: number;
  forward?: boolean;
}): { icon: string; primary: string; secondary?: string } {
  switch (hint.kind) {
    case 'seek':
      return {
        icon: hint.forward ? '⏩' : '⏪',
        primary: formatTime(hint.value),
        secondary: hint.forward ? '+10s' : '-10s',
      };
    case 'volume':
      return {
        icon: hint.value <= 0 ? '🔇' : hint.value < 0.5 ? '🔉' : '🔊',
        primary: `${Math.round(hint.value * 100)}%`,
      };
    case 'brightness':
      return { icon: '☀️', primary: `${Math.round(hint.value * 100)}%` };
    case 'speed':
      return { icon: '⚡', primary: `${hint.value}×`, secondary: 'Hold for fast' };
  }
}
