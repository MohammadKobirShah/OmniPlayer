import { useEffect, useMemo, useRef } from 'react';
import shaka from 'shaka-player';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../store/playerStore';
import { qualityLabel } from '../lib/format';
import type { DrmConfig } from '../lib/streams';
import {
  resolveProxiedRequest,
  needsProxy as headersNeedProxy,
  isProxyConfigured,
} from '../lib/proxy';

/* shaka's compiled stats object – treated loosely for ergonomics. */
type ShakaStats = {
  width?: number;
  height?: number;
  streamBandwidth?: number;
  estimatedBandwidth?: number;
  bufferedAhead?: number;
  droppedFrames?: number;
  decodedFrames?: number;
  completionPercent?: number;
  playTime?: number;
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  'pt-BR': 'Português (BR)',
  pt: 'Português',
  ru: 'Русский',
  ar: 'العربية',
  hi: 'हिन्दी',
  zh: '中文',
  mul: 'Multiple',
  und: 'Unknown',
};

function languageName(code: string): string {
  if (!code) return 'Unknown';
  return LANGUAGE_NAMES[code] || code.toUpperCase();
}

function bufferedAheadFromVideo(video: HTMLVideoElement): number {
  try {
    for (let i = 0; i < video.buffered.length; i++) {
      const start = video.buffered.start(i);
      const end = video.buffered.end(i);
      if (video.currentTime >= start && video.currentTime <= end) {
        return Math.max(0, end - video.currentTime);
      }
    }
  } catch {
    /* buffered not yet available */
  }
  return 0;
}

/** Imperative API surface returned to the UI for track / quality control. */
export interface ShakaController {
  selectQuality: (id: number | null) => void;
  selectAudioLanguage: (lang: string) => void;
  selectTextTrack: (id: number | null) => void;
  toggleCaptions: (on: boolean) => void;
}

