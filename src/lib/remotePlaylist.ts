import { parseM3U, pickGradient, glyphFor, type IptvChannel } from './m3u';
import type { EpgMap } from './xmltv';

/* ------------------------------------------------------------------ */
/*  Remote playlist sources                                           */
/* ------------------------------------------------------------------ */

export interface PlaylistSource {
  id: string;
  name: string;
  url: string;
  /** Whether the channels in this source require custom HTTP headers. */
  protected: boolean;
}

/**
 * Known, curated remote playlists. Loaded automatically on startup so the
 * library is always populated with live, updatable channels (instead of
 * hardcoded, stale data).
 */
export const KNOWN_PLAYLISTS: PlaylistSource[] = [
  {
    id: 'toffee',
    name: 'Toffee Live',
    url: 'https://raw.githubusercontent.com/sm-monirulislam/SM-Live-TV/refs/heads/main/Toffee.m3u',
    // Toffee streams send a custom User-Agent (+ signed Cookie) parsed from
    // #EXTVLCOPT / #EXTHTTP. Browsers can't send those directly → needs proxy.
    protected: true,
  },
];

/** Load-status of a remote source (for UI feedback). */
export type SourceStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface SourceResult {
  sourceId: string;
  status: SourceStatus;
  count: number;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Fetching + enrichment                                             */
/* ------------------------------------------------------------------ */

const UA_REGEX = /\(([^)]+)\)/;

/** Fetch + parse a remote M3U, returning enriched channel objects. */
export async function fetchPlaylist(source: PlaylistSource): Promise<IptvChannel[]> {
  const res = await fetch(source.url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const { channels } = parseM3U(text);

  // Tag every channel with its origin so we can scope/filter by source, and
  // guarantee a stable glyph/gradient (parser already enriches, but re-run in
  // case the raw list bypassed enrichment).
  const stamp = source.id;
  return channels.map((c, i) => {
    const base = c.url ? c : { ...c, url: '' };
    const platform = UA_REGEX.exec(base.httpHeaders?.['User-Agent'] || '')?.[1] || '';
    const desc = base.description || buildDescription(base, source, platform);
    return {
      ...base,
      glyph: base.glyph || glyphFor(base.name + ' ' + base.group),
      gradient: base.gradient || pickGradient(base.id + base.name),
      description: desc,
      isLive: base.isLive ?? ( /\.m3u8$/i.test(base.url) || !!base.httpHeaders ),
      // Namespaced id prevents collisions if multiple sources share a tvg-id.
      id: base.id ? `${stamp}:${base.id}` : `${stamp}:${i}`,
      tvgId: base.tvgId,
    };
  });
}

function buildDescription(
  c: IptvChannel,
  source: PlaylistSource,
  platform: string,
): string {
  const parts = [`${source.name} channel`];
  if (c.group) parts.push(c.group);
  if (c.httpHeaders?.['User-Agent']) {
    parts.push(platform ? `headers · ${platform}` : 'custom User-Agent');
  }
  if (c.httpHeaders?.Cookie) parts.push('signed cookie');
  return parts.join(' · ');
}

/* ------------------------------------------------------------------ */
/*  EPG for remote channels                                           */
/* ------------------------------------------------------------------ */

const REMOTE_BANK: Record<string, [string, string][]> = {
  Sports: [
    ['Live Match', 'Live coverage right now.'],
    ['Match Rewatch', 'Catch the action you missed.'],
    ['Pre-Match Show', 'Build-up, analysis and predictions.'],
    ['Highlights', 'The best moments in one place.'],
  ],
  News: [
    ['Top of the Hour', 'Breaking stories and headlines.'],
    ['World Report', 'Global news as it happens.'],
    ['Business Bulletin', 'Markets and finance update.'],
    ['Talkback', 'Viewers weigh in live.'],
  ],
  Movie: [
    ['Now Showing', 'A feature presentation in progress.'],
    ['Coming Up', 'Stay tuned for the next premiere.'],
    ['Late Feature', 'Movie night continues.'],
  ],
  Drama: [
    ['Tonight’s Episode', 'The latest chapter of the series.'],
    ['Drama Hour', 'Emotional, must-see storytelling.'],
  ],
};

function bankFor(group: string): [string, string][] {
  const g = group.toLowerCase();
  if (g.includes('sport')) return REMOTE_BANK.Sports;
  if (g.includes('news')) return REMOTE_BANK.News;
  if (g.includes('movie') || g.includes('cinema') || g.includes('film')) return REMOTE_BANK.Movie;
  if (g.includes('drama') || g.includes('serial')) return REMOTE_BANK.Drama;
  return [
    ['On Air', 'Programming in progress.'],
    ['Up Next', 'Stay with us.'],
  ];
}

/** Build a believable, time-anchored EPG schedule for remote channels. */
export function buildRemoteEpg(channels: IptvChannel[]): EpgMap {
  const now = Date.now();
  const map: EpgMap = {};
  for (const ch of channels) {
    const bank = bankFor(ch.group);
    let seed = 2166136261;
    for (let i = 0; i < ch.id.length; i++) {
      seed ^= ch.id.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    seed >>>= 0;
    const anchor = now - (now % (30 * 60 * 1000)) - 2 * 3600 * 1000;
    const list = [];
    let t = anchor;
    let i = 0;
    while (t < now + 4 * 3600 * 1000) {
      const [title, desc] = bank[(i + seed) % bank.length];
      const dur = (30 + ((i * 13 + seed) % 31)) * 60 * 1000;
      list.push({ channel: ch.id, start: t, stop: t + dur, title, desc });
      t += dur;
      i += 1;
    }
    map[ch.id] = list;
  }
  return map;
}
