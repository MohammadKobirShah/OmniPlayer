import React, { useState, useEffect, useRef, memo } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { formatBitrate } from '../utils/formatTime';

interface StatsPanelProps {
  open: boolean;
  onClose: () => void;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="omni-stat">
      <span className="omni-stat-label">{label}</span>
      <span className="omni-stat-value">{value}</span>
    </div>
  );
}

export const StatsPanel: React.FC<StatsPanelProps> = memo(({ open, onClose }) => {
  const stats = usePlayerStore((s) => s.stats);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const duration = usePlayerStore((s) => s.displayDuration);
  const abrEnabled = usePlayerStore((s) => s.abrEnabled);
  const currentQualityId = usePlayerStore((s) => s.currentQualityId);
  const qualities = usePlayerStore((s) => s.qualities);

  const [fps, setFps] = useState(0);
  const prevDecodedRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    prevDecodedRef.current = usePlayerStore.getState().stats.decodedFrames;
    setFps(0);
    const interval = setInterval(() => {
      const current = usePlayerStore.getState().stats.decodedFrames;
      setFps(Math.max(0, current - prevDecodedRef.current));
      prevDecodedRef.current = current;
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const resolution = stats.height > 0 ? `${stats.width}×${stats.height}` : '—';
  const activeQuality = qualities.find((q) => q.id === currentQualityId);
  const abrMode = abrEnabled ? 'Auto (ABR)' : activeQuality ? `Fixed · ${activeQuality.label}` : 'Manual';
  const dropRate =
    stats.decodedFrames > 0
      ? ((stats.droppedFrames / (stats.decodedFrames + stats.droppedFrames)) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="omni-stats omni-glass" onClick={(e) => e.stopPropagation()}>
      <div className="omni-stats-head">
        <span className="omni-stats-title">Stats for Nerds</span>
        <span
          className={`omni-stats-state ${
            isBuffering ? 'is-buffering' : isPlaying ? 'is-playing' : 'is-paused'
          }`}
        >
          ● {isBuffering ? 'Buffering' : isPlaying ? 'Playing' : 'Paused'}
        </span>
      </div>
      <div className="omni-stats-grid">
        <StatItem label="Resolution" value={resolution} />
        <StatItem label="Stream Bitrate" value={formatBitrate(stats.bitrate / 1000)} />
        <StatItem label="Net Estimate" value={formatBitrate(stats.estimatedBandwidth / 1000)} />
        <StatItem label="Buffer Health" value={`${stats.bufferedAhead.toFixed(1)}s`} />
        <StatItem label="Frame Rate" value={fps > 0 ? `${fps} fps` : '—'} />
        <StatItem label="Playback Rate" value={`${playbackRate}×`} />
        <StatItem label="Decoded" value={stats.decodedFrames.toLocaleString()} />
        <StatItem label="Dropped" value={`${stats.droppedFrames.toLocaleString()} (${dropRate}%)`} />
        <StatItem label="ABR Mode" value={abrMode} />
        <StatItem label="Progress" value={`${stats.completionPercent.toFixed(1)}%`} />
        <StatItem
          label="Duration"
          value={Number.isFinite(duration) ? `${duration.toFixed(1)}s` : 'Live'}
        />
        <StatItem label="Buffer Goal" value="15s / 30s" />
      </div>
      <button className="omni-stats-close" onClick={onClose}>
        Close
      </button>
    </div>
  );
});
