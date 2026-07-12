import { useRef, useState, useCallback, useEffect, useMemo, memo } from 'react';
import { usePlayerStore, hotState } from '../../store/playerStore';
import { useShakaPlayer } from '../../hooks/useShakaPlayer';
import { useTVDetection } from '../../hooks/useTVDetection';
import { getStreamType, getDrmLabel } from '../../utils/m3uParser';
import { formatTime, formatBitrate } from '../../utils/formatTime';
import {
  PlayV2, PauseV2, SkipBackV2, SkipForwardV2,
  SettingsV2, SubtitlesV2, BackV2, CloseV2, CheckV2,
  LiveV2, LockV2,
} from './IconsV2';
import { SplashOverlay } from './SplashOverlay';

// ── TV Progress ──
var TVProgress = memo(function TVProgress() {
  var t = usePlayerStore(function(s) { return s.displayTime; });
  var d = usePlayerStore(function(s) { return s.displayDuration; });
  var b = usePlayerStore(function(s) { return s.displayBuffered; });
  var frac = d > 0 ? t / d : 0;
  return (
    <div className="tv-progress">
      <div className="tv-progress-track">
        <div className="tv-progress-buffered" style={{ width: (b * 100) + '%' }} />
        <div className="tv-progress-fill" style={{ width: (frac * 100) + '%' }} />
      </div>
    </div>
  );
});

// ── TV Settings — side panel ──
var SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

