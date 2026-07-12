import { useRef, useState, useCallback, useEffect, useMemo, memo } from 'react';
import { usePlayerStore, hotState } from '../../store/playerStore';
import { useShakaPlayer } from '../../hooks/useShakaPlayer';
import { useGestures } from '../../hooks/useGestures';
import { getStreamType, getDrmLabel } from '../../utils/m3uParser';
import { formatTime, formatBitrate } from '../../utils/formatTime';

import {
  PlayV2, PauseV2, SkipBackV2, SkipForwardV2,
  VolumeV2, VolumeLowV2, VolumeMuteV2,
  FullscreenV2, FullscreenExitV2, SettingsV2,
  SubtitlesV2, PipV2, BackV2, CloseV2, CheckV2,
  LiveV2, LockV2,
} from './IconsV2';
import { SplashOverlay } from './SplashOverlay';

// ── Progress ──
const ProgressV2 = memo(({ onSeek }: { onSeek: (f: number) => void }) => {
  const t = usePlayerStore((s) => s.displayTime);
  const d = usePlayerStore((s) => s.displayDuration);
  const b = usePlayerStore((s) => s.displayBuffered);
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);

  const frac = d > 0 ? t / d : 0;
  const show = drag ?? frac;

  const getF = (x: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (x - r.left) / r.width));
  };

  return (
    <div ref={ref} className="v2-progress"
      onMouseMove={(e) => setHover(getF(e.clientX))}
      onMouseLeave={() => { if (drag === null) setHover(null); }}
      onMouseDown={(e) => {
        e.preventDefault();
        const f = getF(e.clientX);
        setDrag(f);
        const onMove = (ev: MouseEvent) => setDrag(getF(ev.clientX));
        const onUp = (ev: MouseEvent) => {
          onSeek(getF(ev.clientX));
          setDrag(null);
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      }}
    >
      <div className="v2-progress-track">
        <div className="v2-progress-buffered" style={{ width: `${b * 100}%` }} />
        <div className="v2-progress-fill" style={{ width: `${show * 100}%` }} />
        <div className="v2-progress-knob" style={{ left: `${show * 100}%` }} />
      </div>
      {hover !== null && d > 0 && (
        <div className="v2-progress-tip" style={{ left: `${hover * 100}%` }}>{formatTime(hover * d)}</div>
      )}
    </div>
  );
});

// ── Settings panel with dynamic tabs ──
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
type SettingsTab = 'quality' | 'speed' | 'audio' | 'subs';

