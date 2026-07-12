import { create } from 'zustand';

export interface QualityLevel {
  id: number;
  label: string;
  height: number;
  width: number;
  bandwidth: number;
  frameRate?: number;
  videoCodec?: string;
  audioCodec?: string;
  channelsCount?: number;
  audioSampleRate?: number;
  active?: boolean;
}

export interface AudioTrack {
  id: number;
  language: string;
  label: string;
}

export interface TextTrack {
  id: number;
  language: string;
  label: string;
}

export interface PlayerStats {
  width: number;
  height: number;
  bitrate: number;
  estimatedBandwidth: number;
  bufferedAhead: number;
  decodedFrames: number;
  droppedFrames: number;
  completionPercent: number;
}

export interface ClearKeyPair {
  kid: string;
  key: string;
}

export interface DRMConfig {
  type: 'widevine' | 'playready' | 'clearkey' | 'none';
  servers?: Record<string, string>;
  clearKeys?: ClearKeyPair[];
}

export interface IPTVChannel {
  id: string;
  name: string;
  url: string;
  group: string;
  logo?: string;
  glyph: string;
  headers?: Record<string, string>;
  gradient: string;
  number?: number;
  isLive: boolean;
  drm?: DRMConfig;
}

export interface EPGEntry {
  start: number;
  stop: number;
  title: string;
  desc?: string;
}

export interface GestureHint {
  type: 'seek' | 'volume' | 'brightness' | 'speed';
  value: string;
  secondary?: string;
}

export interface PlayerError {
  code: number | string;
  message: string;
  hint?: string;
}

// ─── HOT PATH: mutable refs updated at 60fps, NO zustand set() ───
// These values change every frame / every timeupdate.
// Reading them via zustand selectors would cause 15-25 re-renders/sec.
// Instead we store them mutably and only push to zustand at ~4 fps for UI.
export const hotState = {
  currentTime: 0,
  duration: 0,
  bufferedFraction: 0,
  stats: {
    width: 0,
    height: 0,
    bitrate: 0,
    estimatedBandwidth: 0,
    bufferedAhead: 0,
    decodedFrames: 0,
    droppedFrames: 0,
    completionPercent: 0,
  } as PlayerStats,
};

interface PlayerState {
  // Playback state (low-frequency — only updates on play/pause/ready/error)
  isPlaying: boolean;
  isReady: boolean;
  isBuffering: boolean;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  brightness: number;

  // UI-visible time (pushed from hotState at ~4fps by a rAF loop)
  displayTime: number;
  displayDuration: number;
  displayBuffered: number;

  // UI state
  showControls: boolean;
  isFullscreen: boolean;
  isDrawerOpen: boolean;
  error: PlayerError | null;
  gestureHint: GestureHint | null;
  drawerQuery: string;

  // Quality & tracks
  qualities: QualityLevel[];
  currentQualityId: number | null;
  abrEnabled: boolean;
  audioTracks: AudioTrack[];
  currentAudioLanguage: string | null;
  textTracks: TextTrack[];
  currentTextTrackId: number | null;
  captionsEnabled: boolean;

  // Stats (pushed at ~1fps)
  stats: PlayerStats;

  // IPTV
  iptvChannels: IPTVChannel[];
  iptvGroups: string[];
  activeChannelId: string | null;
  favorites: string[];
  epg: Record<string, EPGEntry[]>;

  // Settings
  tvMode: boolean;
  reduceMotion: boolean;

  // Actions
  setIsPlaying: (v: boolean) => void;
  setIsReady: (v: boolean) => void;
  setIsBuffering: (v: boolean) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (v: number) => void;
  setBrightness: (v: number) => void;
  setShowControls: (v: boolean) => void;
  setFullscreen: (v: boolean) => void;
  toggleDrawer: (v?: boolean) => void;
  setError: (e: PlayerError | null) => void;
  setGestureHint: (h: GestureHint | null) => void;
  setDrawerQuery: (q: string) => void;
  setQualities: (q: QualityLevel[]) => void;
  selectQuality: (id: number | null) => void;
  setAbrEnabled: (v: boolean) => void;
  setAudioTracks: (t: AudioTrack[]) => void;
  selectAudioLanguage: (lang: string) => void;
  setTextTracks: (t: TextTrack[]) => void;
  selectTextTrack: (id: number | null) => void;
  setCaptionsEnabled: (v: boolean) => void;
  pushTimeToUI: () => void;
  pushStatsToUI: () => void;
  setChannels: (channels: IPTVChannel[]) => void;
  mergeChannels: (channels: IPTVChannel[]) => void;
  selectChannel: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setTvMode: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  reset: () => void;
}

const defaultStats: PlayerStats = {
  width: 0,
  height: 0,
  bitrate: 0,
  estimatedBandwidth: 0,
  bufferedAhead: 0,
  decodedFrames: 0,
  droppedFrames: 0,
  completionPercent: 0,
};

