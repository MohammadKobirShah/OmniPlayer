import React, { useRef, useState, useCallback, memo } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/formatTime';

interface ProgressBarProps {
  onSeekToFraction: (frac: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = memo(({ onSeekToFraction }) => {
  const currentTime = usePlayerStore((s) => s.displayTime);
  const duration = usePlayerStore((s) => s.displayDuration);
  const bufferedFraction = usePlayerStore((s) => s.displayBuffered);
  const railRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const [dragFraction, setDragFraction] = useState<number | null>(null);

  const playedFraction = Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0;
  const displayFraction = isDragging && dragFraction !== null ? dragFraction : playedFraction;

  const getFraction = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return 0;
      const rect = rail.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setHoverFraction(getFraction(e.clientX));
    },
    [getFraction]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) setHoverFraction(null);
  }, [isDragging]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const frac = getFraction(e.clientX);
      setIsDragging(true);
      setDragFraction(frac);

      const onMove = (ev: MouseEvent) => {
        const f = getFraction(ev.clientX);
        setDragFraction(f);
        setHoverFraction(f);
      };

      const onUp = (ev: MouseEvent) => {
        const f = getFraction(ev.clientX);
        onSeekToFraction(f);
        setIsDragging(false);
        setDragFraction(null);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [getFraction, onSeekToFraction]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) {
        onSeekToFraction(getFraction(e.clientX));
      }
    },
    [getFraction, onSeekToFraction, isDragging]
  );

  const tooltipFrac = hoverFraction ?? (isDragging ? dragFraction : null);
  const tooltipTime =
    tooltipFrac !== null && Number.isFinite(duration)
      ? formatTime(tooltipFrac * duration)
      : null;

  return (
    <div
      className="omni-progress"
      ref={railRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className={`omni-progress-rail ${isDragging ? 'is-dragging' : ''}`}>
        <div
          className="omni-progress-buffered"
          style={{ width: `${bufferedFraction * 100}%` }}
        />
        <div
          className="omni-progress-played"
          style={{ width: `${displayFraction * 100}%` }}
        />
        <div
          className="omni-progress-thumb"
          style={{ left: `${displayFraction * 100}%` }}
        />
      </div>
      {tooltipTime && tooltipFrac !== null && (
        <div
          className="omni-progress-tooltip"
          style={{ left: `${tooltipFrac * 100}%` }}
        >
          {tooltipTime}
        </div>
      )}
    </div>
  );
});
