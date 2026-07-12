import React, { memo } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { ProgressBar } from './ProgressBar';
import { formatTime } from '../utils/formatTime';
import {
  PlayIcon,
  PauseIcon,
  VolumeHighIcon,
  VolumeMuteIcon,
  FullscreenIcon,
  FullscreenExitIcon,
  SettingsIcon,
  CaptionsIcon,
  PipIcon,
  MenuIcon,
  BarChartIcon,
  HelpIcon,
} from './Icons';

interface ControlsBarProps {
  onTogglePlay: () => void;
  onSeekToFraction: (frac: number) => void;
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

export const ControlsBar: React.FC<ControlsBarProps> = memo(({
  onTogglePlay,
  onSeekToFraction,
  onVolume,
  onToggleMute,
  onToggleFullscreen,
  onToggleCaptions,
  onToggleDrawer,
  drawerOpen,
  onToggleSettings,
  settingsOpen,
  onToggleStats,
  statsOpen,
  onTogglePiP,
  onToggleHelp,
}) => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.displayTime);
  const duration = usePlayerStore((s) => s.displayDuration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);
  const captionsEnabled = usePlayerStore((s) => s.captionsEnabled);
  const hasChannels = usePlayerStore((s) => s.iptvChannels.length > 0);

  const timeDisplay = formatTime(currentTime);
  const durationDisplay = Number.isFinite(duration) ? formatTime(duration) : 'LIVE';

  return (
    <div className="omni-bottom-bar">
      <div className="omni-progress-row">
        <span className="omni-time">{timeDisplay}</span>
        <ProgressBar onSeekToFraction={onSeekToFraction} />
        <span className="omni-time omni-time-dur">{durationDisplay}</span>
      </div>
      <div className="omni-bottom-controls">
        <div className="omni-left-controls">
          <button
            className="omni-btn omni-btn-sm"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </button>

          <div className="omni-volume-group">
            <button
              className="omni-btn omni-btn-sm"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeMuteIcon size={20} /> : <VolumeHighIcon size={20} />}
            </button>
            <div className="omni-volume-slider">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onVolume(v);
                  if (v > 0 && usePlayerStore.getState().isMuted) {
                    usePlayerStore.getState().toggleMute();
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="omni-right-controls">
          {hasChannels && (
            <button
              className={`omni-btn omni-btn-sm omni-btn-text ${drawerOpen ? 'is-active' : ''}`}
              onClick={onToggleDrawer}
              aria-label="Channels"
              title="Channels (G)"
            >
              <MenuIcon size={18} />
            </button>
          )}
          <button
            className={`omni-btn omni-btn-sm omni-btn-text ${captionsEnabled ? 'is-active' : ''}`}
            onClick={onToggleCaptions}
            aria-label="Captions"
            title="Captions (C)"
          >
            <CaptionsIcon size={18} />
          </button>
          <button
            className={`omni-btn omni-btn-sm omni-btn-text ${statsOpen ? 'is-active' : ''}`}
            onClick={onToggleStats}
            aria-label="Stats"
            title="Stats (S)"
          >
            <BarChartIcon size={18} />
          </button>
          <button
            className={`omni-btn omni-btn-sm omni-btn-text ${settingsOpen ? 'is-active' : ''}`}
            onClick={onToggleSettings}
            aria-label="Settings"
            title="Settings (Q)"
          >
            <SettingsIcon size={18} />
          </button>
          <button
            className="omni-btn omni-btn-sm omni-btn-text"
            onClick={onTogglePiP}
            aria-label="Picture in Picture"
            title="Picture in Picture"
          >
            <PipIcon size={18} />
          </button>
          <button
            className="omni-btn omni-btn-sm omni-btn-text"
            onClick={onToggleHelp}
            aria-label="Help"
            title="Help (?)"
          >
            <HelpIcon size={18} />
          </button>
          <button
            className="omni-btn omni-btn-sm"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            title="Fullscreen (F)"
          >
            {isFullscreen ? <FullscreenExitIcon size={20} /> : <FullscreenIcon size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
});