const SettingsPanelV2 = memo(({ onClose, controller }: {
  onClose: () => void;
  controller: ReturnType<typeof useShakaPlayer>;
}) => {
  const qualities = usePlayerStore((s) => s.qualities);
  const qid = usePlayerStore((s) => s.currentQualityId);
  const abr = usePlayerStore((s) => s.abrEnabled);
  const rate = usePlayerStore((s) => s.playbackRate);
  const audioTracks = usePlayerStore((s) => s.audioTracks);
  const currentAudioLang = usePlayerStore((s) => s.currentAudioLanguage);
  const textTracks = usePlayerStore((s) => s.textTracks);
  const currentSubId = usePlayerStore((s) => s.currentTextTrackId);

  // Only show audio tab if 2+ tracks, subs tab if any tracks exist
  const showAudio = audioTracks.length >= 2;
  const showSubs = textTracks.length > 0;

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'quality', label: 'Quality' },
    { key: 'speed', label: 'Speed' },
  ];
  if (showAudio) tabs.push({ key: 'audio', label: 'Audio' });
  if (showSubs) tabs.push({ key: 'subs', label: 'Subtitles' });

  const [tab, setTab] = useState<SettingsTab>('quality');

  return (
    <div className="v2-settings" onClick={(e) => e.stopPropagation()}>
      <div className="v2-settings-header">
        {tabs.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
        <button className="v2-settings-x" onClick={onClose}><CloseV2 size={14} /></button>
      </div>
      <div className="v2-settings-body">
        {tab === 'quality' && (
          <>
            <button className={`v2-opt ${abr ? 'active' : ''}`} onClick={() => controller.selectQuality(null)}>
              Auto {abr && <CheckV2 size={14} />}
            </button>
            {qualities.map((q) => (
              <button key={q.id} className={`v2-opt ${!abr && qid === q.id ? 'active' : ''}`}
                onClick={() => controller.selectQuality(q.id)}>
                {q.label} <span className="v2-opt-sub">{formatBitrate(q.bandwidth / 1000)}</span>
                {!abr && qid === q.id && <CheckV2 size={14} />}
              </button>
            ))}
          </>
        )}
        {tab === 'speed' && SPEEDS.map((s) => (
          <button key={s} className={`v2-opt ${rate === s ? 'active' : ''}`}
            onClick={() => usePlayerStore.getState().setPlaybackRate(s)}>
            {s === 1 ? 'Normal' : `${s}×`} {rate === s && <CheckV2 size={14} />}
          </button>
        ))}
        {tab === 'audio' && audioTracks.map((t) => (
          <button key={t.id} className={`v2-opt ${currentAudioLang === t.language ? 'active' : ''}`}
            onClick={() => controller.selectAudioLanguage(t.language)}>
            {t.label} {currentAudioLang === t.language && <CheckV2 size={14} />}
          </button>
        ))}
        {tab === 'subs' && (
          <>
            <button className={`v2-opt ${currentSubId === null ? 'active' : ''}`}
              onClick={() => controller.selectTextTrack(null)}>
              Off {currentSubId === null && <CheckV2 size={14} />}
            </button>
            {textTracks.map((t) => (
              <button key={t.id} className={`v2-opt ${currentSubId === t.id ? 'active' : ''}`}
                onClick={() => controller.selectTextTrack(t.id)}>
                {t.label} {currentSubId === t.id && <CheckV2 size={14} />}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
});

// ── Main V2 Player ──
export const PlayerV2 = memo(({ onExit }: { onExit: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tapRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(false);

  const [retry, setRetry] = useState(0);
  const [settings, setSettings] = useState(false);
  settingsRef.current = settings;

  const channels = usePlayerStore((s) => s.iptvChannels);
  const chId = usePlayerStore((s) => s.activeChannelId);
  const ch = useMemo(() => channels.find((c) => c.id === chId) ?? null, [channels, chId]);

  const url = ch?.url ?? '';
  const controller = useShakaPlayer(videoRef, url, ch?.drm, retry, ch?.headers);

  const playing = usePlayerStore((s) => s.isPlaying);
  const ready = usePlayerStore((s) => s.isReady);
  const buffering = usePlayerStore((s) => s.isBuffering);
  const controls = usePlayerStore((s) => s.showControls);
  const error = usePlayerStore((s) => s.error);
  const brightness = usePlayerStore((s) => s.brightness);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.isMuted);
  const fullscreen = usePlayerStore((s) => s.isFullscreen);
  const captions = usePlayerStore((s) => s.captionsEnabled);
  const displayTime = usePlayerStore((s) => s.displayTime);
  const displayDur = usePlayerStore((s) => s.displayDuration);

  // Dynamic visibility — only show if stream actually has these tracks
  const hasSubs = usePlayerStore((s) => s.textTracks.length > 0);

  useGestures(tapRef, videoRef);

  const show = useCallback(() => {
    usePlayerStore.getState().setShowControls(true);
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      if (usePlayerStore.getState().isPlaying && !settingsRef.current) {
        usePlayerStore.getState().setShowControls(false);
      }
    }, 3500);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  }, []);

  const seek = useCallback((f: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = f * v.duration;
    hotState.currentTime = v.currentTime;
    usePlayerStore.getState().pushTimeToUI();
  }, []);

  const seekBy = useCallback((s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + s));
    hotState.currentTime = v.currentTime;
    usePlayerStore.getState().pushTimeToUI();
  }, []);

  const toggleFS = useCallback(() => {
    try {
      document.fullscreenElement ? document.exitFullscreen?.() : containerRef.current?.requestFullscreen?.();
    } catch {}
  }, []);

  const togglePiP = useCallback(async () => {
    try {
      document.pictureInPictureElement
        ? await document.exitPictureInPicture()
        : await videoRef.current?.requestPictureInPicture();
    } catch {}
  }, []);

  const toggleCap = useCallback(() => {
    controller.toggleCaptions(!usePlayerStore.getState().captionsEnabled);
  }, [controller]);

  useEffect(() => {
    const h = () => usePlayerStore.getState().setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  useEffect(() => { show(); }, [playing]);

  // Keyboard — stable via ref
  const actRef = useRef<any>({});
  actRef.current = { togglePlay, seekBy, seek, toggleFS, toggleCap, onExit, show, setSettings };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const a = actRef.current;
      const st = usePlayerStore.getState();
      switch (e.key) {
        case ' ': case 'k': case 'K': a.togglePlay(); e.preventDefault(); break;
        case 'ArrowLeft': a.seekBy(-5); break;
        case 'ArrowRight': a.seekBy(5); break;
        case 'ArrowUp': st.setVolume(Math.min(1, st.volume + 0.1)); e.preventDefault(); break;
        case 'ArrowDown': st.setVolume(Math.max(0, st.volume - 0.1)); e.preventDefault(); break;
        case 'j': case 'J': a.seekBy(-10); break;
        case 'l': case 'L': a.seekBy(10); break;
        case 'm': case 'M': st.toggleMute(); break;
        case 'f': case 'F': a.toggleFS(); break;
        case 'c': case 'C': a.toggleCap(); break;
        case 'Escape':
          if (settingsRef.current) { a.setSettings(false); break; }
          a.onExit(); return;
        default:
          if (e.key >= '0' && e.key <= '9') { a.seek(parseInt(e.key) / 10); break; }
          return;
      }
      a.show();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const loading = buffering || (!ready && !error);
  const isLive = !Number.isFinite(displayDur) || (ch?.isLive ?? false);
  const drmLabel = getDrmLabel(ch?.drm);
  const containerType = ch ? getStreamType(ch.url) : '';

  // Volume icon based on level
  const VolIcon = muted || volume === 0 ? VolumeMuteV2 : volume < 0.5 ? VolumeLowV2 : VolumeV2;

  return (
    <div ref={containerRef} className={`v2-player ${controls ? '' : 'v2-idle'}`}
      onMouseMove={show}
      onMouseLeave={() => { if (playing && !settings) usePlayerStore.getState().setShowControls(false); }}
    >
      <video ref={videoRef} className="v2-video" playsInline
        style={brightness !== 1 ? { filter: `brightness(${brightness})` } : undefined} />

      <div ref={tapRef} className="v2-tap"
        onClick={() => { show(); togglePlay(); }}
        onDoubleClick={toggleFS} />

      {/* Splash — channel intro with logo */}
      <SplashOverlay
        visible={loading && !error}
        name={ch?.name ?? 'Loading...'}
        logo={ch?.logo}
        glyph={ch?.glyph}
        gradient={ch?.gradient}
        isLive={ch?.isLive}
      />

      {ready && !playing && !buffering && !error && (
        <button className="v2-bigplay" onClick={togglePlay}><PlayV2 size={44} /></button>
      )}

      {/* ── Top ── */}
      <div className={`v2-top ${controls ? '' : 'v2-hidden'}`}>
        <button className="v2-btn-icon" onClick={onExit}><BackV2 size={20} /></button>
        <div className="v2-top-info">
          <span className="v2-title">{ch?.name ?? 'OmniStream'}</span>
          <div className="v2-meta">
            {isLive && <span className="v2-live"><LiveV2 size={11} /> LIVE</span>}
            {containerType && <span className="v2-tag">{containerType}</span>}
            {drmLabel !== 'Clear' && <span className="v2-tag v2-tag-drm"><LockV2 size={9} /> {drmLabel}</span>}
          </div>
        </div>
        <div className="v2-top-brand">
          <span className="v2-brand-o">O</span><span className="v2-brand-rest">mniStream</span>
          <span className="v2-beta">v2</span>
        </div>
      </div>

      {/* ── Bottom ── */}
      <div className={`v2-bottom ${controls ? '' : 'v2-hidden'}`}>
        <ProgressV2 onSeek={seek} />

        <div className="v2-bar">
          <div className="v2-bar-left">
            <button className="v2-btn-icon" onClick={togglePlay}>
              {playing ? <PauseV2 size={22} /> : <PlayV2 size={22} />}
            </button>
            <button className="v2-btn-icon" onClick={() => seekBy(-10)}><SkipBackV2 size={22} /></button>
            <button className="v2-btn-icon" onClick={() => seekBy(10)}><SkipForwardV2 size={22} /></button>

            <div className="v2-vol-group">
              <button className="v2-btn-icon" onClick={() => usePlayerStore.getState().toggleMute()}>
                <VolIcon size={20} />
              </button>
              <input type="range" className="v2-vol-slider" min="0" max="1" step="0.01"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  usePlayerStore.getState().setVolume(v);
                  if (v > 0 && muted) usePlayerStore.getState().toggleMute();
                }} />
            </div>

            <span className="v2-time">
              {formatTime(displayTime)}
              {Number.isFinite(displayDur) && <span className="v2-time-sep"> / {formatTime(displayDur)}</span>}
            </span>
          </div>

          <div className="v2-bar-right">
            {/* Subtitles — only visible if stream has subs */}
            {hasSubs && (
              <button className={`v2-btn-icon ${captions ? 'v2-active' : ''}`} onClick={toggleCap} title="Subtitles (C)">
                <SubtitlesV2 size={20} />
              </button>
            )}
            <button className={`v2-btn-icon ${settings ? 'v2-active' : ''}`}
              onClick={() => setSettings((v) => !v)} title="Settings">
              <SettingsV2 size={20} />
            </button>
            <button className="v2-btn-icon" onClick={togglePiP} title="Mini player">
              <PipV2 size={20} />
            </button>
            <button className="v2-btn-icon" onClick={toggleFS} title="Fullscreen (F)">
              {fullscreen ? <FullscreenExitV2 size={20} /> : <FullscreenV2 size={20} />}
            </button>
          </div>
        </div>
      </div>

      {settings && <SettingsPanelV2 onClose={() => setSettings(false)} controller={controller} />}

      {error && (
        <div className="v2-error">
          <div className="v2-error-card">
            <div className="v2-error-code">Error {String(error.code)}</div>
            <h3>{error.message}</h3>
            {error.hint && <p>{error.hint}</p>}
            <div className="v2-error-btns">
              <button onClick={() => setRetry((k) => k + 1)}>Retry</button>
              <button onClick={onExit}>Back</button>
            </div>
          </div>
        </div>
      )}

      <div className="v2-scrim-top" />
      <div className="v2-scrim-bottom" />
    </div>
  );
});
