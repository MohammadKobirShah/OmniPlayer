import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShakaPlayer } from '../hooks/useShakaPlayer';
import { useGestures, consumeRecentTouch, gestureHintLabel } from '../hooks/useGestures';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { useRipple } from '../hooks/useRipple';
import { usePlayerStore } from '../store/playerStore';
import { guessContainer } from '../lib/m3u';
import ControlBar from './ControlBar';
import SettingsMenu from './SettingsMenu';
import StatsPanel from './StatsPanel';
import IptvDrawer from './IptvDrawer';
import CastButton from './CastButton';
import '../styles/OmniPlayer.css';
import { PlayIcon, RewindIcon, ForwardIcon, ArrowLeftIcon, CloseIcon } from './icons';

interface Props {
  onExit?: () => void;
  /** When true the player fills its host container (for website embedding). */
  embed?: boolean;
}

const SHORTCUTS: [string, string][] = [
  ['Space / K', 'Play / Pause'],
  ['J / L', 'Rewind / Forward 10s'],
  ['← / →', 'Seek 5s'],
  ['↑ / ↓', 'Volume up / down'],
  ['M', 'Mute'],
  ['F', 'Fullscreen'],
  ['C', 'Captions'],
  ['G', 'Channels / EPG'],
  ['Q', 'Settings'],
  ['S', 'Stats for Nerds'],
  ['[ / ]', 'Slower / Faster'],
  ['0 – 9', 'Seek to 0% – 90%'],
  ['?', 'This help'],
];

