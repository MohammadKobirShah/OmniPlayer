import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import OmniPlayer from '../components/OmniPlayer';
import { usePlayerStore } from '../store/playerStore';
import { glyphFor, pickGradient, type IptvChannel } from './m3u';

/* ------------------------------------------------------------------ */
/*  Types — the public, documented surface of the library             */
/* ------------------------------------------------------------------ */

export interface OmniDrmConfig {
  /** Key-system → license-server URL, e.g. { 'com.widevine.alpha': '...' }. */
  servers: Record<string, string>;
}

export interface OmniPlayerOptions {
  /** Manifest URL — a DASH `.mpd` or HLS `.m3u8`. Required. */
  manifest: string;
  /** Optional DRM (Widevine / PlayReady / FairPlay) license servers. */
  drm?: OmniDrmConfig;
  /** Title shown in the top bar (defaults to "Live Stream"). */
  title?: string;
  /** Optional programme description. */
  description?: string;
  /** Optional emoji/glyph for the logo tile. */
  glyph?: string;
}

export type OmniPlayerEvent =
  | 'ready'
  | 'play'
  | 'pause'
  | 'ended'
  | 'timeupdate'
  | 'volumechange'
  | 'fullscreenchange'
  | 'error';

export interface OmniSnapshot {
  isPlaying: boolean;
  isReady: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  error: ReturnType<typeof usePlayerStore.getState>['error'];
}

export interface OmniPlayerHandle {
  play(): void;
  pause(): void;
  togglePlay(): void;
  seekTo(seconds: number): void;
  seekBy(deltaSeconds: number): void;
  setVolume(volume: number): void;
  mute(): void;
  unmute(): void;
  toggleMute(): void;
  toggleFullscreen(): void;
  reload(): void;
  destroy(): void;
  on(event: OmniPlayerEvent, listener: (payload?: unknown) => void): () => void;
  getState(): OmniSnapshot;
}

/* ------------------------------------------------------------------ */
/*  Internals                                                         */
/* ------------------------------------------------------------------ */

let embedSeq = 0;
const nextId = () => `omni-embed-${Date.now().toString(36)}-${embedSeq++}`;

function resolveTarget(target: string | HTMLElement): HTMLElement {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) {
    throw new Error(`OmniStream: target "${target}" was not found in the document.`);
  }
  return el;
}

function buildChannel(opts: OmniPlayerOptions): IptvChannel {
  const id = nextId();
  const title = opts.title || 'Live Stream';
  return {
    id,
    tvgId: id,
    tvgName: title,
    name: title,
    url: opts.manifest,
    logo: null,
    group: 'Embedded',
    number: 1,
    glyph: opts.glyph || glyphFor(title),
    gradient: pickGradient(id + title),
    description: opts.description,
    drm: opts.drm,
  };
}

type AnyListener = (payload?: unknown) => void;

/* ------------------------------------------------------------------ */
/*  OmniPlayer — the embeddable instance                              */
/* ------------------------------------------------------------------ */

class OmniPlayerInstance implements OmniPlayerHandle {
  private el: HTMLElement;
  private options: OmniPlayerOptions;
  private root: Root | null = null;
  private listeners = new Map<OmniPlayerEvent, Set<AnyListener>>();
  private unsubStore: (() => void) | null = null;
  private prev = { isPlaying: false, isReady: false, error: null as unknown };

  constructor(target: string | HTMLElement, options: OmniPlayerOptions) {
    if (!options?.manifest) {
      throw new Error('OmniStream: `options.manifest` is required.');
    }
    this.el = resolveTarget(target);
    this.options = options;

    // The host must establish a positioning context + height for embed mode.
    this.el.classList.add('omni-host');

    // Seed the shared store with this single source, then render the player.
    const channel = buildChannel(options);
    usePlayerStore.getState().setPlaylist([channel]);
    usePlayerStore.getState().selectChannel(channel.id);

    this.root = createRoot(this.el);
    this.root.render(createElement(OmniPlayer, { embed: true }));

    this.subscribeStore();
  }

