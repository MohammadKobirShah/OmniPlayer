import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function useGestures(
  tapLayerRef: React.RefObject<HTMLElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const store = usePlayerStore;
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPress = useRef(false);

  const showHint = useCallback(
    (type: 'seek' | 'volume' | 'brightness' | 'speed', value: string, secondary?: string) => {
      store.getState().setGestureHint({ type, value, secondary });
      if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
      gestureTimerRef.current = setTimeout(() => {
        store.getState().setGestureHint(null);
      }, 800);
    },
    []
  );

  useEffect(() => {
    const el = tapLayerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      wasLongPress.current = false;

      longPressRef.current = setTimeout(() => {
        wasLongPress.current = true;
        const video = videoRef.current;
        if (video) {
          video.playbackRate = 2;
          showHint('speed', '2×', 'Long press speed');
        }
      }, 500);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const rect = el.getBoundingClientRect();
      const isLeftSide = touchStartRef.current.x < rect.left + rect.width / 2;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        // Horizontal swipe = seek
        const video = videoRef.current;
        if (video && Number.isFinite(video.duration)) {
          const seekAmount = (dx / rect.width) * video.duration * 0.3;
          const sign = seekAmount > 0 ? '+' : '';
          showHint('seek', `${sign}${Math.round(seekAmount)}s`);
        }
      } else if (Math.abs(dy) > 30) {
        // Vertical swipe
        const change = -dy / rect.height;
        if (isLeftSide) {
          // Brightness
          const newBright = Math.max(0.2, Math.min(1.5, store.getState().brightness + change * 0.5));
          store.getState().setBrightness(newBright);
          showHint('brightness', `${Math.round(newBright * 100)}%`);
        } else {
          // Volume
          const newVol = Math.max(0, Math.min(1, store.getState().volume + change * 0.5));
          store.getState().setVolume(newVol);
          showHint('volume', `${Math.round(newVol * 100)}%`);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }

      if (wasLongPress.current) {
        const video = videoRef.current;
        if (video) {
          video.playbackRate = store.getState().playbackRate;
        }
        wasLongPress.current = false;
        touchStartRef.current = null;
        return;
      }

      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const rect = el.getBoundingClientRect();

      if (Math.abs(dx) > 30) {
        // Apply seek
        const video = videoRef.current;
        if (video && Number.isFinite(video.duration)) {
          const seekAmount = (dx / rect.width) * video.duration * 0.3;
          video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seekAmount));
        }
      }

      touchStartRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      if (longPressRef.current) clearTimeout(longPressRef.current);
      if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
    };
  }, [showHint]);
}

export function useDoubleTapSeek(
  tapLayerRef: React.RefObject<HTMLElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  showControlsFn: () => void
) {
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  useEffect(() => {
    const el = tapLayerRef.current;
    if (!el) return;

    const handler = (e: MouseEvent) => {
      const now = Date.now();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isLeft = x < rect.width / 3;
      const isRight = x > (rect.width * 2) / 3;

      if (lastTapRef.current && now - lastTapRef.current.time < 300) {
        // Double tap
        const video = videoRef.current;
        if (video) {
          if (isLeft) {
            video.currentTime = Math.max(0, video.currentTime - 10);
            usePlayerStore.getState().setGestureHint({ type: 'seek', value: '-10s' });
          } else if (isRight) {
            video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
            usePlayerStore.getState().setGestureHint({ type: 'seek', value: '+10s' });
          }
          setTimeout(() => usePlayerStore.getState().setGestureHint(null), 800);
        }
        lastTapRef.current = null;
        e.preventDefault();
        return;
      }
      lastTapRef.current = { time: now, x: e.clientX };
    };

    el.addEventListener('dblclick', handler);
    return () => el.removeEventListener('dblclick', handler);
  }, [showControlsFn]);
}