export default function OmniPlayer({ onExit, embed }: Props) {
  // In embed mode there is nothing to "exit" back to.
  const exit = onExit ?? (() => {});
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tapLayerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Drawer visibility is owned by the store so selectChannel() can close it.
  const drawerOpen = usePlayerStore((s) => s.isDrawerOpen);

  /* ----------------------- Effective source from IPTV ------------------ */
  const channels = usePlayerStore((s) => s.iptvChannels);
  const activeChannelId = usePlayerStore((s) => s.activeChannelId);
  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId],
  );

  const effectiveUri = activeChannel?.url ?? '';
  const effectiveDrm = activeChannel?.drm;
  const effectiveTitle = activeChannel?.name ?? 'OmniStream';
  const effectiveHeaders = activeChannel?.httpHeaders;
  const reloadNonce = usePlayerStore((s) => s.reloadNonce);
  const bumpReload = usePlayerStore((s) => s.bumpReload);

  const controller = useShakaPlayer(
    videoRef,
    effectiveUri,
    effectiveDrm,
    reloadNonce,
    effectiveHeaders,
  );

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isReady = usePlayerStore((s) => s.isReady);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const showControls = usePlayerStore((s) => s.showControls);
  const error = usePlayerStore((s) => s.error);
  const brightness = usePlayerStore((s) => s.brightness);
  const gestureHint = usePlayerStore((s) => s.gestureHint);
  const tvMode = usePlayerStore((s) => s.tvMode);
  const reduceMotion = usePlayerStore((s) => s.reduceMotion);

  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const setShowControls = usePlayerStore((s) => s.setShowControls);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);

  const overlaysOpenRef = useRef(false);
  overlaysOpenRef.current = settingsOpen || statsOpen || helpOpen || drawerOpen;

  /* ------------------------ Controls auto-hide ------------------------- */
  const flashControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const s = usePlayerStore.getState();
      if (s.isPlaying && !overlaysOpenRef.current) setShowControls(false);
    }, 3000);
  }, [setShowControls]);

  /* --------------------------- Mobile gestures -------------------------- */
  useGestures(tapLayerRef, videoRef);

  /* --------------- TV spatial nav + ripple (10-foot UI) ---------------- */
  useSpatialNav(containerRef, tvMode, flashControls);
  useRipple(containerRef, !reduceMotion);

  /* --------------------------- Core actions ---------------------------- */
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  // Tap layer click (desktop). Touch taps are handled by the gesture hook,
  // which suppresses the synthesized click via consumeRecentTouch().
  const onTap = useCallback(() => {
    if (consumeRecentTouch()) return;
    setShowControls(true);
    togglePlay();
  }, [togglePlay, setShowControls]);

  const seekToFraction = useCallback((f: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(v.duration, Math.max(0, f * v.duration));
  }, []);

  const seekBy = useCallback((s: number) => {
    const v = videoRef.current;
    if (!v) return;
    const target = v.currentTime + s;
    v.currentTime = Math.min(v.duration || target, Math.max(0, target));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
    } catch {
      /* fullscreen may be blocked in sandboxed frames */
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (v && document.pictureInPictureEnabled) await v.requestPictureInPicture();
    } catch {
      /* PiP not available */
    }
  }, []);

  const toggleCaptions = useCallback(() => {
    const on = !usePlayerStore.getState().captionsEnabled;
    controller.toggleCaptions(on);
  }, [controller]);

  const toggleDrawer = usePlayerStore((s) => s.toggleDrawer);
  const onSelectChannel = useCallback((id: string) => {
    usePlayerStore.getState().selectChannel(id);
  }, []);

  useEffect(() => {
    flashControls();
  }, [isPlaying, flashControls]);

  /* --------------------------- Fullscreen sync ------------------------- */
  useEffect(() => {
    const onFs = () => usePlayerStore.getState().setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  /* --------------------------- Keyboard shortcuts ---------------------- */
  const actionsRef = useRef<Record<string, () => void>>({});
  actionsRef.current = {
    togglePlay,
    seekBack10: () => seekBy(-10),
    seekFwd10: () => seekBy(10),
    seekBack5: () => seekBy(-5),
    seekFwd5: () => seekBy(5),
    volUp: () => setVolume(Math.min(1, usePlayerStore.getState().volume + 0.1)),
    volDown: () => setVolume(Math.max(0, usePlayerStore.getState().volume - 0.1)),
    toggleMute,
    toggleFullscreen,
    toggleCaptions,
    toggleDrawer,
    toggleSettings: () => setSettingsOpen((o) => !o),
    toggleStats: () => {
      setStatsOpen((o) => !o);
      flashControls();
    },
    toggleHelp: () => setHelpOpen((o) => !o),
    faster: () =>
      setPlaybackRate(Math.min(2, +(usePlayerStore.getState().playbackRate + 0.25).toFixed(2))),
    slower: () =>
      setPlaybackRate(Math.max(0.5, +(usePlayerStore.getState().playbackRate - 0.25).toFixed(2))),
    exit,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = actionsRef.current;
      const k = e.key;
      // On TV, arrows/Enter/Tab drive spatial focus, not seek/volume.
      if (tvMode && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Tab'].includes(k)) {
        return;
      }
      if (k === 'Escape') {
        if (drawerOpen) {
          usePlayerStore.getState().toggleDrawer(false);
          return;
        }
        if (helpOpen || statsOpen || settingsOpen) {
          setHelpOpen(false);
          setStatsOpen(false);
          setSettingsOpen(false);
          return;
        }
        if (usePlayerStore.getState().isFullscreen) {
          toggleFullscreen();
          return;
        }
        a.exit();
        return;
      }
      if (k === ' ' || k === 'k' || k === 'K') {
        a.togglePlay();
        e.preventDefault();
      } else if (k === 'j' || k === 'J') a.seekBack10();
      else if (k === 'l' || k === 'L') a.seekFwd10();
      else if (k === 'ArrowLeft') {
        a.seekBack5();
        flashControls();
      } else if (k === 'ArrowRight') {
        a.seekFwd5();
        flashControls();
      } else if (k === 'ArrowUp') {
        a.volUp();
        e.preventDefault();
        flashControls();
      } else if (k === 'ArrowDown') {
        a.volDown();
        e.preventDefault();
        flashControls();
      } else if (k === 'm' || k === 'M') a.toggleMute();
      else if (k === 'f' || k === 'F') a.toggleFullscreen();
      else if (k === 'c' || k === 'C') a.toggleCaptions();
      else if (k === 'g' || k === 'G') {
        a.toggleDrawer();
        flashControls();
      } else if (k === 'q' || k === 'Q') a.toggleSettings();
      else if (k === 's' || k === 'S') a.toggleStats();
      else if (k === '?' || k === 'h' || k === 'H') a.toggleHelp();
      else if (k === '[') a.slower();
      else if (k === ']') a.faster();
      else if (k >= '0' && k <= '9') seekToFraction(parseInt(k, 10) / 10);
      else if (k === 'Home') seekToFraction(0);
      else if (k === 'End') seekToFraction(1);
      else return;
      flashControls();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seekToFraction, toggleFullscreen, flashControls, tvMode, drawerOpen, helpOpen, statsOpen, settingsOpen]);

  /* ----------------- TV: auto-focus the main control ------------------ */
  useEffect(() => {
    if (!tvMode) return;
    // When controls are visible and nothing in the player is focused yet,
    // plant focus on the play/pause button so D-pad has a starting point.
    if (!showControls) return;
    const el = document.activeElement;
    if (el instanceof HTMLElement && containerRef.current?.contains(el)) return;
    const playBtn = containerRef.current?.querySelector<HTMLElement>('.omni-btn-main');
    playBtn?.focus({ preventScroll: true });
  }, [tvMode, showControls, isPlaying]);

  /* --------------------------- Derived UI flags ------------------------ */
  const loading = !isReady && !error;
  const showSpinner = isBuffering || (loading && !error);
  const showBigPlay = isReady && !isPlaying && !isBuffering && !error;

  const onVolume = useCallback((v: number) => setVolume(v), [setVolume]);

  const hint = gestureHint ? gestureHintLabel(gestureHint) : null;
  const badges = activeChannel
    ? {
        container: guessContainer(activeChannel.url),
        protection: activeChannel.drm ? 'Widevine' : 'Clear',
        maxRes: activeChannel.isLive ? 'LIVE' : 'HD',
      }
    : { container: '—', protection: '—', maxRes: '—' };

  return (
    <div
      ref={containerRef}
      className={`omni-container ${!showControls ? 'omni-idle' : ''} ${drawerOpen ? 'omni-drawer-open' : ''} ${tvMode ? 'tv-mode' : ''} ${reduceMotion ? 'reduced-motion' : ''} ${embed ? 'omni-embed' : ''}`}
      onMouseMove={flashControls}
      onMouseLeave={() => {
        if (usePlayerStore.getState().isPlaying && !overlaysOpenRef.current) setShowControls(false);
      }}
    >
      <video
        ref={videoRef}
        className="omni-video"
        playsInline
        style={{ filter: brightness !== 1 ? `brightness(${brightness})` : undefined }}
      />

      {/* Gesture / tap layer (desktop click + mobile touch) */}
      <div
        ref={tapLayerRef}
        className="omni-tap-layer"
        onClick={onTap}
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading / buffering */}
      {showSpinner && !error && <div className="omni-spinner" />}

      {/* Big center play */}
      {showBigPlay && (
        <button className="omni-big-play" onClick={togglePlay} aria-label="Play">
          <PlayIcon size={42} />
        </button>
      )}

      {/* Gesture indicator */}
      {hint && (
        <div className="omni-gesture-hint">
          <span className="omni-gesture-icon">{hint.icon}</span>
          <span className="omni-gesture-primary">{hint.primary}</span>
          {hint.secondary && <span className="omni-gesture-secondary">{hint.secondary}</span>}
        </div>
      )}

      {/* Center scrub controls */}
      <div className={`omni-center ${!showControls ? 'is-hidden' : ''}`}>
        <button className="omni-btn omni-btn-ghost" onClick={() => seekBy(-10)} aria-label="Rewind 10s">
          <RewindIcon size={30} />
        </button>
        <button className="omni-btn omni-btn-main" onClick={togglePlay} aria-label="Play / Pause">
          {isPlaying ? (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <PlayIcon size={34} />
          )}
        </button>
        <button className="omni-btn omni-btn-ghost" onClick={() => seekBy(10)} aria-label="Forward 10s">
          <ForwardIcon size={30} />
        </button>
      </div>

      {/* Controls overlay */}
      <div className={`omni-controls-wrapper ${!showControls && !drawerOpen ? 'hidden' : ''}`}>
        {/* Top bar */}
        <div className="omni-top-bar">
          {!embed && (
            <button className="omni-back-btn" onClick={exit} aria-label="Back">
              <ArrowLeftIcon size={22} />
            </button>
          )}
          <div className="omni-brand">
            <span className="omni-brand-mark">OMNI</span>
            <span className="omni-brand-stream">STREAM</span>
          </div>
          <div className="omni-title-block">
            <h2 className="omni-title">{effectiveTitle}</h2>
            <div className="omni-badges">
              <span className="omni-badge">{badges.container}</span>
              <span className={`omni-badge ${badges.protection === 'Widevine' ? 'omni-badge-warn' : 'omni-badge-ok'}`}>
                {badges.protection}
              </span>
              <span className={`omni-badge ${activeChannel?.isLive ? 'omni-badge-live' : ''}`}>
                {badges.maxRes}
              </span>
            </div>
          </div>
          <div className="omni-top-right">
            <CastButton />
          </div>
        </div>

        {/* Bottom bar */}
        <ControlBar
          onTogglePlay={togglePlay}
          onSeekToFraction={seekToFraction}
          onVolume={onVolume}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
          onToggleCaptions={toggleCaptions}
          onToggleDrawer={toggleDrawer}
          drawerOpen={drawerOpen}
          onToggleSettings={() => setSettingsOpen((o) => !o)}
          settingsOpen={settingsOpen}
          onToggleStats={() => {
            setStatsOpen((o) => !o);
            flashControls();
          }}
          statsOpen={statsOpen}
          onTogglePiP={togglePiP}
          onToggleHelp={() => setHelpOpen(true)}
        />
      </div>

      {/* IPTV drawer + EPG */}
      <IptvDrawer
        open={drawerOpen}
        onClose={() => usePlayerStore.getState().toggleDrawer(false)}
        onSelect={onSelectChannel}
      />

      {/* Settings menu */}
      <SettingsMenu open={settingsOpen} onClose={() => setSettingsOpen(false)} controller={controller} />

      {/* Stats */}
      <StatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />

      {/* Error overlay */}
      {error && (
        <div className="omni-error-overlay">
          <div className="omni-error-card omni-glass">
            <div className="omni-error-code">Error {String(error.code)}</div>
            <h3>{error.message}</h3>
            {error.hint && <p>{error.hint}</p>}
            <div className="omni-error-actions">
              <button className="omni-error-retry" onClick={bumpReload}>
                Retry
              </button>
              <button className="omni-error-back" onClick={exit}>
                Back to library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help / shortcuts */}
      {helpOpen && (
        <div className="omni-help-overlay" onClick={() => setHelpOpen(false)}>
          <div className="omni-help omni-glass" onClick={(e) => e.stopPropagation()}>
            <div className="omni-help-head">
              <h3>Shortcuts &amp; Gestures</h3>
              <button className="omni-help-close" onClick={() => setHelpOpen(false)}>
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="omni-help-grid">
              {SHORTCUTS.map(([key, desc]) => (
                <div className="omni-help-row" key={key}>
                  <kbd>{key}</kbd>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
            <div className="omni-help-touch">
              <strong>Touch</strong>
              <span>Double-tap sides · ±10s</span>
              <span>Swipe horizontal · seek</span>
              <span>Swipe right · volume</span>
              <span>Swipe left · brightness</span>
              <span>Long-press · 2× speed</span>
            </div>
          </div>
        </div>
      )}

      {/* subtle side gradients */}
      <div className="omni-scrim-top" />
      <div className="omni-scrim-bottom" />
    </div>
  );
}

