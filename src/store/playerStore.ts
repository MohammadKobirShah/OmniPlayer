import { create } from 'zustand';
import type { IptvChannel } from '../lib/m3u';
import type { EpgMap } from '../lib/xmltv';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type GestureHint =
  | { kind: 'seek'; value: number; forward?: boolean }
  | { kind: 'volume'; value: number }
  | { kind: 'brightness'; value: number }
  | { kind: 'speed'; value: number };

export interface QualityOption {
  id: number;
  height: number;
  bandwidth: number;
  label: string;
}

export interface AudioOption {
  id: number;
  language: string;
  label: string;
}

export interface TextOption {
  id: number;
  language: string;
  label: string;
}

export interface PlayerStats {
  width: number;
  height: number;
  /** Stream bandwidth in kbps (current rendition). */
  bitrate: number;
  /** Estimated network bandwidth in kbps. */
  estimatedBandwidth: number;
  /** Seconds of video buffered ahead of the playhead. */
  bufferedAhead: number;
  droppedFrames: number;
  decodedFrames: number;
  completionPercent: number;
  playTime: number;
}

export type ErrorSeverity = 'critical' | 'fatal' | 'recoverable';

export interface PlayerError {
  code: number | string;
  category?: number;
  message: string;
  hint?: string;
  severity: ErrorSeverity;
}

export interface PlayerState {
  /* Core playback state */
  isPlaying: boolean;
  isReady: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  showControls: boolean;
  playbackRate: number;
  captionsEnabled: boolean;

  /* Track metadata */
  qualities: QualityOption[];
  audioTracks: AudioOption[];
  textTracks: TextOption[];
  abrEnabled: boolean;
  currentQualityId: number | null;
  currentAudioLanguage: string | null;
  currentTextId: number | null;

  /* Telemetry */
  stats: PlayerStats;

  /* Errors */
  error: PlayerError | null;

  /* Actions */
  setPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (currentTime: number) => void;
  setDuration: (duration: number) => void;
  setBuffering: (isBuffering: boolean) => void;
  setReady: (isReady: boolean) => void;
  setVolume: (volume: number) => void;
  setMuted: (isMuted: boolean) => void;
  toggleMute: () => void;
  setFullscreen: (isFullscreen: boolean) => void;
  setShowControls: (show: boolean) => void;
  toggleControls: (show?: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setCaptions: (enabled: boolean) => void;

  setQualities: (q: QualityOption[]) => void;
  setAudioTracks: (a: AudioOption[]) => void;
  setTextTracks: (t: TextOption[]) => void;
  setAbrEnabled: (enabled: boolean) => void;
  setCurrentQualityId: (id: number | null) => void;
  setCurrentAudioLanguage: (lang: string | null) => void;
  setCurrentTextId: (id: number | null) => void;

  setStats: (stats: Partial<PlayerStats>) => void;
  setError: (error: PlayerError | null) => void;

  /* ----------------------------- IPTV / EPG ----------------------------- */
  iptvChannels: IptvChannel[];
  iptvGroups: string[];
  epg: EpgMap;
  activeChannelId: string | null;
  isDrawerOpen: boolean;
  drawerQuery: string;
  favorites: string[];

  setPlaylist: (channels: IptvChannel[]) => void;
  mergeChannels: (channels: IptvChannel[]) => void;
  setEpg: (epg: EpgMap) => void;
  selectChannel: (id: string) => void;
  clearChannel: () => void;
  toggleDrawer: (open?: boolean) => void;
  setDrawerQuery: (q: string) => void;
  toggleFavorite: (id: string) => void;

  /* ------------------------------ Gestures ------------------------------ */
  brightness: number;
  gestureHint: GestureHint | null;
  setBrightness: (b: number) => void;
  setGestureHint: (h: GestureHint | null) => void;

  /* --------------------------- Device profile --------------------------- */
  tvMode: boolean;
  reduceMotion: boolean;
  setTvMode: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;

  resetPlayback: () => void;
}

const EMPTY_STATS: PlayerStats = {
  width: 0,
  height: 0,
  bitrate: 0,
  estimatedBandwidth: 0,
  bufferedAhead: 0,
  droppedFrames: 0,
  decodedFrames: 0,
  completionPercent: 0,
  playTime: 0,
};

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  isReady: false,
  isBuffering: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  isFullscreen: false,
  showControls: true,
  playbackRate: 1,
  captionsEnabled: false,