export function useShakaPlayer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  manifestUri: string,
  drmConfig?: DrmConfig,
  reloadKey = 0,
  httpHeaders?: Record<string, string>,
): ShakaController {
  const playerRef = useRef<shaka.Player | null>(null);
  const headersKey = httpHeaders ? JSON.stringify(httpHeaders) : '';
  const needsProxy = headersNeedProxy(httpHeaders);
  const proxyReady = isProxyConfigured();

  const store = usePlayerStore(
    useShallow((s) => ({
      setPlaying: s.setPlaying,
      setCurrentTime: s.setCurrentTime,
      setDuration: s.setDuration,
      setBuffering: s.setBuffering,
      setReady: s.setReady,
      setStats: s.setStats,
      setQualities: s.setQualities,
      setAudioTracks: s.setAudioTracks,
      setTextTracks: s.setTextTracks,
      setCurrentQualityId: s.setCurrentQualityId,
      setCurrentAudioLanguage: s.setCurrentAudioLanguage,
      setCurrentTextId: s.setCurrentTextId,
      setAbrEnabled: s.setAbrEnabled,
      setCaptions: s.setCaptions,
      setError: s.setError,
      resetPlayback: s.resetPlayback,
      volume: s.volume,
      isMuted: s.isMuted,
      playbackRate: s.playbackRate,
    })),
  );

  /* ----------------------- Engine init / teardown ----------------------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !manifestUri) return;

    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
      store.setError({
        code: 'UNSUPPORTED',
        severity: 'critical',
        message: 'This browser is not supported by the Shaka engine.',
        hint: 'Try the latest Chrome, Edge or Firefox.',
      });
      return;
    }

    let cancelled = false;
    let player: shaka.Player | null = null;
    let statsTimer: ReturnType<typeof setInterval> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshTracks = (p: shaka.Player) => {
      const variants: any[] = (p as any).getVariantTracks?.() ?? [];

      // Qualities – one entry per unique height (highest bandwidth wins).
      const byHeight = new Map<number, any>();
      variants.forEach((v) => {
        if (!v.height) return;
        const ex = byHeight.get(v.height);
        if (!ex || (v.bandwidth || 0) > (ex.bandwidth || 0)) byHeight.set(v.height, v);
      });
      store.setQualities(
        [...byHeight.values()]
          .sort((a, b) => b.height - a.height)
          .map((v) => ({
            id: v.id,
            height: v.height,
            bandwidth: v.bandwidth,
            label: qualityLabel(v.height, v.bandwidth),
          })),
      );

      // Audio languages.
      const langMap = new Map<string, any>();
      variants.forEach((v) => {
        if (v.language && !langMap.has(v.language)) langMap.set(v.language, v);
      });
      store.setAudioTracks(
        [...langMap.values()].map((v) => ({
          id: v.id,
          language: v.language,
          label: languageName(v.language),
        })),
      );
      const active = variants.find((v) => v.active && v.language);
      if (active?.language) store.setCurrentAudioLanguage(active.language);

      // Text tracks.
      const texts: any[] = (p as any).getTextTracks?.() ?? [];
      store.setTextTracks(
        texts.map((t) => ({
          id: t.id,
          language: t.language,
          label: languageName(t.language),
        })),
      );
    };

    const tickStats = () => {
      const p = playerRef.current;
      const v = videoRef.current;
      if (!p || !v) return;
      const s: ShakaStats = (p as any).getStats?.() ?? {};
      store.setStats({
        width: s.width ?? 0,
        height: s.height ?? 0,
        bitrate: Math.round((s.streamBandwidth ?? 0) / 1000),
        estimatedBandwidth: Math.round((s.estimatedBandwidth ?? 0) / 1000),
        bufferedAhead: s.bufferedAhead ?? bufferedAheadFromVideo(v),
        droppedFrames: s.droppedFrames ?? 0,
        decodedFrames: s.decodedFrames ?? 0,
        completionPercent: s.completionPercent ?? 0,
        playTime: s.playTime ?? 0,
      });
    };

    const mapError = (e: any) => {
      const code = e?.code ?? 'UNKNOWN';
      const category = e?.category;
      let message = e?.message || 'The stream could not be loaded.';
      let hint: string | undefined;
      if (category === 6) {
        message = 'Content-protection (DRM) error.';
        hint = 'Widevine streams require Chrome or Edge over a secure HTTPS origin.';
      } else if (category === 1) {
        message = 'Network error — the stream could not be reached.';
        hint = 'Check your connection or that the origin allows cross-origin requests (CORS).';
      } else if (category === 4) {
        message = 'The manifest could not be parsed.';
      } else if (category === 2 || category === 3) {
        message = 'A media segment failed to load.';
      }
      store.setError({ code, category, message, hint, severity: 'fatal' });
    };

    // <video> handlers live at effect scope so cleanup can remove them even
    // if init is still in flight (avoids leaking listeners across reloads).
    let onPlay: (() => void) | null = null;
    let onPause: (() => void) | null = null;
    let onTime: (() => void) | null = null;
    let onDuration: (() => void) | null = null;
    let onWaiting: (() => void) | null = null;
    let onPlaying: (() => void) | null = null;

    const detachVideoListeners = () => {
      const v = videoRef.current;
      if (!v) return;
      if (onPlay) v.removeEventListener('play', onPlay);
      if (onPause) v.removeEventListener('pause', onPause);
      if (onTime) v.removeEventListener('timeupdate', onTime);
      if (onDuration) {
        v.removeEventListener('durationchange', onDuration);
        v.removeEventListener('loadedmetadata', onDuration);
      }
      if (onWaiting) v.removeEventListener('waiting', onWaiting);
      if (onPlaying) {
        v.removeEventListener('playing', onPlaying);
        v.removeEventListener('canplay', onPlaying);
      }
    };

    const init = async () => {
      try {
        player = new shaka.Player();
        playerRef.current = player;
        await player.attach(video);

        player.configure({
          drm: drmConfig?.servers
            ? {
                servers: drmConfig.servers,
                // Widevine advanced: L3 software crypto works on most devices.
                // Bump to 'HW_SECURE_ALL' to require Level 1 (secure path).
                advanced: {
                  'com.widevine.alpha': {
                    videoRobustness: 'SW_SECURE_CRYPTO',
                    audioRobustness: 'SW_SECURE_CRYPTO',
                    sessionType: 'temporary',
                  },
                },
              }
            : {},
          abr: { enabled: true },
          streaming: {
            bufferingGoal: 15, // PRD: 15s buffer health
            rebufferingGoal: 5,
            bufferBehind: 30,
            // Tolerate IPTV manifests with drifting segment timestamps.
            ignoreManifestTimestampsInSegmentsMode: true,
            // Reuse MSE buffers across variant switches to avoid rebuffering.
            // (default already good; keep engine defaults for the rest.)
          },
          preferredTextLanguage: (navigator.language || 'en').slice(0, 2),
        });

        // === Custom HTTP headers (protected IPTV streams) ===
        // Browsers forbid setting User-Agent/Cookie/Referer directly, so we
        // route through a proxy and forward those as X- prefixed headers.
        if (httpHeaders && Object.keys(httpHeaders).length > 0) {
          if (needsProxy && !proxyReady) {
            store.setError({
              code: 'PROXY_REQUIRED',
              severity: 'fatal',
              message: 'This stream requires custom HTTP headers.',
              hint:
                'Set a proxy base (Settings → Proxy) so User-Agent/Cookie can be injected server-side.',
            });
            throw new Error('Proxy not configured for protected stream.');
          }
          const eng = (player as any).getNetworkingEngine?.();
          eng?.registerRequestFilter((type: number, request: any) => {
            const Manifest = shaka.net.NetworkingEngine.RequestType.MANIFEST;
            const Segment = shaka.net.NetworkingEngine.RequestType.SEGMENT;
            // NOTE: intentionally NOT handling LICENSE — DRM license requests
            // go to the license server, not the content origin. Routing them
            // through the content proxy or attaching stream Cookies/User-Agent
            // would break DRM and leak credentials.
            if (type !== Manifest && type !== Segment) return;
            const uri = request.uris?.[0];
            if (!uri) return;
            const resolved = resolveProxiedRequest(uri, httpHeaders);
            request.uris = [resolved.uri];
            request.headers = { ...(request.headers || {}), ...resolved.safe, ...resolved.proxied };
          });
        }

        const onBuffering = (e: any) => store.setBuffering(!!e.buffering);
        const onTracksChanged = () => player && refreshTracks(player);
        const onAdaptation = () => tickStats();
        const onPlayerError = (e: any) => mapError(e?.detail ?? e);

        player.addEventListener('buffering', onBuffering);
        player.addEventListener('trackschanged', onTracksChanged);
        player.addEventListener('adaptation', onAdaptation);
        player.addEventListener('error', onPlayerError);

        // <video> element listeners — defined at effect scope so cleanup can
        // remove them (otherwise they leak across reloads / channel switches).
        onPlay = () => store.setPlaying(true);
        onPause = () => store.setPlaying(false);
        onTime = () => store.setCurrentTime(video.currentTime);
        onDuration = () => store.setDuration(video.duration);
        onWaiting = () => store.setBuffering(true);
        onPlaying = () => store.setBuffering(false);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('timeupdate', onTime);
        video.addEventListener('durationchange', onDuration);
        video.addEventListener('loadedmetadata', onDuration);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('canplay', onPlaying);

        try {
          await player.load(manifestUri);
          if (cancelled) return;
          store.setDuration(video.duration || 0);
          store.setReady(true);
          store.setError(null);
          refreshTracks(player);
          statsTimer = setInterval(tickStats, 1000);
          tickStats();
            // Best-effort autoplay (browsers may block sound until interaction).
            try {
              await video.play();
            } catch {
              store.setPlaying(false);
            }

            // Memory-leak prevention: long-running live IPTV sessions can
            // accumulate garbage over many hours. Re-arm the manifest every 4h
            // (recurring for the life of the session), restoring the playhead
            // for VOD while letting live jump to the edge.
            const REFRESH_INTERVAL = 4 * 60 * 60 * 1000;
            const scheduleRefresh = () => {
              refreshTimer = setTimeout(doRefresh, REFRESH_INTERVAL);
            };
            const doRefresh = async () => {
              const p = playerRef.current;
              if (cancelled || !p) return;
              const resume = video.currentTime;
              const wasPlaying = !video.paused;
              try {
                store.setBuffering(true);
                await p.detach();
                await p.attach(video);
                await p.load(manifestUri);
                if (cancelled) return;
                if (Number.isFinite(video.duration) && resume < video.duration - 30) {
                  video.currentTime = resume;
                }
                refreshTracks(p);
                tickStats();
                if (wasPlaying) await video.play().catch(() => {});
                else store.setBuffering(false);
                // Re-arm for the next interval.
                if (!cancelled) scheduleRefresh();
              } catch (e) {
                if (!cancelled) mapError(e);
              }
            };
            scheduleRefresh();
          } catch (e) {
            if (!cancelled) mapError(e);
          }
      } catch (e) {
        if (!cancelled) mapError(e);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (statsTimer) clearInterval(statsTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      detachVideoListeners();
      store.setReady(false);
      store.setBuffering(false);
      const p = playerRef.current;
      if (p) {
        try {
          p.destroy();
        } catch {
          /* ignore */
        }
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifestUri, reloadKey, headersKey, needsProxy, proxyReady]);

  /* ----------------------- Volume / mute sync --------------------------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = store.volume;
    v.muted = store.isMuted;
  }, [store.volume, store.isMuted, videoRef]);

  /* ----------------------- Playback rate sync --------------------------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = store.playbackRate;
  }, [store.playbackRate, videoRef]);

  /* ----------------------- Imperative controller ------------------------ */
  const controller = useMemo<ShakaController>(
    () => ({
      selectQuality: (id) => {
        const p = playerRef.current;
        if (!p) return;
        if (id === null) {
          p.configure('abr.enabled', true);
          store.setAbrEnabled(true);
          store.setCurrentQualityId(null);
          return;
        }
        p.configure('abr.enabled', false);
        store.setAbrEnabled(false);
        const track = ((p as any).getVariantTracks?.() ?? []).find(
          (v: any) => v.id === id,
        );
        if (track) {
          try {
            (p as any).selectVariantTrack(track, true);
          } catch {
            /* ignore */
          }
        }
        store.setCurrentQualityId(id);
      },
      selectAudioLanguage: (lang) => {
        const p = playerRef.current;
        if (!p) return;
        try {
          (p as any).selectAudioLanguage(lang);
        } catch {
          /* ignore */
        }
        store.setCurrentAudioLanguage(lang);
      },
      selectTextTrack: (id) => {
        const p = playerRef.current;
        if (!p) return;
        if (id === null) {
          (p as any).setTextTrackVisibility?.(false);
          store.setCaptions(false);
          store.setCurrentTextId(null);
          return;
        }
        const track = ((p as any).getTextTracks?.() ?? []).find(
          (t: any) => t.id === id,
        );
        if (track) {
          (p as any).selectTextTrack?.(track);
          (p as any).setTextTrackVisibility?.(true);
          store.setCaptions(true);
          store.setCurrentTextId(id);
        }
      },
      toggleCaptions: (on) => {
        const p = playerRef.current;
        if (!p) return;
        if (!on) {
          controller.selectTextTrack(null);
          return;
        }
        const texts: any[] = (p as any).getTextTracks?.() ?? [];
        if (texts.length === 0) return;
        const pref = (navigator.language || 'en').slice(0, 2);
        const chosen = texts.find((t) => (t.language || '').startsWith(pref)) || texts[0];
        controller.selectTextTrack(chosen.id);
      },
    }),
    // controller references playerRef (stable) + store setters (stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return controller;
}
