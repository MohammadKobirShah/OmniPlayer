import { useEffect, useRef, useCallback } from 'react';
import shaka from 'shaka-player';
import { usePlayerStore, hotState, type QualityLevel, type AudioTrack, type TextTrack, type DRMConfig } from '../store/playerStore';
import { getLanguageName } from '../utils/languageNames';

// ── Install polyfills ONCE at module load, not per mount ──
let _polyfilled = false;
if (!_polyfilled) {
  shaka.polyfill.installAll();
  _polyfilled = true;
}

// ── Lightweight rAF loop: pushes time to UI at ~4fps ──
let _rafId = 0;
let _lastPush = 0;
let _rafRunning = false;
function startUIPushLoop() {
  if (_rafRunning) return;
  _rafRunning = true;
  const tick = () => {
    if (!_rafRunning) return;
    const now = performance.now();
    if (now - _lastPush > 250) {
      usePlayerStore.getState().pushTimeToUI();
      _lastPush = now;
    }
    _rafId = requestAnimationFrame(tick);
  };
  _rafId = requestAnimationFrame(tick);
}
function stopUIPushLoop() {
  _rafRunning = false;
  cancelAnimationFrame(_rafId);
}

export function useShakaPlayer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  manifestUrl: string,
  drm?: DRMConfig,
  retryKey = 0,
  headers?: Record<string, string>
) {
  const playerRef = useRef<shaka.Player | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanedUp = useRef(false);

  const store = usePlayerStore;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !manifestUrl) return;

    cleanedUp.current = false;

    if (!shaka.Player.isBrowserSupported()) {
      store.getState().setError({
        code: 'UNSUPPORTED',
        message: 'Browser not supported',
        hint: 'Try Chrome, Edge, or Firefox for full playback support.',
      });
      return;
    }

    // ── Prepare video element for fastest possible start ──
    video.autoplay = true;
    video.preload = 'auto';
    video.volume = store.getState().volume;
    video.muted = store.getState().isMuted;

    // ── Create player — NO await, no attach delay ──
    const player = new shaka.Player();
    playerRef.current = player;

    const init = async () => {
      try {
        // attach is required but very fast (creates MediaSource)
        await player.attach(video);
        if (cleanedUp.current) return;

        // ── Two-phase ABR: fast startup → stable steady-state ──
        // Phase 1 (startup): rebufferingGoal=0.5, fast retries, play ASAP
        // Phase 2 (after first play): rebufferingGoal=2, stable ABR

        // Use persisted bandwidth from last session — returning users get right quality instantly
        const savedBW = parseInt(localStorage.getItem('omni-bw-estimate') || '0', 10);
        const startBW = savedBW > 500_000 ? savedBW : 1_600_000; // fallback 1.6Mbps

        player.configure({
          streaming: {
            bufferingGoal: 10,
            rebufferingGoal: 0.5,       // Phase 1: play almost instantly
            bufferBehind: 30,
            jumpLargeGaps: true,
            retryParameters: {
              maxAttempts: 3,
              baseDelay: 300,
              backoffFactor: 1.5,
              fuzzFactor: 0.3,
              timeout: 10000,
            },
          },
          abr: {
            enabled: true,
            useNetworkInformation: true,
            defaultBandwidthEstimate: startBW,
            switchInterval: 8,
            bandwidthUpgradeTarget: 0.85,
            bandwidthDowngradeTarget: 0.95,
            clearBufferSwitch: false,       // ★ never flush buffer on auto switch
            safeMarginSwitch: 0,            // ★ no extra margin needed since we don't clear
          },
          manifest: {
            retryParameters: {
              maxAttempts: 2,
              baseDelay: 200,
              backoffFactor: 1.5,
              fuzzFactor: 0.3,
              timeout: 8000,
            },
          },
        });

        // ── DRM Configuration ──
        if (drm) {
          if (drm.type === 'clearkey' && drm.clearKeys?.length) {
            const clearKeyMap: Record<string, string> = {};
            for (const pair of drm.clearKeys) {
              clearKeyMap[pair.kid] = pair.key;
            }
            player.configure('drm.clearKeys', clearKeyMap);
          } else if (drm.servers && Object.keys(drm.servers).length > 0) {
            player.configure('drm.servers', drm.servers);
          }
        }

        // ── Custom headers (from #EXTVLCOPT / #EXTHTTP / URL pipe) ──
        if (headers && Object.keys(headers).length > 0) {
          var net = player.getNetworkingEngine();
          if (net) {
            net.registerRequestFilter(function(_type: any, request: any) {
              if (request.headers) {
                for (var k in headers) {
                  if (headers.hasOwnProperty(k)) {
                    request.headers[k] = headers[k];
                  }
                }
              }
            });
          }
        }

        // ── Shaka events ──
        player.addEventListener('error', (event: any) => {
          if (cleanedUp.current) return;
          const detail = event.detail;
          store.getState().setError({
            code: detail?.code ?? 'UNKNOWN',
            message: detail?.message ?? 'Playback error occurred',
            hint: 'Try reloading or switching to a different stream.',
          });
        });

        player.addEventListener('buffering', (event: any) => {
          if (cleanedUp.current) return;
          store.getState().setIsBuffering(event.buffering);
        });

        player.addEventListener('adaptation', () => {
          if (!cleanedUp.current) updateQualities(player);
        });

        player.addEventListener('trackschanged', () => {
          if (cleanedUp.current) return;
          updateQualities(player);
          updateAudioTracks(player);
          updateTextTracks(player);
        });

        // ── Video element events ──
        let startupDone = false;

        const onPlay = () => {
          if (cleanedUp.current) return;
          store.getState().setIsPlaying(true);

          // ★ Phase 2: once playback actually starts, switch to stable config.
          // This is the YouTube technique — fast start, then lock down for stability.
          if (!startupDone) {
            startupDone = true;
            setTimeout(() => {
              if (cleanedUp.current) return;
              player.configure({
                streaming: {
                  rebufferingGoal: 2,     // Phase 2: stable rebuffering
                  retryParameters: {
                    maxAttempts: 4,
                    baseDelay: 1000,
                    backoffFactor: 2,
                    fuzzFactor: 0.5,
                    timeout: 20000,
                  },
                },
              });
            }, 3000); // wait 3s after first play before switching phase
          }
        };
        const onPause = () => { if (!cleanedUp.current) store.getState().setIsPlaying(false); };
        const onEnded = () => { if (!cleanedUp.current) store.getState().setIsPlaying(false); };
        const onWaiting = () => { if (!cleanedUp.current) store.getState().setIsBuffering(true); };

        const onCanPlay = () => {
          if (cleanedUp.current) return;
          store.getState().setIsBuffering(false);
          store.getState().setIsReady(true);
          if (Number.isFinite(video.duration)) {
            hotState.duration = video.duration;
          }
        };

        // timeupdate → mutable hotState only (zero re-renders)
        const onTimeUpdate = () => {
          hotState.currentTime = video.currentTime;
          const dur = video.duration;
          if (Number.isFinite(dur)) {
            hotState.duration = dur;
            hotState.stats.completionPercent = (video.currentTime / dur) * 100;
          }
          if (video.buffered.length > 0) {
            const end = video.buffered.end(video.buffered.length - 1);
            hotState.bufferedFraction = Number.isFinite(dur) ? end / dur : 0;
            hotState.stats.bufferedAhead = Math.max(0, end - video.currentTime);
          }
        };

        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('timeupdate', onTimeUpdate);

        // ── LOAD THE STREAM — this is the main async operation ──
        await player.load(manifestUrl);
        if (cleanedUp.current) return;

        // ★ Only AFTER load succeeds: start rAF + stats
        startUIPushLoop();

        let _bwSaveCounter = 0;
        statsIntervalRef.current = setInterval(() => {
          if (cleanedUp.current) return;
          try {
            const s = player.getStats();
            hotState.stats.width = s.width;
            hotState.stats.height = s.height;
            hotState.stats.estimatedBandwidth = s.estimatedBandwidth;
            hotState.stats.decodedFrames = s.decodedFrames;
            hotState.stats.droppedFrames = s.droppedFrames;
            hotState.stats.bitrate = s.streamBandwidth;
            store.getState().pushStatsToUI();

            // Persist bandwidth estimate every ~10s for next session
            _bwSaveCounter++;
            if (_bwSaveCounter % 5 === 0 && s.estimatedBandwidth > 0) {
              localStorage.setItem('omni-bw-estimate', String(Math.round(s.estimatedBandwidth)));
            }
          } catch { /* destroyed */ }
        }, 2000);

        // Ensure playback starts (autoplay might be blocked)
        video.play().catch(() => {});

      } catch (err: any) {
        if (cleanedUp.current) return;
        store.getState().setError({
          code: err.code ?? 'LOAD_ERROR',
          message: err.message || 'Failed to load stream',
          hint: 'Check the stream URL or try a different stream.',
        });
      }
    };

    init();

    return () => {
      cleanedUp.current = true;
      stopUIPushLoop();
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      player.destroy().catch(() => {});
      playerRef.current = null;
    };
  }, [manifestUrl, retryKey]);

  // Sync volume/mute/rate from store → video (only on actual change)
  useEffect(() => {
    const unsub = store.subscribe((state, prev) => {
      const video = videoRef.current;
      if (!video) return;
      if (state.volume !== prev.volume) video.volume = state.volume;
      if (state.isMuted !== prev.isMuted) video.muted = state.isMuted;
      if (state.playbackRate !== prev.playbackRate) video.playbackRate = state.playbackRate;
    });
    return unsub;
  }, []);

  const selectQuality = useCallback((id: number | null) => {
    const player = playerRef.current;
    if (!player) return;
    store.getState().selectQuality(id);
    if (id === null) {
      player.configure('abr.enabled', true);
    } else {
      player.configure('abr.enabled', false);
      const tracks = player.getVariantTracks();
      const target = tracks.find((t) => t.id === id);
      // ★ clearBuffer=false — play existing buffer, new segments download in new quality.
      // This is how YouTube does it: zero gap, zero stall, seamless transition.
      if (target) player.selectVariantTrack(target, false);
    }
  }, []);

  const selectAudioLanguage = useCallback((lang: string) => {
    const player = playerRef.current as any;
    if (!player) return;
    if (typeof player.selectAudioLanguage === 'function') {
      player.selectAudioLanguage(lang);
    }
    store.getState().selectAudioLanguage(lang);
  }, []);

  const selectTextTrack = useCallback((id: number | null) => {
    const player = playerRef.current as any;
    if (!player) return;
    if (id === null) {
      if (typeof player.setTextTrackVisibility === 'function') {
        player.setTextTrackVisibility(false);
      }
      store.getState().selectTextTrack(null);
    } else {
      const tracks = player.getTextTracks();
      const target = tracks.find((t: any) => t.id === id);
      if (target) player.selectTextTrack(target);
      if (typeof player.setTextTrackVisibility === 'function') {
        player.setTextTrackVisibility(true);
      }
      store.getState().selectTextTrack(id);
    }
  }, []);

  const toggleCaptions = useCallback((enabled: boolean) => {
    const player = playerRef.current as any;
    if (!player) return;
    if (typeof player.setTextTrackVisibility === 'function') {
      player.setTextTrackVisibility(enabled);
    }
    store.getState().setCaptionsEnabled(enabled);
  }, []);

  return { playerRef, selectQuality, selectAudioLanguage, selectTextTrack, toggleCaptions };
}

