export interface DrmConfig {
  servers: Record<string, string>;
}

export interface StreamSource {
  id: string;
  title: string;
  description: string;
  manifestUri: string;
  drm?: DrmConfig;
  container: 'DASH' | 'HLS';
  protection: 'Clear' | 'Widevine';
  maxRes: string;
  duration: string;
  tags: string[];
  /** CSS gradient used for the launch-card poster. */
  gradient: string;
  glyph: string;
}

/**
 * Shaka's official, CORS-enabled demo assets.
 *
 * NOTE: Widevine (DRM) streams only play in browsers that support Encrypted
 * Media Extensions (Chrome / Edge) over a secure (HTTPS) context. Clear
 * streams play everywhere. The license server below is Shaka's public,
 * authentication-free proxy — NOT the placeholder Yahoo URL.
 */
export const STREAMS: StreamSource[] = [
  {
    id: 'angel-one',
    title: 'Angel One',
    description:
      'Star Trek: Picard clip. Multi-language audio, subtitles and full adaptive bitrate.',
    manifestUri:
      'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
    container: 'DASH',
    protection: 'Clear',
    maxRes: '1080p',
    duration: '7:32',
    tags: ['Multi-audio', 'Subtitles', 'ABR'],
    gradient: 'linear-gradient(135deg, #1a1f3a 0%, #3a1f5d 55%, #6d1f4a 100%)',
    glyph: '🛰️',
  },
  {
    id: 'bbb-dark-truths',
    title: 'Big Buck Bunny — Dark Truths',
    description: 'HLS demo stream with crisp adaptive segments and HDR-ish tone.',
    manifestUri:
      'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/hls.m3u8',
    container: 'HLS',
    protection: 'Clear',
    maxRes: '1080p',
    duration: '10:34',
    tags: ['HLS', 'Adaptive'],
    gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    glyph: '🐰',
  },
  {
    id: 'angel-one-widevine',
    title: 'Angel One — Widevine',
    description:
      'DRM-protected DASH. Requires Chrome/Edge over HTTPS (Encrypted Media Extensions).',
    manifestUri:
      'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd',
    drm: {
      servers: {
        'com.widevine.alpha': 'https://cwip-shaka-proxy.appspot.com/no_auth',
      },
    },
    container: 'DASH',
    protection: 'Widevine',
    maxRes: '1080p',
    duration: '7:32',
    tags: ['DRM', 'Widevine', 'Protected'],
    gradient: 'linear-gradient(135deg, #200122 0%, #6f0000 100%)',
    glyph: '🔒',
  },
  {
    id: 'sintel-widevine',
    title: 'Sintel — Widevine',
    description: 'Blender short, DRM-protected. Needs a Widevine-capable browser.',
    manifestUri:
      'https://storage.googleapis.com/shaka-demo-assets/sintel-widevine/dash.mpd',
    drm: {
      servers: {
        'com.widevine.alpha': 'https://cwip-shaka-proxy.appspot.com/no_auth',
      },
    },
    container: 'DASH',
    protection: 'Widevine',
    maxRes: '1080p',
    duration: '14:48',
    tags: ['DRM', 'Widevine', '4K-ready'],
    gradient: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    glyph: '🐉',
  },
];
