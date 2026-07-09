import { useRef, useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { formatTime, qualityLabel } from '../lib/format';
import {
  PlayIcon,
  PauseIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMuteIcon,
  CaptionsIcon,
  SettingsIcon,
  InfoIcon,
  FullscreenIcon,
  FullscreenExitIcon,
  PiPIcon,
  KeyboardIcon,
  ListIcon,
} from './icons';
import CastButton from './CastButton';

interface ControlBarProps {
  onTogglePlay: () => void;
  onSeekToFraction: (f: number) => void;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onToggleCaptions: () => void;
  onToggleDrawer: () => void;
  drawerOpen: boolean;
  onToggleSettings: () => void;
  settingsOpen: boolean;
  onToggleStats: () => void;
  statsOpen: boolean;
  onTogglePiP: () => void;
  onToggleHelp: () => void;
}

function ProgressBar({ onSeekToFraction }: { onSeekToFraction: (f: number) => void }) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const bufferedAhead = usePlayerStore((s) => s.stats.bufferedAhead);
  const channels = usePlayerStore((s) => s.iptvChannels);
  const activeChannelId = usePlayerStore((s) => s.activeChannelId);
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const barRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct =
    duration > 0 ? Math.min(100, ((currentTime + bufferedAhead) / duration) * 100) : 0;

  const fraction = (clientX: number) => {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  return (
    <div
      className="omni-progress"
      ref={barRef}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setDragging(true);
        onSeekToFraction(fraction(e.clientX));
      }}
      onPointerMove={(e) => {
        const f = fraction(e.clientX);
        setHover(f);
        if (dragging) onSeekToFraction(f);
      }}
      onPointerUp={(e) => {
        setDragging(false);
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
      }}
      onPointerLeave={() => !dragging && setHover(null)}
    >
      <div className={`omni-progress-rail ${dragging ? 'is-dragging' : ''}`}>
        <div className="omni-progress-buffered" style={{ width: `${bufPct}%` }} />
        <div className="omni-progress-played" style={{ width: `${pct}%` }} />
        <div className="omni-progress-thumb" style={{ left: `${pct}%` }} />
      </div>

      {/* Seek-preview thumbnail card (glyph/gradient stand-in for a VTT sprite). */}
      {hover !== null && (
        <div
          className="omni-seek-preview"
          style={{ left: `${Math.min(90, Math.max(10, hover * 100))}%` }}
        >
          <div
            className="omni-seek-preview-thumb"
            style={{
              background: activeChannel?.gradient ?? 'linear-gradient(135deg,#232526,#414345)',
            }}
          >
            <span>{activeChannel?.glyph ?? '🎬'}</span>
          </div>
          <div className="omni-seek-preview-time">{formatTime((hover || 0) * (duration || 0))}</div>
        </div>
      )}
    </div>
  );
}

export default function ControlBar(props: ControlBarProps) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const captionsEnabled = usePlayerStore((s) => s.captionsEnabled);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);
  const abrEnabled = usePlayerStore((s) => s.abrEnabled);
  const currentQualityId = usePlayerStore((s) => s.currentQualityId);
  const qualities = usePlayerStore((s) => s.qualities);
  const statsHeight = usePlayerStore((s) => s.stats.height);

  const effective = isMuted ? 0 : volume;
  const activeQ = qualities.find((q) => q.id === currentQualityId);
  const badge = abrEnabled
    ? statsHeight > 0
      ? `Auto · ${qualityLabel(statsHeight, 0)}`
      : 'Auto'
    : activeQ
      ? activeQ.label
      : 'Quality';

  const VolIcon = effective === 0 ? VolumeMuteIcon : effective < 0.5 ? VolumeLowIcon : VolumeHighIcon;

  return (
    <div className="omni-bottom-bar">
      <div className="omni-progress-row">
        <span className="omni-time">{formatTime(currentTime)}</span>
        <ProgressBar onSeekToFraction={props.onSeekToFraction} />
        <span className="omni-time omni-time-dur">{formatTime(duration)}</span>
      </div>

      <div className="omni-bottom-controls">
        <div className="omni-left-controls">
          <button className="omni-btn" onClick={props.onTogglePlay} aria-label="Play / Pause">
            {isPlaying ? <PauseIcon size={26} /> : <PlayIcon size={26} />}
          </button>

          <div className="omni-volume-group">
            <button className="omni-btn" onClick={props.onToggleMute} aria-label="Mute">
              <VolIcon size={24} />
            </button>
            <div className="omni-volume-slider">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={effective}
                onChange={(e) => props.onVolume(parseFloat(e.target.value))}
                aria-label="Volume"
              />
            </div>
          </div>

          <button
            className={`omni-btn ${props.drawerOpen ? 'is-active' : ''}`}
            onClick={props.onToggleDrawer}
            aria-label="Channels"
            title="Channels (G)"
          >
            <ListIcon size={23} />
          </button>
        </div>

        <div className="omni-right-controls">
          <button
            className={`omni-btn omni-btn-text ${captionsEnabled ? 'is-active' : ''}`}
            onClick={props.onToggleCaptions}
            aria-label="Captions"
          >
            <CaptionsIcon size={22} />
          </button>

          <button className="omni-btn omni-btn-text" onClick={props.onToggleSettings} aria-label="Settings">
            {badge}
          </button>
          <button
            className={`omni-btn ${props.settingsOpen ? 'is-active' : ''}`}
            onClick={props.onToggleSettings}
            aria-label="Settings"
          >
            <SettingsIcon size={22} />
          </button>

          <button
            className={`omni-btn ${props.statsOpen ? 'is-active' : ''}`}
            onClick={props.onToggleStats}
            aria-label="Stats"
          >
            <InfoIcon size={22} />
          </button>

          <CastButton />

          <button className="omni-btn" onClick={props.onTogglePiP} aria-label="Picture in Picture">
            <PiPIcon size={22} />
          </button>

          <button className="omni-btn" onClick={props.onToggleHelp} aria-label="Shortcuts">
            <KeyboardIcon size={22} />
          </button>

          <button className="omni-btn" onClick={props.onToggleFullscreen} aria-label="Fullscreen">
            {isFullscreen ? <FullscreenExitIcon size={22} /> : <FullscreenIcon size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
}