// ── Helper functions (called only on events, not hot path) ──

function updateQualities(player: shaka.Player) {
  try {
    const tracks = player.getVariantTracks();
    if (!tracks.length) return;

    // Each variant track in Shaka is a unique video+audio combo.
    // We want to show every distinct resolution+bandwidth from the stream — no fakes.
    const qualities: QualityLevel[] = [];
    const seen = new Set<string>();

    for (const t of tracks) {
      // Build a unique key: height + bandwidth (same height can have different bitrates)
      const h = t.height || 0;
      const w = t.width || 0;
      const bw = t.bandwidth || 0;
      const key = `${h}_${w}_${bw}`;

      if (seen.has(key)) continue;
      seen.add(key);

      // Build a descriptive label from actual stream data
      let label = '';
      if (h > 0) {
        label = `${h}p`;
        if (t.frameRate && t.frameRate > 30) {
          label += `${Math.round(t.frameRate)}`;  // e.g. "1080p60"
        }
      } else if (bw > 0) {
        // Audio-only variant — no video height
        label = `${Math.round(bw / 1000)} kbps`;
      } else {
        label = `Variant ${t.id}`;
      }

      // Extract codecs from the variant
      const videoCodec = t.videoCodec || undefined;
      const audioCodec = t.audioCodec || undefined;
      const channelsCount = (t as any).channelsCount || (t as any).audioChannelsCount || undefined;
      const audioSampleRate = (t as any).audioSamplingRate || (t as any).audioSampleRate || undefined;
      const frameRate = t.frameRate || undefined;

      qualities.push({
        id: t.id,
        label,
        height: h,
        width: w,
        bandwidth: bw,
        frameRate,
        videoCodec,
        audioCodec,
        channelsCount,
        audioSampleRate,
        active: !!t.active,
      });
    }

    // Sort: highest resolution first, then by bandwidth desc
    qualities.sort((a, b) => {
      if (a.height !== b.height) return b.height - a.height;
      return b.bandwidth - a.bandwidth;
    });

    usePlayerStore.getState().setQualities(qualities);
  } catch { /* ignore */ }
}

function updateAudioTracks(player: shaka.Player) {
  try {
    const tracks = player.getVariantTracks();
    const seen = new Set<string>();
    const audioTracks: AudioTrack[] = [];
    for (const t of tracks) {
      const lang = t.language || 'und';
      if (!seen.has(lang)) {
        seen.add(lang);
        audioTracks.push({
          id: t.id,
          language: lang,
          label: t.label || getLanguageName(lang),
        });
      }
    }
    usePlayerStore.getState().setAudioTracks(audioTracks);
  } catch { /* ignore */ }
}

function updateTextTracks(player: shaka.Player) {
  try {
    const tracks = player.getTextTracks();
    const textTracks: TextTrack[] = tracks.map((t) => ({
      id: t.id,
      language: t.language || 'und',
      label: t.label || getLanguageName(t.language || 'und'),
    }));
    usePlayerStore.getState().setTextTracks(textTracks);
  } catch { /* ignore */ }
}