  private subscribeStore() {
    this.unsubStore = usePlayerStore.subscribe((state) => {
      if (state.isReady && !this.prev.isReady) this.emit('ready');
      this.prev.isReady = state.isReady;

      if (state.isPlaying && !this.prev.isPlaying) this.emit('play');
      if (!state.isPlaying && this.prev.isPlaying) this.emit('pause');
      this.prev.isPlaying = state.isPlaying;

      if (state.isFullscreen !== this.fullscreenLast) {
        this.fullscreenLast = state.isFullscreen;
        this.emit('fullscreenchange', state.isFullscreen);
      }

      if (state.error && state.error !== this.prev.error) {
        this.emit('error', state.error);
      }
      this.prev.error = state.error;

      this.emit('timeupdate', state.currentTime);
      this.emit('volumechange', { volume: state.volume, muted: state.isMuted });
    });
  }
  private fullscreenLast = false;

  private video(): HTMLVideoElement | null {
    return this.el.querySelector('video');
  }

  private emit(event: OmniPlayerEvent, payload?: unknown) {
    this.listeners.get(event)?.forEach((fn) => fn(payload));
  }

  /* --------------------------- Controls ---------------------------- */

  play() {
    this.video()?.play().catch(() => {});
  }
  pause() {
    this.video()?.pause();
  }
  togglePlay() {
    const v = this.video();
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }
  seekTo(seconds: number) {
    const v = this.video();
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(v.duration, Math.max(0, seconds));
  }
  seekBy(delta: number) {
    const v = this.video();
    if (!v) return;
    v.currentTime = Math.min(v.duration || v.currentTime + delta, Math.max(0, v.currentTime + delta));
  }
  setVolume(volume: number) {
    usePlayerStore.getState().setVolume(volume);
  }
  mute() {
    usePlayerStore.getState().setMuted(true);
  }
  unmute() {
    usePlayerStore.getState().setMuted(false);
  }
  toggleMute() {
    usePlayerStore.getState().toggleMute();
  }
  toggleFullscreen() {
    const v = this.video();
    const host = v?.parentElement;
    try {
      if (!document.fullscreenElement) host?.requestFullscreen?.();
      else document.exitFullscreen?.();
    } catch {
      /* fullscreen blocked (e.g. sandboxed iframe) */
    }
  }

  /** Destroy + recreate the instance to recover from errors / leaks. */
  reload() {
    const channel = buildChannel(this.options);
    usePlayerStore.getState().setPlaylist([channel]);
    usePlayerStore.getState().selectChannel(channel.id);
  }

  destroy() {
    this.unsubStore?.();
    this.unsubStore = null;
    this.listeners.clear();
    this.root?.unmount();
    this.root = null;
    usePlayerStore.getState().clearChannel();
  }

  on(event: OmniPlayerEvent, listener: AnyListener): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set?.delete(listener);
  }

  getState(): OmniSnapshot {
    const s = usePlayerStore.getState();
    return {
      isPlaying: s.isPlaying,
      isReady: s.isReady,
      isBuffering: s.isBuffering,
      currentTime: s.currentTime,
      duration: s.duration,
      volume: s.volume,
      isMuted: s.isMuted,
      isFullscreen: s.isFullscreen,
      error: s.error,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  OmniStream — the global entry point (like `shaka`)                */
/* ------------------------------------------------------------------ */

export const OmniStream = {
  /**
   * Mount the player into an element and return a control handle.
   * @example
   * const player = OmniStream.mount('#player', {
   *   manifest: 'https://example.com/stream.mpd',
   *   drm: { servers: { 'com.widevine.alpha': 'https://license...' } },
   * });
   * player.on('error', e => console.warn(e));
   */
  mount(target: string | HTMLElement, options: OmniPlayerOptions): OmniPlayerHandle {
    return new OmniPlayerInstance(target, options);
  },

  /** Auto-mount every `[data-omni-source]` element on the page. */
  scan(root: ParentNode = document): OmniPlayerHandle[] {
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-omni-source]'));
    return nodes.map((node) => {
      const drmAttr = node.getAttribute('data-omni-drm');
      return OmniStream.mount(node, {
        manifest: node.getAttribute('data-omni-source') || '',
        title: node.getAttribute('data-omni-title') || undefined,
        glyph: node.getAttribute('data-omni-glyph') || undefined,
        description: node.getAttribute('data-omni-desc') || undefined,
        drm: drmAttr ? { servers: JSON.parse(drmAttr) } : undefined,
      });
    });
  },

  /** Reference to the version (replaced at build time if desired). */
  version: '1.0.0',
};

export type { OmniPlayerInstance };