var TVSettings = memo(function TVSettings({ onClose, controller }: {
  onClose: () => void;
  controller: ReturnType<typeof useShakaPlayer>;
}) {
  var qualities = usePlayerStore(function(s) { return s.qualities; });
  var qid = usePlayerStore(function(s) { return s.currentQualityId; });
  var abr = usePlayerStore(function(s) { return s.abrEnabled; });
  var rate = usePlayerStore(function(s) { return s.playbackRate; });
  var audioTracks = usePlayerStore(function(s) { return s.audioTracks; });
  var currentAudioLang = usePlayerStore(function(s) { return s.currentAudioLanguage; });
  var textTracks = usePlayerStore(function(s) { return s.textTracks; });
  var currentSubId = usePlayerStore(function(s) { return s.currentTextTrackId; });

  var showAudio = audioTracks.length >= 2;
  var showSubs = textTracks.length > 0;

  type Tab = 'quality' | 'speed' | 'audio' | 'subs';
  var tabs: { key: Tab; label: string }[] = [
    { key: 'quality', label: 'Quality' },
    { key: 'speed', label: 'Speed' },
  ];
  if (showAudio) tabs.push({ key: 'audio', label: 'Audio' });
  if (showSubs) tabs.push({ key: 'subs', label: 'Subtitles' });

  var [tab, setTab] = useState<Tab>('quality');
  var panelRef = useRef<HTMLDivElement>(null);
  var bodyRef = useRef<HTMLDivElement>(null);

  // Auto-focus first option when tab changes or panel opens
  useEffect(function() {
    var timer = setTimeout(function() {
      var el = bodyRef.current;
      if (!el) return;
      var first = el.querySelector('.tv-opt') as HTMLElement;
      if (first) first.focus({ preventScroll: true });
    }, 80);
    return function() { clearTimeout(timer); };
  }, [tab]);

  // Focus trap: capture Back/Escape inside settings
  useEffect(function() {
    var handler = function(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'XF86Back' || e.key === 'BrowserBack') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return function() { window.removeEventListener('keydown', handler, true); };
  }, [onClose]);

  return (
    <div className="tv-settings-overlay">
      <div className="tv-settings-backdrop" onClick={onClose} />
      <div className="tv-settings" ref={panelRef} onClick={function(e) { e.stopPropagation(); }}>
        <div className="tv-settings-head">
          <h2>Settings</h2>
          <button className="tv-close" onClick={onClose} tabIndex={0}>
            <CloseV2 size={22} />
          </button>
        </div>

        <div className="tv-settings-tabs">
          {tabs.map(function(t) {
            return (
              <button key={t.key}
                className={'tv-tab' + (tab === t.key ? ' active' : '')}
                onClick={function() { setTab(t.key); }}
                tabIndex={0}>
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="tv-settings-body" ref={bodyRef}>
          {tab === 'quality' && (
            <>
              <button className={'tv-opt' + (abr ? ' active' : '')}
                onClick={function() { controller.selectQuality(null); }} tabIndex={0}>
                <span>Auto</span>
                {abr && <CheckV2 size={18} />}
              </button>
              {qualities.map(function(q) {
                return (
                  <button key={q.id}
                    className={'tv-opt' + (!abr && qid === q.id ? ' active' : '')}
                    onClick={function() { controller.selectQuality(q.id); }} tabIndex={0}>
                    <span>{q.label}</span>
                    <span className="tv-opt-sub">{formatBitrate(q.bandwidth / 1000)}</span>
                    {!abr && qid === q.id && <CheckV2 size={18} />}
                  </button>
                );
              })}
            </>
          )}
          {tab === 'speed' && SPEEDS.map(function(s) {
            return (
              <button key={s}
                className={'tv-opt' + (rate === s ? ' active' : '')}
                onClick={function() { usePlayerStore.getState().setPlaybackRate(s); }} tabIndex={0}>
                <span>{s === 1 ? 'Normal' : s + '×'}</span>
                {rate === s && <CheckV2 size={18} />}
              </button>
            );
          })}
          {tab === 'audio' && audioTracks.map(function(t) {
            return (
              <button key={t.id}
                className={'tv-opt' + (currentAudioLang === t.language ? ' active' : '')}
                onClick={function() { controller.selectAudioLanguage(t.language); }} tabIndex={0}>
                <span>{t.label}</span>
                {currentAudioLang === t.language && <CheckV2 size={18} />}
              </button>
            );
          })}
          {tab === 'subs' && (
            <>
              <button className={'tv-opt' + (currentSubId === null ? ' active' : '')}
                onClick={function() { controller.selectTextTrack(null); }} tabIndex={0}>
                <span>Off</span>
                {currentSubId === null && <CheckV2 size={18} />}
              </button>
              {textTracks.map(function(t) {
                return (
                  <button key={t.id}
                    className={'tv-opt' + (currentSubId === t.id ? ' active' : '')}
                    onClick={function() { controller.selectTextTrack(t.id); }} tabIndex={0}>
                    <span>{t.label}</span>
                    {currentSubId === t.id && <CheckV2 size={18} />}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════
// Main TV Player
// ══════════════════════════════════════════
export var PlayerTV = memo(function PlayerTV({ onExit }: { onExit: () => void }) {
  var videoRef = useRef<HTMLVideoElement>(null);
  var containerRef = useRef<HTMLDivElement>(null);
  var idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  var settingsRef = useRef(false);
  var playBtnRef = useRef<HTMLButtonElement>(null);

  var [retry, setRetry] = useState(0);
  var [settings, setSettings] = useState(false);
  settingsRef.current = settings;

  // Force TV mode + register Tizen remote keys
  useTVDetection();
  useEffect(function() {
    usePlayerStore.getState().setTvMode(true);
    usePlayerStore.getState().setReduceMotion(true);

    // Samsung Tizen: register remote keys (required to receive events)
    try {
      var tizen = (window as any).tizen;
      if (tizen && tizen.tvinputdevice) {
        var keysToRegister = [
          'MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop',
          'MediaFastForward', 'MediaRewind', 'MediaRecord',
          'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
          'ChannelUp', 'ChannelDown', 'ChannelList',
          'VolumeUp', 'VolumeDown', 'VolumeMute',
          'Info', 'Guide', 'Exit', 'Caption', 'Search', 'Menu', 'Source',
          'MediaTrackNext', 'MediaTrackPrevious', 'Minus', 'PreviousChannel',
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        ];
        try { tizen.tvinputdevice.registerKeyBatch(keysToRegister); }
        catch (e2) {
          // Fallback: register one by one
          for (var i = 0; i < keysToRegister.length; i++) {
            try { tizen.tvinputdevice.registerKey(keysToRegister[i]); } catch (e3) { /* skip */ }
          }
        }
      }
    } catch (e) { /* not Tizen */ }
  }, []);

  var channels = usePlayerStore(function(s) { return s.iptvChannels; });
  var chId = usePlayerStore(function(s) { return s.activeChannelId; });
  var ch = useMemo(function() {
    return channels.find(function(c) { return c.id === chId; }) || null;
  }, [channels, chId]);

  var url = ch ? ch.url : '';
  var controller = useShakaPlayer(videoRef, url, ch ? ch.drm : undefined, retry, ch ? ch.headers : undefined);

  var playing = usePlayerStore(function(s) { return s.isPlaying; });
  var ready = usePlayerStore(function(s) { return s.isReady; });
  var buffering = usePlayerStore(function(s) { return s.isBuffering; });
  var controls = usePlayerStore(function(s) { return s.showControls; });
  var error = usePlayerStore(function(s) { return s.error; });
  var displayTime = usePlayerStore(function(s) { return s.displayTime; });
  var displayDur = usePlayerStore(function(s) { return s.displayDuration; });
  var hasSubs = usePlayerStore(function(s) { return s.textTracks.length > 0; });
  var captions = usePlayerStore(function(s) { return s.captionsEnabled; });

  // ── Show controls + auto-focus play button ──
  var show = useCallback(function() {
    usePlayerStore.getState().setShowControls(true);
    if (idleRef.current) clearTimeout(idleRef.current);

    // Auto-focus play button when controls appear
    setTimeout(function() {
      if (!settingsRef.current && playBtnRef.current) {
        playBtnRef.current.focus({ preventScroll: true });
      }
    }, 50);

    idleRef.current = setTimeout(function() {
      if (usePlayerStore.getState().isPlaying && !settingsRef.current) {
        usePlayerStore.getState().setShowControls(false);
      }
    }, 6000);
  }, []);

  var togglePlay = useCallback(function() {
    var v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(function() {}); } else { v.pause(); }
  }, []);

  var seekBy = useCallback(function(s: number) {
    var v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + s));
    hotState.currentTime = v.currentTime;
    usePlayerStore.getState().pushTimeToUI();
  }, []);

  var toggleCap = useCallback(function() {
    controller.toggleCaptions(!usePlayerStore.getState().captionsEnabled);
  }, [controller]);

  useEffect(function() { show(); }, [playing]);

  // ── TV Remote: single keyboard handler ──
  var actRef = useRef<any>({});
  actRef.current = {
    togglePlay: togglePlay, seekBy: seekBy, toggleCap: toggleCap,
    onExit: onExit, show: show, setSettings: setSettings,
  };

  // ══════════════════════════════════════════════════════════════
  // TV Remote — Complete key handler
  // Supports: event.key (W3C) + event.keyCode (Samsung Tizen / LG webOS legacy)
  //
  // Samsung Tizen keyCode reference:
  //   10009=Back, 10252=PlayPause, 415=Play, 19=Pause, 413=Stop
  //   417=FF, 412=Rewind, 427=ChUp, 428=ChDown
  //   403=Red, 404=Green, 405=Yellow, 406=Blue
  //   447=VolUp, 448=VolDown, 449=VolMute
  //   10182=Exit, 457=Info/Menu, 458=Guide
  //
  // LG webOS keyCode reference:
  //   461=Back, 415=Play, 19=Pause, 413=Stop
  //   417=FF, 412=Rewind, 33=Play, 34=Pause
  //   427=ChUp, 428=ChDown
  //   403=Red(Blue), 404=Green, 405=Yellow, 406=Blue(Red)
  //
  // Android TV / Fire TV: standard KeyboardEvent.key values
  // Xbox / PlayStation: standard KeyboardEvent.key values
  // ══════════════════════════════════════════════════════════════
  useEffect(function() {
    var handler = function(e: KeyboardEvent) {
      var a = actRef.current;
      var st = usePlayerStore.getState();
      var key = e.key;
      var kc = e.keyCode;

      // ── Settings open — only handle play + back ──
      if (settingsRef.current) {
        if (key === ' ' || kc === 10252 || kc === 415) { a.togglePlay(); e.preventDefault(); }
        return;
      }

      // ── BACK: Escape / GoBack / Tizen 10009 / webOS 461 / XF86Back ──
      if (key === 'Escape' || key === 'GoBack' || key === 'XF86Back' || key === 'BrowserBack'
          || kc === 10009    // Samsung Tizen Back
          || kc === 461      // LG webOS Back
          || kc === 10182    // Samsung Exit
          || kc === 27       // standard Escape
      ) {
        a.onExit(); e.preventDefault(); return;
      }

      // ── Controls hidden — ANY key press shows controls ──
      if (!st.showControls) {
        a.show(); e.preventDefault(); return;
      }

      // ── ENTER / OK — click focused button or toggle play ──
      if (key === 'Enter' || kc === 13) {
        if (document.activeElement instanceof HTMLButtonElement) return; // spatial nav handles click
        a.togglePlay(); e.preventDefault(); a.show(); return;
      }

      // ── D-PAD LEFT / RIGHT — navigate control bar buttons ──
      if (key === 'ArrowLeft' || key === 'ArrowRight' || kc === 37 || kc === 39) {
        var isRight = key === 'ArrowRight' || kc === 39;
        var focused = document.activeElement;
        if (focused instanceof HTMLButtonElement && containerRef.current) {
          var btns = Array.from(
            containerRef.current.querySelectorAll('.tv-ctrl-bar button:not([disabled])')
          ) as HTMLElement[];
          var idx = btns.indexOf(focused as HTMLElement);
          if (idx >= 0) {
            var ni = isRight ? Math.min(idx + 1, btns.length - 1) : Math.max(idx - 1, 0);
            btns[ni].focus({ preventScroll: true });
            e.preventDefault(); a.show(); return;
          }
        }
        a.seekBy(isRight ? 10 : -10); e.preventDefault(); a.show(); return;
      }

      // ── D-PAD UP / DOWN — volume ──
      if (key === 'ArrowUp' || kc === 38) { st.setVolume(Math.min(1, st.volume + 0.1)); e.preventDefault(); a.show(); return; }
      if (key === 'ArrowDown' || kc === 40) { st.setVolume(Math.max(0, st.volume - 0.1)); e.preventDefault(); a.show(); return; }

      // ── PLAY / PAUSE ──
      if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === ' '
          || kc === 10252   // Tizen PlayPause
          || kc === 415     // Tizen/webOS Play
          || kc === 33      // webOS Play (alt)
          || kc === 32      // Space
      ) {
        a.togglePlay(); e.preventDefault(); a.show(); return;
      }

      // ── PAUSE ──
      if (key === 'MediaPause'
          || kc === 19      // Tizen/webOS Pause
          || kc === 34      // webOS Pause (alt)
      ) {
        var vid = videoRef.current; if (vid) vid.pause(); e.preventDefault(); a.show(); return;
      }

      // ── STOP ──
      if (key === 'MediaStop' || kc === 413) {
        var vid2 = videoRef.current; if (vid2) vid2.pause(); e.preventDefault(); return;
      }

      // ── FAST FORWARD ──
      if (key === 'MediaFastForward' || key === 'MediaTrackNext'
          || kc === 417     // Tizen/webOS FF
          || kc === 228     // Android TV FF
      ) {
        a.seekBy(30); e.preventDefault(); a.show(); return;
      }

      // ── REWIND ──
      if (key === 'MediaRewind' || key === 'MediaTrackPrevious'
          || kc === 412     // Tizen/webOS Rewind
          || kc === 227     // Android TV Rewind
      ) {
        a.seekBy(-30); e.preventDefault(); a.show(); return;
      }

      // ── CHANNEL UP / DOWN ──
      if (key === 'ChannelUp' || key === 'ChannelDown' || kc === 427 || kc === 428) {
        var isUp = key === 'ChannelUp' || kc === 427;
        var chs = st.iptvChannels;
        if (chs.length > 1) {
          var ci = chs.findIndex(function(c) { return c.id === st.activeChannelId; });
          var delta = isUp ? -1 : 1;
          var nextCh = (ci + delta + chs.length) % chs.length;
          st.selectChannel(chs[nextCh].id);
        }
        e.preventDefault(); return;
      }

      // ── VOLUME UP / DOWN / MUTE (Samsung/LG remotes) ──
      if (kc === 447) { st.setVolume(Math.min(1, st.volume + 0.1)); e.preventDefault(); a.show(); return; }  // Tizen VolUp
      if (kc === 448) { st.setVolume(Math.max(0, st.volume - 0.1)); e.preventDefault(); a.show(); return; }  // Tizen VolDown
      if (kc === 449) { st.toggleMute(); e.preventDefault(); a.show(); return; }  // Tizen VolMute

      // ── COLOR BUTTONS (Samsung / LG remotes) ──
      if (key === 'ColorF0Red' || kc === 403) {
        // Red = toggle subtitles
        a.toggleCap(); e.preventDefault(); a.show(); return;
      }
      if (key === 'ColorF1Green' || kc === 404) {
        // Green = toggle settings
        a.setSettings(function(v: boolean) { return !v; }); e.preventDefault(); a.show(); return;
      }
      if (key === 'ColorF2Yellow' || kc === 405) {
        // Yellow = toggle play/pause (alt)
        a.togglePlay(); e.preventDefault(); a.show(); return;
      }
      if (key === 'ColorF3Blue' || kc === 406) {
        // Blue = info / show controls
        a.show(); e.preventDefault(); return;
      }

      // ── INFO / GUIDE (Samsung/LG) ──
      if (kc === 457 || kc === 458) {
        // Info or Guide button — show controls
        a.show(); e.preventDefault(); return;
      }

      // ── MUTE — standard keyCode 173, or AudioVolumeMute ──
      if (key === 'AudioVolumeMute' || kc === 173 || kc === 449) {
        st.toggleMute(); e.preventDefault(); a.show(); return;
      }

      // ── VOLUME keys via standard key names (Android TV / generic remotes) ──
      if (key === 'AudioVolumeUp' || kc === 175 || kc === 447) {
        st.setVolume(Math.min(1, st.volume + 0.1)); e.preventDefault(); a.show(); return;
      }
      if (key === 'AudioVolumeDown' || kc === 174 || kc === 448) {
        st.setVolume(Math.max(0, st.volume - 0.1)); e.preventDefault(); a.show(); return;
      }

      // ── MENU button — open/close settings ──
      // Generic remote Menu (keyCode 82 Android, 93 context menu)
      if (key === 'ContextMenu' || key === 'Menu' || kc === 93 || kc === 82 || kc === 457) {
        a.setSettings(function(v: boolean) { return !v; }); e.preventDefault(); a.show(); return;
      }

      // ── SOURCE / INPUT — treat as back (no input switching in player) ──
      if (key === 'LaunchApplication1' || kc === 10072) {
        a.onExit(); e.preventDefault(); return;
      }

      // ── NUMBER KEYS 0-9 — seek to percentage ──
      if (kc >= 48 && kc <= 57) {
        var pct = (kc - 48) / 10;
        var vid3 = videoRef.current;
        if (vid3 && Number.isFinite(vid3.duration)) {
          vid3.currentTime = pct * vid3.duration;
          hotState.currentTime = vid3.currentTime;
          st.pushTimeToUI();
        }
        e.preventDefault(); a.show(); return;
      }

      // ── Fallback: any other key shows controls ──
      a.show();
    };

    // Register on both keydown phases to catch all TV browsers
    window.addEventListener('keydown', handler);
    return function() { window.removeEventListener('keydown', handler); };
  }, []);

  var loading = buffering || (!ready && !error);
  var isLive = !Number.isFinite(displayDur) || (ch ? ch.isLive : false);
  var drmLabel = getDrmLabel(ch ? ch.drm : undefined);
  var containerType = ch ? getStreamType(ch.url) : '';

  return (
    <div ref={containerRef} className={'tv-player' + (controls ? '' : ' tv-idle')}>
      <video ref={videoRef} className="tv-video" playsInline />
      <div className="tv-tap" onClick={show} />

      {/* Splash — channel intro with logo */}
      <SplashOverlay
        visible={loading && !error}
        name={ch ? ch.name : 'Loading...'}
        logo={ch ? ch.logo : undefined}
        glyph={ch ? ch.glyph : undefined}
        gradient={ch ? ch.gradient : undefined}
        isLive={ch ? ch.isLive : false}
      />

      {/* ── Top info (no interactive elements — just info) ── */}
      <div className={'tv-top' + (controls ? '' : ' tv-hidden')}>
        <div className="tv-top-info">
          <span className="tv-title">{ch ? ch.name : 'OmniStream'}</span>
          <div className="tv-meta">
            {isLive && <span className="tv-live"><LiveV2 size={12} /> LIVE</span>}
            {containerType && <span className="tv-tag">{containerType}</span>}
            {drmLabel !== 'Clear' && <span className="tv-tag tv-tag-drm"><LockV2 size={10} /> {drmLabel}</span>}
          </div>
        </div>
        <div className="tv-brand">
          <span className="tv-brand-o">O</span>mniStream
          <span className="tv-badge-tv">TV</span>
        </div>
      </div>

      {/* ── Bottom: TV leanback controls ── */}
      <div className={'tv-bottom' + (controls ? '' : ' tv-hidden')}>
        {/* Progress + time row */}
        <div className="tv-progress-section">
          <span className="tv-time-current">{formatTime(displayTime)}</span>
          <TVProgress />
          <span className="tv-time-total">
            {Number.isFinite(displayDur) ? formatTime(displayDur) : 'LIVE'}
          </span>
        </div>

        {/* Main control bar */}
        <div className="tv-ctrl-bar">
          {/* Left: Back */}
          <button className="tv-btn tv-btn-pill" onClick={onExit} tabIndex={0}>
            <BackV2 size={20} />
            <span>Back</span>
          </button>

          {/* Center cluster: seek + play */}
          <div className="tv-ctrl-center">
            <button className="tv-btn tv-btn-round" onClick={function() { seekBy(-10); }} tabIndex={0}>
              <SkipBackV2 size={28} />
            </button>
            <button ref={playBtnRef} className="tv-btn tv-btn-play" onClick={togglePlay} tabIndex={0}>
              {playing ? <PauseV2 size={36} /> : <PlayV2 size={36} />}
            </button>
            <button className="tv-btn tv-btn-round" onClick={function() { seekBy(10); }} tabIndex={0}>
              <SkipForwardV2 size={28} />
            </button>
          </div>

          {/* Right: actions */}
          <div className="tv-ctrl-right">
            {hasSubs && (
              <button className={'tv-btn tv-btn-pill' + (captions ? ' tv-active' : '')}
                onClick={toggleCap} tabIndex={0}>
                <SubtitlesV2 size={18} />
                <span>CC</span>
              </button>
            )}
            <button className={'tv-btn tv-btn-pill' + (settings ? ' tv-active' : '')}
              onClick={function() { setSettings(function(v) { return !v; }); }} tabIndex={0}>
              <SettingsV2 size={18} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Remote hints */}
        <div className="tv-hints">
          <span>◀ ▶ Navigate</span>
          <span>OK Select</span>
          <span>▲▼ Volume</span>
          <span>CH± Channel</span>
          <span>0-9 Seek</span>
          <span>MENU Settings</span>
        </div>
      </div>

      {settings && <TVSettings onClose={function() { setSettings(false); }} controller={controller} />}

      {error && (
        <div className="tv-error">
          <div className="tv-error-card">
            <div className="tv-error-code">Error {String(error.code)}</div>
            <h3>{error.message}</h3>
            {error.hint && <p>{error.hint}</p>}
            <div className="tv-error-btns">
              <button onClick={function() { setRetry(function(k) { return k + 1; }); }} tabIndex={0}>Retry</button>
              <button onClick={onExit} tabIndex={0}>Back</button>
            </div>
          </div>
        </div>
      )}

      <div className="tv-scrim-top" />
      <div className="tv-scrim-bottom" />
    </div>
  );
});
