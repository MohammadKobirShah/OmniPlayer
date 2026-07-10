import { toM3U, glyphFor, pickGradient, type IptvChannel } from './m3u';
import type { EpgMap, EpgProgramme } from './xmltv';

/**
 * Real, CORS-enabled test streams (no dead placeholder assets). Channels are
 * authored as rich objects (glyph/gradient/description) and also serialized to
 * an M3U string so the parser round-trips — and so users can paste/import it.
 */

/** Shaka's public, auth-free Widevine proxy. */
const WIDEVINE_NOAUTH = 'https://cwip-shaka-proxy.appspot.com/no_auth';

interface ChannelSeed {
  id: string;
  name: string;
  group: string;
  url: string;
  drm?: boolean;
  isLive?: boolean;
  description: string;
  /** Custom HTTP headers (User-Agent / Cookie) for protected VIP streams. */
  httpHeaders?: Record<string, string>;
}

const SEEDS: ChannelSeed[] = [
  {
    id: 'tos-4k',
    name: 'Tears of Steel 4K',
    group: '🎬 Premium Cinema',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    description: 'Sci-fi short from the Blender Institute, adaptive HLS up to 4K.',
  },
  {
    id: 'angel-one',
    name: 'Angel One HD',
    group: '🚀 Sci-Fi & Space',
    url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
    description: 'Multi-language audio, subtitles and full adaptive bitrate (DASH).',
  },
  {
    id: 'sintel',
    name: 'Sintel Cinema',
    group: '🎬 Premium Cinema',
    url: 'https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd',
    description: 'Blender open movie with crisp adaptive DASH segments.',
  },
  {
    id: 'bbb-dark',
    name: 'Big Buck Bunny',
    group: '🧸 Kids & Family',
    url: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/hls.m3u8',
    description: 'Classic animation with adaptive HLS rendition switching.',
  },
  {
    id: 'akamai-live',
    name: 'Akamai Live 24/7',
    group: '📡 Live',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    isLive: true,
    description: 'A persistent live HLS test channel. Sliding-window seeking.',
  },
  {
    id: 'mux-test',
    name: 'Mux Tech Demo',
    group: '🔬 Tech & Demos',
    url: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    description: 'Mux sample stream for player conformance testing.',
  },
  {
    id: 'bipbop',
    name: 'Apple BipBop',
    group: '🔬 Tech & Demos',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    description: 'Apple BipBop advanced fMP4 HLS reference stream.',
  },
  {
    id: 'angel-wv',
    name: 'Angel One · Vault',
    group: '🔒 Protected (DRM)',
    url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd',
    drm: true,
    description: 'Widevine-protected. Requires Chrome/Edge over HTTPS (EME).',
  },
  {
    id: 'sintel-wv',
    name: 'Sintel · Vault',
    group: '🔒 Protected (DRM)',
    url: 'https://storage.googleapis.com/shaka-demo-assets/sintel-widevine/dash.mpd',
    drm: true,
    description: 'Widevine-protected feature. Needs a Widevine-capable browser.',
  },
  {
    id: 'sony-yay-vip',
    name: 'Sony YAY! VIP (Headers)',
    group: '🔐 Header-Protected',
    url: 'https://bldcmprod-cdn.toffeelive.com/cdn/live/sonyyay/playlist.m3u8',
    isLive: true,
    description:
      'Protected like real Toffee Live VIP. Sends a custom User-Agent + signed Cookie — parsed from #EXTVLCOPT & #EXTHTTP. Needs the proxy.',
    httpHeaders: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      Cookie:
        'Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1783755096:KeyName=prod_linear:Signature=9CRcPp2OaxLI_Zj0NzUpHYh7tY8RbD1K3rzt1a4THcHFN5TK0ZeX6BCNY1gP4dgMyGQmID5zKQcSnK77Hy7rAA',
    },
  },
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const SAMPLE_CHANNELS: IptvChannel[] = SEEDS.map((s, i) => {
  const base: IptvChannel = {
    id: s.id,
    tvgId: s.id,
    tvgName: s.name,
    name: s.name,
    url: s.url,
    logo: null,
    group: s.group,
    number: 100 + (i + 1) * 3,
    glyph: '',
    gradient: '',
    isLive: s.isLive,
    description: s.description,
    drm: s.drm ? { servers: { 'com.widevine.alpha': WIDEVINE_NOAUTH } } : undefined,
    httpHeaders: s.httpHeaders,
  };
  return {
    ...base,
    glyph: glyphFor(base.name + ' ' + base.group),
    gradient: pickGradient(base.id + base.name),
  };
});

