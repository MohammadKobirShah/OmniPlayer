import { useRef, useState, useCallback, useEffect, useMemo, memo } from 'react';
import { usePlayerStore, hotState } from '../store/playerStore';
import { useShakaPlayer } from '../hooks/useShakaPlayer';
import { useGestures } from '../hooks/useGestures';
import { useSpatialNav, useTVAutoFocus } from '../hooks/useSpatialNav';
import { ControlsBar } from './ControlsBar';
import { SettingsMenu } from './SettingsMenu';
import { StatsPanel } from './StatsPanel';
import { ChannelDrawer } from './ChannelDrawer';
import { HelpOverlay } from './HelpOverlay';
import { PlayIcon, RewindIcon, ForwardIcon, PauseIcon, ChevronLeftIcon } from './Icons';
import { getStreamType, getDrmLabel } from '../utils/m3uParser';

interface OmniPlayerProps {
  onExit?: () => void;
  embed?: boolean;
}

export const OmniPlayer: React.FC<OmniPlayerProps> = memo(({ onExit, embed }) => {
  const exitFn = onExit ?? (() => {});

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tapLayerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [retryKey, setRetryKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const isDrawerOpen = usePlayerStore((s) => s.isDrawerOpen);
  const channels = usePlayerStore((s) => s.iptvChannels);
  const activeChannelId = usePlayerStore((s) => s.activeChannelId);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  const manifestUrl = activeChannel?.url ?? '';
  const drm = activeChannel?.drm;
  const title = activeChannel?.name ?? 'OmniStream';

  const controller = useShakaPlayer(videoRef, manifestUrl, drm, retryKey, activeChannel?.headers);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isReady = usePlayerStore((s) => s.isReady);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const showControls = usePlayerStore((s) => s.showControls);
  const error = usePlayerStore((s) => s.error);
  const brightness = usePlayerStore((s) => s.brightness);
  const gestureHint = usePlayerStore((s) => s.gestureHint);
  const tvMode = usePlayerStore((s) => s.tvMode);
  const reduceMotion = usePlayerStore((s) => s.reduceMotion);

  const toggleDrawer = usePlayerStore((s) => s.toggleDrawer);

  // ── TV: Spatial navigation + auto-focus ──
  useSpatialNav(containerRef, tvMode);
  useTVAutoFocus(containerRef, tvMode);

  // ── Gestures: only on non-TV ──
  useGestures(tvMode ? { current: null } : tapLayerRef, videoRef);

  // ── Refs for stable closures ──
  const panelsRef = useRef({ settingsOpen: false, statsOpen: false, helpOpen: false });
  panelsRef.current = { settingsOpen, statsOpen, helpOpen };

  // Auto-hide controls
  const showControlsFn = useCallback(() => {
    usePlayerStore.getState().setShowControls(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // Longer timeout on TV — remotes are slower
    const timeout = usePlayerStore.getState().tvMode ? 6000 : 3000;
    idleTimerRef.current = setTimeout(() => {
      const s = usePlayerStore.getState();
      const p = panelsRef.current;
      if (s.isPlaying && !p.settingsOpen && !p.statsOpen && !p.helpOpen && !s.isDrawerOpen) {
        usePlayerStore.getState().setShowControls(false);
      }
    }, timeout);
  }, []);

  // Toggle play
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const handleTapLayerClick = useCallback(() => {
    // On TV mode, just show controls on click/tap, don't toggle play
    if (usePlayerStore.getState().tvMode) {
      showControlsFn();
      return;
    }
    usePlayerStore.getState().setShowControls(true);
    togglePlay();
  }, [togglePlay, showControlsFn]);

  const seekToFraction = useCallback((frac: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(video.duration, Math.max(0, frac * video.duration));
    hotState.currentTime = video.currentTime;
    usePlayerStore.getState().pushTimeToUI();
  }, []);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + seconds));
    hotState.currentTime = video.currentTime;
    usePlayerStore.getState().pushTimeToUI();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      } else {
        el.requestFullscreen?.().catch(() => {});
      }
    } catch { /* ignore */ }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video && document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch { /* ignore */ }
  }, []);

  const toggleCaptions = useCallback(() => {
    const enabled = !usePlayerStore.getState().captionsEnabled;
    controller.toggleCaptions(enabled);
  }, [controller]);

  const selectChannel = useCallback((id: string) => {
    usePlayerStore.getState().selectChannel(id);
  }, []);

  // Fullscreen change
  useEffect(() => {
    const handler = () => usePlayerStore.getState().setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Show controls when play state changes
  useEffect(() => { showControlsFn(); }, [isPlaying]);

  // ── Keyboard handler ──
  const actionsRef = useRef<any>({});
  actionsRef.current = {
    togglePlay, seekBy, seekToFraction, toggleFullscreen, toggleCaptions,
    toggleDrawer, exitFn, showControlsFn,
    setSettingsOpen, setStatsOpen, setHelpOpen,
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const a = actionsRef.current;
      const state = usePlayerStore.getState();
      const key = e.key;

      // On TV mode, arrow keys are handled by spatial nav (capture phase),
      // so they won't reach here when inside panels/drawer.
      // But when no panel is open, ArrowLeft/Right should still seek.

      if (key === 'Escape' || key === 'GoBack' || key === 'XF86Back' || key === 'BrowserBack') {
        if (state.isDrawerOpen) { a.toggleDrawer(false); return; }
        if (panelsRef.current.helpOpen || panelsRef.current.statsOpen || panelsRef.current.settingsOpen) {
          a.setHelpOpen(false); a.setStatsOpen(false); a.setSettingsOpen(false); return;
        }
        if (state.isFullscreen) { a.toggleFullscreen(); return; }
        a.exitFn(); return;
      }

      switch (key) {
        case ' ': case 'k': case 'K': case 'Enter':
          // On TV, Enter on the tap layer = play/pause
          if (key === 'Enter') {
            // Let spatial nav handle Enter on buttons — only handle if no focused button
            if (document.activeElement instanceof HTMLButtonElement) return;
          }
          a.togglePlay(); e.preventDefault(); break;
        case 'j': case 'J': a.seekBy(-10); break;
        case 'l': case 'L': a.seekBy(10); break;
        case 'ArrowLeft':
          // On TV with panel open, spatial nav already handled this
          if (state.tvMode && (state.isDrawerOpen ||
            document.activeElement?.closest('.omni-menu, .omni-stats, .omni-help, .omni-drawer'))) return;
          a.seekBy(-5); break;
        case 'ArrowRight':
          if (state.tvMode && (state.isDrawerOpen ||
            document.activeElement?.closest('.omni-menu, .omni-stats, .omni-help, .omni-drawer'))) return;
          a.seekBy(5); break;
        case 'ArrowUp':
          if (state.tvMode) return; // handled by spatial nav
          usePlayerStore.getState().setVolume(Math.min(1, state.volume + 0.1));
          e.preventDefault(); break;
        case 'ArrowDown':
          if (state.tvMode) return;
          usePlayerStore.getState().setVolume(Math.max(0, state.volume - 0.1));
          e.preventDefault(); break;
        case 'm': case 'M': usePlayerStore.getState().toggleMute(); break;
        case 'f': case 'F': a.toggleFullscreen(); break;
        case 'c': case 'C': a.toggleCaptions(); break;
        case 'g': case 'G': a.toggleDrawer(); break;
        case 'q': case 'Q': a.setSettingsOpen((v: boolean) => !v); break;
        case 's': case 'S': a.setStatsOpen((v: boolean) => !v); break;
        case '?': case 'h': case 'H': a.setHelpOpen((v: boolean) => !v); break;
        case '[': usePlayerStore.getState().setPlaybackRate(Math.max(0.5, +(state.playbackRate - 0.25).toFixed(2))); break;
        case ']': usePlayerStore.getState().setPlaybackRate(Math.min(2, +(state.playbackRate + 0.25).toFixed(2))); break;
        case 'Home': a.seekToFraction(0); break;
        case 'End': a.seekToFraction(1); break;
        default:
          if (key >= '0' && key <= '9') { a.seekToFraction(parseInt(key, 10) / 10); break; }
          return;
      }
      a.showControlsFn();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isLoading = isBuffering || (!isReady && !error);
  const showBigPlay = isReady && !isPlaying && !isBuffering && !error;

  const gestureDisplay = gestureHint
    ? {
        seek: { icon: '⏩', primary: gestureHint.value },
        volume: { icon: '🔊', primary: gestureHint.value },
        brightness: { icon: '☀️', primary: gestureHint.value },
        speed: { icon: '⚡', primary: gestureHint.value },
      }[gestureHint.type]
    : null;

  const streamInfo = activeChannel
    ? {
        container: getStreamType(activeChannel.url),
        protection: getDrmLabel(activeChannel.drm),
        maxRes: activeChannel.isLive ? 'LIVE' : 'HD',
      }
    : { container: '—', protection: '—', maxRes: '—' };

  const panelsOpen = settingsOpen || statsOpen || helpOpen || isDrawerOpen;

  return (
    <div
      ref={containerRef}
      className={`omni-container ${showControls ? '' : 'omni-idle'} ${isDrawerOpen ? 'omni-drawer-open' : ''} ${tvMode ? 'tv-mode' : ''} ${reduceMotion ? 'reduced-motion' : ''} ${embed ? 'omni-embed' : ''}`}
      onMouseMove={tvMode ? undefined : showControlsFn}
      onMouseLeave={tvMode ? undefined : () => {
        if (usePlayerStore.getState().isPlaying && !panelsOpen) {
          usePlayerStore.getState().setShowControls(false);
        }
      }}
    >
      <video
        ref={videoRef}
        className="omni-video"
        playsInline
        style={{ filter: brightness !== 1 ? `brightness(${brightness})` : undefined }}
      />

      <div
        ref={tapLayerRef}
        className="omni-tap-layer"
        onClick={handleTapLayerClick}
        onDoubleClick={tvMode ? undefined : toggleFullscreen}
      />

      {isLoading && !error && <div className="omni-spinner" />}

      {showBigPlay && (
        <button className="omni-big-play" onClick={togglePlay} aria-label="Play" tabIndex={tvMode ? 0 : -1}>
          <PlayIcon size={tvMode ? 52 : 42} />
        </button>
      )}

      {gestureDisplay && !tvMode && (
        <div className="omni-gesture-hint">
          <span className="omni-gesture-icon">{gestureDisplay.icon}</span>
          <span className="omni-gesture-primary">{gestureDisplay.primary}</span>
          {gestureHint?.secondary && (
            <span className="omni-gesture-secondary">{gestureHint.secondary}</span>
          )}
        </div>
      )}

      <div className={`omni-center ${showControls ? '' : 'is-hidden'}`}>
        <button className="omni-btn omni-btn-ghost" onClick={() => seekBy(-10)} aria-label="Rewind 10s" tabIndex={0}>
          <RewindIcon size={tvMode ? 36 : 30} />
        </button>
        <button className="omni-btn omni-btn-main" onClick={togglePlay} aria-label="Play / Pause" tabIndex={0}>
          {isPlaying ? <PauseIcon size={tvMode ? 42 : 34} /> : <PlayIcon size={tvMode ? 42 : 34} />}
        </button>
        <button className="omni-btn omni-btn-ghost" onClick={() => seekBy(10)} aria-label="Forward 10s" tabIndex={0}>
          <ForwardIcon size={tvMode ? 36 : 30} />
        </button>
      </div>

      <div className={`omni-controls-wrapper ${!showControls && !isDrawerOpen ? 'hidden' : ''}`}>
        <div className="omni-top-bar">
          {!embed && (
            <button className="omni-back-btn" onClick={exitFn} aria-label="Back" tabIndex={0}>
              <ChevronLeftIcon size={22} />
            </button>
          )}
          <div className="omni-brand">
            <span className="omni-brand-mark">OMNI</span>
            <span className="omni-brand-stream">STREAM</span>
          </div>
          <div className="omni-title-block">
            <h2 className="omni-title">{title}</h2>
            <div className="omni-badges">
              <span className="omni-badge">{streamInfo.container}</span>
              <span className={`omni-badge ${streamInfo.protection !== 'Clear' ? 'omni-badge-warn' : 'omni-badge-ok'}`}>
                {streamInfo.protection}
              </span>
              <span className={`omni-badge ${activeChannel?.isLive ? 'omni-badge-live' : ''}`}>
                {streamInfo.maxRes}
              </span>
            </div>
          </div>
          {/* TV mode indicator */}
          {tvMode && (
            <div className="omni-tv-badge">
              <span>📺</span> TV Mode
            </div>
          )}
        </div>

        <ControlsBar
          onTogglePlay={togglePlay}
          onSeekToFraction={seekToFraction}
          onVolume={(v) => usePlayerStore.getState().setVolume(v)}
          onToggleMute={() => usePlayerStore.getState().toggleMute()}
          onToggleFullscreen={toggleFullscreen}
          onToggleCaptions={toggleCaptions}
          onToggleDrawer={() => toggleDrawer()}
          drawerOpen={isDrawerOpen}
          onToggleSettings={() => setSettingsOpen((v) => !v)}
          settingsOpen={settingsOpen}
          onToggleStats={() => { setStatsOpen((v) => !v); showControlsFn(); }}
          statsOpen={statsOpen}
          onTogglePiP={togglePiP}
          onToggleHelp={() => setHelpOpen(true)}
        />
      </div>

      <ChannelDrawer
        open={isDrawerOpen}
        onClose={() => usePlayerStore.getState().toggleDrawer(false)}
        onSelect={selectChannel}
      />

      <SettingsMenu open={settingsOpen} onClose={() => setSettingsOpen(false)} controller={controller} />
      <StatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />

      {error && (
        <div className="omni-error-overlay">
          <div className="omni-error-card omni-glass">
            <div className="omni-error-code">Error {String(error.code)}</div>
            <h3>{error.message}</h3>
            {error.hint && <p>{error.hint}</p>}
            <div className="omni-error-actions">
              <button className="omni-error-retry" onClick={() => setRetryKey((k) => k + 1)} tabIndex={0}>Retry</button>
              <button className="omni-error-back" onClick={exitFn} tabIndex={0}>Back to library</button>
            </div>
          </div>
        </div>
      )}

      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="omni-scrim-top" />
      <div className="omni-scrim-bottom" />
    </div>
  );
});