// Debounced localStorage write — max once per 2 seconds
let _volSaveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveVolume(v: number) {
  if (_volSaveTimer) clearTimeout(_volSaveTimer);
  _volSaveTimer = setTimeout(() => localStorage.setItem('omni-volume', String(v)), 2000);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isPlaying: false,
  isReady: false,
  isBuffering: false,
  volume: parseFloat(localStorage.getItem('omni-volume') || '0.8'),
  isMuted: false,
  playbackRate: 1,
  brightness: 1,

  displayTime: 0,
  displayDuration: 0,
  displayBuffered: 0,

  showControls: true,
  isFullscreen: false,
  isDrawerOpen: false,
  error: null,
  gestureHint: null,
  drawerQuery: '',

  qualities: [],
  currentQualityId: null,
  abrEnabled: true,
  audioTracks: [],
  currentAudioLanguage: null,
  textTracks: [],
  currentTextTrackId: null,
  captionsEnabled: false,

  stats: { ...defaultStats },

  iptvChannels: [],
  iptvGroups: [],
  activeChannelId: null,
  favorites: JSON.parse(localStorage.getItem('omni-favorites') || '[]'),
  epg: {},

  tvMode: false,
  reduceMotion: false,

  setIsPlaying: (v) => set({ isPlaying: v }),
  setIsReady: (v) => set({ isReady: v }),
  setIsBuffering: (v) => set({ isBuffering: v }),
  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    set({ volume: clamped });
    debouncedSaveVolume(clamped);
  },
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setPlaybackRate: (v) => set({ playbackRate: v }),
  setBrightness: (v) => set({ brightness: Math.max(0.2, Math.min(1.5, v)) }),
  setShowControls: (v) => set({ showControls: v }),
  setFullscreen: (v) => set({ isFullscreen: v }),
  toggleDrawer: (v) => set((s) => ({ isDrawerOpen: v ?? !s.isDrawerOpen })),
  setError: (e) => set({ error: e }),
  setGestureHint: (h) => set({ gestureHint: h }),
  setDrawerQuery: (q) => set({ drawerQuery: q }),
  setQualities: (q) => set({ qualities: q }),
  selectQuality: (id) => set({ currentQualityId: id, abrEnabled: id === null }),
  setAbrEnabled: (v) => set({ abrEnabled: v }),
  setAudioTracks: (t) => set({ audioTracks: t }),
  selectAudioLanguage: (lang) => set({ currentAudioLanguage: lang }),
  setTextTracks: (t) => set({ textTracks: t }),
  selectTextTrack: (id) => set({ currentTextTrackId: id, captionsEnabled: id !== null }),
  setCaptionsEnabled: (v) => set({ captionsEnabled: v }),

  // Batch-push hot-path values to UI at controlled rate
  pushTimeToUI: () => {
    const prev = get();
    const t = hotState.currentTime;
    const d = hotState.duration;
    const b = hotState.bufferedFraction;
    // Always push if duration changed (initial load) or time moved meaningfully
    const dChanged = prev.displayDuration !== d;
    const tChanged = Math.abs(prev.displayTime - t) > 0.15;
    const bChanged = Math.abs(prev.displayBuffered - b) > 0.003;
    if (tChanged || dChanged || bChanged) {
      set({ displayTime: t, displayDuration: d, displayBuffered: b });
    }
  },

  // Push stats at ~1fps
  pushStatsToUI: () => {
    set({ stats: { ...hotState.stats } });
  },

  setChannels: (channels) => {
    const groups = [...new Set(channels.map((c) => c.group))].sort();
    set({ iptvChannels: channels, iptvGroups: groups });
  },
  mergeChannels: (newChannels) => {
    const existing = get().iptvChannels;
    const existingIds = new Set(existing.map((c) => c.id));
    const merged = [...existing, ...newChannels.filter((c) => !existingIds.has(c.id))];
    const groups = [...new Set(merged.map((c) => c.group))].sort();
    set({ iptvChannels: merged, iptvGroups: groups });
  },
  selectChannel: (id) => {
    hotState.currentTime = 0;
    hotState.duration = 0;
    hotState.bufferedFraction = 0;
    hotState.stats = { ...defaultStats };
    set({
      activeChannelId: id,
      isReady: false,
      isPlaying: false,
      isBuffering: true,
      error: null,
      displayTime: 0,
      displayDuration: 0,
      displayBuffered: 0,
      qualities: [],
      currentQualityId: null,
      abrEnabled: true,
      stats: { ...defaultStats },
    });
  },
  toggleFavorite: (id) => {
    const favs = get().favorites;
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    localStorage.setItem('omni-favorites', JSON.stringify(next));
    set({ favorites: next });
  },
  setTvMode: (v) => set({ tvMode: v }),
  setReduceMotion: (v) => set({ reduceMotion: v }),
  reset: () => {
    hotState.currentTime = 0;
    hotState.duration = 0;
    hotState.bufferedFraction = 0;
    hotState.stats = { ...defaultStats };
    set({
      isPlaying: false,
      isReady: false,
      isBuffering: false,
      displayTime: 0,
      displayDuration: 0,
      displayBuffered: 0,
      error: null,
      qualities: [],
      stats: { ...defaultStats },
    });
  },
}));