/** A ready-to-import M3U playlist string (proves the parser round-trips). */
export const SAMPLE_M3U: string = toM3U(SAMPLE_CHANNELS);

/* -------------------------------- EPG ------------------------------------ */

const PROGRAM_BANK: Record<string, [string, string][]> = {
  '🎬 Premium Cinema': [
    ['Late Night Feature', 'A cinematic journey through sound and shadow.'],
    ['Director’s Cut', 'Extended scenes and behind-the-scenes commentary.'],
    ['Silver Screen Classics', 'Restored from the original 35mm print.'],
    ['Midnight Matinée', 'The cult favourite returns for one night only.'],
  ],
  '🚀 Sci-Fi & Space': [
    ['Orbital Approach', 'A tense docking sequence goes eerily silent.'],
    ['Beyond the Heliosphere', 'Humanity’s first signal from interstellar space.'],
    ['Stellar Cartography', 'Mapping the unseen currents of the galaxy.'],
    ['The Long Dark', 'A crew wakes to find centuries have passed.'],
  ],
  '🧸 Kids & Family': [
    ['Forest Friends', 'Adventure in the meadow with the woodland crew.'],
    ['Storybook Hour', 'Beloved tales read aloud, page by page.'],
    ['Craft & Play', 'Hands-on creativity for curious minds.'],
    ['Sunny Day Parade', 'Music, laughter and a whole lot of confetti.'],
  ],
  '📡 Live': [
    ['Live Bulletin', 'Breaking coverage as events unfold.'],
    ['The World at Six', 'A roundup of the day’s headlines.'],
    ['Open Line', 'Viewers call in with their take on the news.'],
    ['Weather Watch', 'The forecast and what it means for you.'],
  ],
  '🔬 Tech & Demos': [
    ['Stream Lab', 'Bitrate, buffering and codec deep-dives.'],
    ['Developer Hour', 'Shipping adaptive media at scale.'],
    ['Conformance Check', 'Putting players through their paces.'],
    ['Latency Lowdown', 'Shaving milliseconds off live delivery.'],
  ],
  '🔒 Protected (DRM)': [
    ['Vault Premiere', 'Encrypted feature, licensed for this session.'],
    ['Secure Screening', 'DRM-protected content for authorized devices.'],
    ['Key Exchange', 'How license servers keep premium content safe.'],
    ['After Dark', 'A protected late-night feature presentation.'],
  ],
  '🔐 Header-Protected': [
    ['VIP Premiere', 'Streaming with a signed Cookie & custom User-Agent.'],
    ['Members Only', 'Access granted via header authentication.'],
    ['Edge Cache Hour', 'Behind the signed-URL content delivery network.'],
    ['Late Night VIP', 'Premium programming for authenticated viewers.'],
  ],
};
const DEFAULT_BANK: [string, string][] = [
  ['Now Playing', 'Currently streaming content.'],
  ['Up Next', 'Stay tuned for the following programme.'],
];

/**
 * Generate a believable EPG schedule for each channel, anchored to the current
 * time so a "NOW" programme always exists and "NEXT" is always upcoming.
 */
export function buildSampleEpg(channels: IptvChannel[]): EpgMap {
  const now = Date.now();
  const map: EpgMap = {};
  for (const ch of channels) {
    const bank = PROGRAM_BANK[ch.group] || DEFAULT_BANK;
    const seed = hashStr(ch.id);
    // Align programme boundaries to clean 30-min ticks, starting ~2h ago.
    const startAnchor = now - (now % (30 * 60 * 1000)) - 2 * 3600 * 1000;
    const programs: EpgProgramme[] = [];
    let t = startAnchor;
    let i = 0;
    while (t < now + 4 * 3600 * 1000) {
      const [title, desc] = bank[(i + seed) % bank.length];
      const dur = (30 + ((i * 13 + seed) % 31)) * 60 * 1000; // 30–60 min
      programs.push({ channel: ch.id, start: t, stop: t + dur, title, desc });
      t += dur;
      i += 1;
    }
    map[ch.id] = programs;
  }
  return map;
}