  qualities: [],
  audioTracks: [],
  textTracks: [],
  abrEnabled: true,
  currentQualityId: null,
  currentAudioLanguage: null,
  currentTextId: null,

  stats: EMPTY_STATS,
  error: null,

  iptvChannels: [],
  iptvGroups: [],
  epg: {},
  activeChannelId: null,
  isDrawerOpen: false,
  drawerQuery: '',
  favorites: [],

  brightness: 1,
  gestureHint: null,

  tvMode: false,
  reduceMotion: false,

  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setBuffering: (isBuffering) => set({ isBuffering }),
  setReady: (isReady) => set({ isReady }),
  setVolume: (volume) =>
    set({ volume: Math.min(1, Math.max(0, volume)), isMuted: volume <= 0 }),
  setMuted: (isMuted) => set({ isMuted }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  setShowControls: (show) => set({ showControls: show }),
  toggleControls: (show) =>
    set((state) => ({
      showControls: show !== undefined ? show : !state.showControls,
    })),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setCaptions: (captionsEnabled) => set({ captionsEnabled }),

  setQualities: (qualities) => set({ qualities }),
  setAudioTracks: (audioTracks) => set({ audioTracks }),
  setTextTracks: (textTracks) => set({ textTracks }),
  setAbrEnabled: (abrEnabled) => set({ abrEnabled }),
  setCurrentQualityId: (currentQualityId) => set({ currentQualityId }),
  setCurrentAudioLanguage: (currentAudioLanguage) => set({ currentAudioLanguage }),
  setCurrentTextId: (currentTextId) => set({ currentTextId }),

  setStats: (stats) => set((state) => ({ stats: { ...state.stats, ...stats } })),
  setError: (error) => set({ error }),

  setPlaylist: (channels) =>
    set(() => {
      const seen = new Set<string>();
      const groups: string[] = [];
      for (const c of channels) {
        if (!seen.has(c.group)) {
          seen.add(c.group);
          groups.push(c.group);
        }
      }
      return { iptvChannels: channels, iptvGroups: groups };
    }),
  mergeChannels: (channels) =>
    set((state) => {
      const byId = new Map(state.iptvChannels.map((c) => [c.id, c]));
      let nextNumber = Math.max(0, ...state.iptvChannels.map((c) => c.number));
      for (const c of channels) {
        const existing = byId.get(c.id);
        if (existing) byId.set(c.id, { ...existing, ...c });
        else {
          nextNumber += 1;
          byId.set(c.id, { ...c, number: c.number || nextNumber });
        }
      }
      const merged = [...byId.values()];
      const seen = new Set<string>();
      const groups: string[] = [];
      for (const c of merged) {
        if (!seen.has(c.group)) {
          seen.add(c.group);
          groups.push(c.group);
        }
      }
      return { iptvChannels: merged, iptvGroups: groups };
    }),
  setEpg: (epg) => set({ epg }),
  selectChannel: (id) =>
    set(() => ({
      activeChannelId: id,
      isDrawerOpen: false,
      isPlaying: false,
      isReady: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      error: null,
      qualities: [],
      audioTracks: [],
      textTracks: [],
      abrEnabled: true,
      currentQualityId: null,
      currentAudioLanguage: null,
      currentTextId: null,
      captionsEnabled: false,
      stats: EMPTY_STATS,
    })),
  clearChannel: () => set({ activeChannelId: null }),
  toggleDrawer: (open) =>
    set((state) => ({ isDrawerOpen: open !== undefined ? open : !state.isDrawerOpen })),
  setDrawerQuery: (q) => set({ drawerQuery: q }),
  toggleFavorite: (id) =>
    set((state) => ({
      favorites: state.favorites.includes(id)
        ? state.favorites.filter((f) => f !== id)
        : [...state.favorites, id],
    })),
  setBrightness: (b) => set({ brightness: Math.min(1.8, Math.max(0.25, b)) }),
  setGestureHint: (h) => set({ gestureHint: h }),

  setTvMode: (tvMode) => set({ tvMode }),
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),

  resetPlayback: () =>
    set({
      isPlaying: false,
      isReady: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      error: null,
      qualities: [],
      audioTracks: [],
      textTracks: [],
      abrEnabled: true,
      currentQualityId: null,
      currentAudioLanguage: null,
      currentTextId: null,
      captionsEnabled: false,
      stats: EMPTY_STATS,
    }),
}));
