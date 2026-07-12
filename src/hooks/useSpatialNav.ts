import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';

/**
 * Focusable selector — all interactive elements in the player/library.
 */
const FOCUSABLE = [
  'button:not([disabled]):not([aria-hidden="true"])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  cx: number;
  cy: number;
  el: HTMLElement;
}

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    el,
  };
}

function isVisible(el: HTMLElement): boolean {
  if (!el.offsetParent && el.style.position !== 'fixed') return false;
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/**
 * Find best candidate in a given direction from the current focused element.
 * Uses a weighted scoring: primary axis distance + perpendicular axis penalty.
 */
function findNextFocus(
  current: Rect,
  candidates: Rect[],
  direction: 'up' | 'down' | 'left' | 'right'
): HTMLElement | null {
  let best: Rect | null = null;
  let bestScore = Infinity;

  for (const c of candidates) {
    if (c.el === current.el) continue;

    let primaryDist: number;
    let crossDist: number;
    let isInDirection: boolean;

    switch (direction) {
      case 'up':
        isInDirection = c.cy < current.cy - 2;
        primaryDist = current.top - c.bottom;
        crossDist = Math.abs(c.cx - current.cx);
        break;
      case 'down':
        isInDirection = c.cy > current.cy + 2;
        primaryDist = c.top - current.bottom;
        crossDist = Math.abs(c.cx - current.cx);
        break;
      case 'left':
        isInDirection = c.cx < current.cx - 2;
        primaryDist = current.left - c.right;
        crossDist = Math.abs(c.cy - current.cy);
        break;
      case 'right':
        isInDirection = c.cx > current.cx + 2;
        primaryDist = c.left - current.right;
        crossDist = Math.abs(c.cy - current.cy);
        break;
    }

    if (!isInDirection) continue;
    if (primaryDist < -5) continue; // behind us

    // Score: primary axis weight 1x, cross axis weight 3x (penalize off-axis heavily)
    const score = Math.max(0, primaryDist) + crossDist * 3;

    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best?.el ?? null;
}

/**
 * Spatial navigation hook for TV D-pad.
 * When tvMode is on, arrow keys move focus between focusable elements
 * instead of seeking/volume.
 */
export function useSpatialNav(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const moveFocus = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const container = containerRef.current;
      if (!container) return false;

      const active = document.activeElement as HTMLElement | null;
      if (!active || !container.contains(active)) {
        // No focus in container — focus first visible focusable
        const first = container.querySelector(FOCUSABLE) as HTMLElement | null;
        if (first && isVisible(first)) {
          first.focus({ preventScroll: true });
          return true;
        }
        return false;
      }

      // Gather all visible focusable elements
      const all = Array.from(container.querySelectorAll(FOCUSABLE)) as HTMLElement[];
      const visibleEls = all.filter(isVisible);
      if (visibleEls.length <= 1) return false;

      const rects = visibleEls.map(getRect);
      const currentRect = getRect(active);
      const next = findNextFocus(currentRect, rects, direction);

      if (next) {
        next.focus({ preventScroll: true });
        // Scroll into view if inside a scrollable container
        next.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        return true;
      }

      return false;
    },
    [containerRef]
  );

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Skip if in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // But still handle Enter and Escape in inputs on TV
        if (e.key !== 'Enter' && e.key !== 'Escape' && e.key !== 'GoBack') return;
      }

      const state = usePlayerStore.getState();
      let handled = false;

      switch (e.key) {
        case 'ArrowUp':
          handled = moveFocus('up');
          break;
        case 'ArrowDown':
          handled = moveFocus('down');
          break;
        case 'ArrowLeft':
          // If no panel/drawer open, seek instead of nav
          if (!state.isDrawerOpen && !document.activeElement?.closest('.omni-menu, .omni-stats, .omni-help, .omni-drawer')) {
            return; // let the main keyboard handler do seek
          }
          handled = moveFocus('left');
          break;
        case 'ArrowRight':
          if (!state.isDrawerOpen && !document.activeElement?.closest('.omni-menu, .omni-stats, .omni-help, .omni-drawer')) {
            return;
          }
          handled = moveFocus('right');
          break;

        // Android TV Back button / Tizen back
        case 'GoBack':
        case 'XF86Back':
        case 'BrowserBack':
          // Treat as Escape — the main handler picks it up
          const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
          window.dispatchEvent(escEvent);
          handled = true;
          break;

        // Remote D-pad center / Enter
        case 'Enter':
          // If focused on a button, let the click fire naturally
          if (document.activeElement instanceof HTMLButtonElement) {
            document.activeElement.click();
            handled = true;
          }
          break;

        // ── Media Keys (Remote Play/Pause/Stop/FF/RW) ──
        case 'MediaPlayPause':
        case 'MediaPlay':
          if (state.isPlaying && e.key === 'MediaPlayPause') {
            const vid = document.querySelector('.omni-video') as HTMLVideoElement;
            vid?.pause();
          } else {
            const vid = document.querySelector('.omni-video') as HTMLVideoElement;
            vid?.play().catch(() => {});
          }
          handled = true;
          break;
        case 'MediaPause':
        case 'MediaStop':
          (document.querySelector('.omni-video') as HTMLVideoElement)?.pause();
          handled = true;
          break;
        case 'MediaFastForward':
        case 'MediaTrackNext':
          {
            const vid = document.querySelector('.omni-video') as HTMLVideoElement;
            if (vid) vid.currentTime = Math.min(vid.duration || Infinity, vid.currentTime + 10);
          }
          handled = true;
          break;
        case 'MediaRewind':
        case 'MediaTrackPrevious':
          {
            const vid = document.querySelector('.omni-video') as HTMLVideoElement;
            if (vid) vid.currentTime = Math.max(0, vid.currentTime - 10);
          }
          handled = true;
          break;

        // Channel Up/Down (common on TV remotes)
        case 'ChannelUp':
        case 'ChannelDown': {
          const channels = state.iptvChannels;
          if (channels.length > 1) {
            const currentIdx = channels.findIndex(c => c.id === state.activeChannelId);
            const delta = e.key === 'ChannelUp' ? -1 : 1;
            const nextIdx = (currentIdx + delta + channels.length) % channels.length;
            state.selectChannel(channels[nextIdx].id);
            handled = true;
          }
          break;
        }

        // Color buttons (Samsung / LG remotes)
        case 'ColorF0Red':
          // Red = toggle captions
          break;
        case 'ColorF1Green':
          // Green = toggle channels drawer
          state.toggleDrawer();
          handled = true;
          break;
        case 'ColorF2Yellow':
          break;
        case 'ColorF3Blue':
          break;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        // Keep controls visible on any TV interaction
        state.setShowControls(true);
      }
    };

    // Capture phase so we intercept before the main keyboard handler
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [enabled, moveFocus]);

  return { moveFocus };
}

/**
 * Auto-focus management for TV: when controls become visible,
 * move focus to the main play button.
 */
export function useTVAutoFocus(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const showControls = usePlayerStore((s) => s.showControls);

  useEffect(() => {
    if (!enabled || !showControls) return;

    // Small delay so DOM is updated
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const active = document.activeElement as HTMLElement | null;
      // Don't steal focus if user is already focused inside a panel
      if (active && container.contains(active) && isVisible(active)) return;

      // Focus the main center play button
      const mainBtn = container.querySelector('.omni-btn-main') as HTMLElement | null;
      if (mainBtn && isVisible(mainBtn)) {
        mainBtn.focus({ preventScroll: true });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [enabled, showControls, containerRef]);
}
