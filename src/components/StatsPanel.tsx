import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { formatBitrate } from '../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="omni-stat">
      <span className="omni-stat-label">{label}</span>
      <span className="omni-stat-value">{value}</span>
    </div>
  );
}

export default function StatsPanel({ open, onClose }: Props) {
  const stats = usePlayerStore((s) => s.stats);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const duration = usePlayerStore((s) => s.duration);
  const abrEnabled = usePlayerStore((s) => s.abrEnabled);
  const currentQualityId = usePlayerStore((s) => s.currentQualityId);
  const qualities = usePlayerStore((s) => s.qualities);

  const [fps, setFps] = useState(0);
  const lastDecodedRef = useRef(0);

  // Derive a live FPS from the delta of decoded frames.
  useEffect(() => {
    if (!open) return;
    // Seed the baseline so the first reading isn't a cumulative burst.
    lastDecodedRef.current = usePlayerStore.getState().stats.decodedFrames;
    setFps(0);
    const id = setInterval(() => {
      const decoded = usePlayerStore.getState().stats.decodedFrames;
      setFps(Math.max(0, decoded - lastDecodedRef.current));
      lastDecodedRef.current = decoded;
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const res =
    stats.height > 0 ? `${stats.width}×${stats.height}` : '—';
  const activeQ = qualities.find((q) => q.id === currentQualityId);
  const mode = abrEnabled
    ? 'Auto (ABR)'
    : activeQ
      ? `Fixed · ${activeQ.label}`
      : 'Manual';

  const dropRatio =
    stats.decodedFrames > 0
      ? ((stats.droppedFrames / (stats.decodedFrames + stats.droppedFrames)) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="omni-stats omni-glass" onClick={(e) => e.stopPropagation()}>
      <div className="omni-stats-head">
        <span className="omni-stats-title">Stats for Nerds</span>
        <span
          className={`omni-stats-state ${isBuffering ? 'is-buffering' : isPlaying ? 'is-playing' : 'is-paused'}`}
        >
          ● {isBuffering ? 'Buffering' : isPlaying ? 'Playing' : 'Paused'}
        </span>
      </div>
      <div className="omni-stats-grid">
        <Stat label="Resolution" value={res} />
        <Stat label="Stream Bitrate" value={formatBitrate(stats.bitrate)} />
        <Stat label="Net Estimate" value={formatBitrate(stats.estimatedBandwidth)} />
        <Stat label="Buffer Health" value={`${stats.bufferedAhead.toFixed(1)}s`} />
        <Stat label="Frame Rate" value={fps > 0 ? `${fps} fps` : '—'} />
        <Stat label="Playback Rate" value={`${playbackRate}×`} />
        <Stat label="Decoded" value={`${stats.decodedFrames.toLocaleString()}`} />
        <Stat label="Dropped" value={`${stats.droppedFrames.toLocaleString()} (${dropRatio}%)`} />
        <Stat label="ABR Mode" value={mode} />
        <Stat label="Progress" value={`${stats.completionPercent.toFixed(1)}%`} />
        <Stat label="Duration" value={Number.isFinite(duration) ? `${duration.toFixed(1)}s` : 'Live'} />
        <Stat label="Buffer Goal" value="15s / 30s" />
      </div>
      <button className="omni-stats-close" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
