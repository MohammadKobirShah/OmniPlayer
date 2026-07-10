import type { DrmConfig } from './streams';

export interface IptvChannel {
  id: string;
  name: string;
  url: string;
  logo: string | null;
  group: string;
  number: number;
  tvgId: string | null;
  tvgName: string | null;
  /** Emoji / glyph used for the channel logo tile. */
  glyph: string;
  /** CSS gradient used for the channel logo tile. */
  gradient: string;
  drm?: DrmConfig;
  isLive?: boolean;
  description?: string;
  /**
   * Custom HTTP headers required by protected IPTV streams (Toffee Live, Sony
   * YAY! VIP, etc.). Parsed from `#EXTVLCOPT` / `#EXTHTTP` directives. Because
   * browsers forbid setting `User-Agent` / `Cookie` directly, these are routed
   * through a proxy that re-injects the real headers (see `lib/proxy.ts`).
   */
  httpHeaders?: Record<string, string>;
}

export interface ParsedPlaylist {
  channels: IptvChannel[];
  groups: string[];
}

/* ----------------------------- UI enrichment ----------------------------- */

const PALETTE = [
  'linear-gradient(135deg, #1a1f3a 0%, #3a1f5d 55%, #6d1f4a 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #200122 0%, #6f0000 100%)',
  'linear-gradient(135deg, #232526 0%, #414345 100%)',
  'linear-gradient(135deg, #1f3c2e 0%, #2d5a3d 50%, #3a7d4f 100%)',
  'linear-gradient(135deg, #3a1c1c 0%, #6d2e46 50%, #c64b8c 100%)',
  'linear-gradient(135deg, #0b486b 0%, #f56217 100%)',
  'linear-gradient(135deg, #16222a 0%, #3a6073 100%)',
  'linear-gradient(135deg, #42275a 0%, #734b6d 100%)',
  'linear-gradient(135deg, #06121a 0%, #1d4052 60%, #2b8a9b 100%)',
];

const GLYPH_RULES: [RegExp, string][] = [
  [/news|world|cnn|bbc|al jazeera|headline/i, '📡'],
  [/movie|cinema|film|theater|premier|imax/i, '🎬'],
  [/sport|espn|goal|match|arena|champion/i, '⚽'],
  [/music|mtv|beat|radio|sound/i, '🎵'],
  [/kids|cartoon|toon|disney|junior/i, '🧸'],
  [/bunny|buck|rabbit|animal|wild|nature|ocean|sea|earth/i, '🐰'],
  [/sci|space|star|galaxy|orbital|nasa|future|sintel|angel|trek/i, '🚀'],
  [/tech|demo|dev|code|lab|mux|test|sample/i, '🔬'],
  [/anim|anime|render|blend/i, '🎞️'],
  [/food|cook|kitchen|taste/i, '🍳'],
  [/travel|explore|globe|journey/i, '🧭'],
  [/live|24|now|stream|hd channel/i, '📺'],
  [/protect|drm|widevine|vault|secure/i, '🔒'],
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickGradient(seed: string): string {
  return PALETTE[hashStr(seed) % PALETTE.length];
}

export function glyphFor(name: string): string {
  for (const [re, g] of GLYPH_RULES) {
    if (re.test(name)) return g;
  }
  const letter = name.trim()[0];
  return letter ? letter.toUpperCase() : '📺';
}

/** Normalize a header name, e.g. `x-custom` → `X-Custom`. */
function capitalizeHeader(name: string): string {
  return name
    .toLowerCase()
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join('-');
}

/** Derive a container type ("DASH" | "HLS") from a manifest URL. */
export function guessContainer(url: string): 'DASH' | 'HLS' {
  const u = (url || '').toLowerCase().split('?')[0];
  if (u.endsWith('.mpd')) return 'DASH';
  return 'HLS';
}

function enrich(base: Omit<IptvChannel, 'glyph' | 'gradient'>): IptvChannel {
  return {
    ...base,
    glyph: glyphFor(base.name + ' ' + base.group),
    gradient: pickGradient(base.id + base.name),
  };
}

/* -------------------------------- Parser --------------------------------- */

function attr(line: string, key: string): string | null {
  const m = line.match(new RegExp(`${key}="([^"]*)"`, 'i'));
  return m ? m[1] : null;
}

/**
 * Parse an M3U / extended-M3U playlist string into structured channels.
 * Supports `#EXTINF` attributes (tvg-id, tvg-name, tvg-logo, group-title) and
 * the bare `#EXTGRP:` directive. Logo tiles are auto-generated via CSS, so the
 * (often-dead) tvg-logo URL is captured but not depended upon for layout.
 */
export function parseM3U(text: string): ParsedPlaylist {
  const lines = text.split(/\r?\n/);
  const channels: IptvChannel[] = [];
  let pending: {
    name: string;
    group: string;
    tvgId: string | null;
    tvgName: string | null;
    logo: string | null;
    httpHeaders: Record<string, string>;
  } | null = null;
  let counter = 0;

  const flush = (url: string) => {
    counter += 1;
    const p = pending ?? {
      name: 'Unknown Channel',
      group: 'Uncategorized',
      tvgId: null,
      tvgName: null,
      logo: null,
      httpHeaders: {},
    };
    channels.push(
      enrich({
        id: p.tvgId || p.tvgName || `ch-${counter}`,
        name: p.name,
        url,
        logo: p.logo,
        group: p.group,
        number: counter,
        tvgId: p.tvgId,
        tvgName: p.tvgName,
        httpHeaders: Object.keys(p.httpHeaders).length ? p.httpHeaders : undefined,
      }),
    );
    pending = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const nameMatch = line.match(/,(.*)$/);
      pending = {
        name: nameMatch ? nameMatch[1].trim() : 'Unknown Channel',
        group: (attr(line, 'group-title') || 'Uncategorized').trim() || 'Uncategorized',
        tvgId: attr(line, 'tvg-id'),
        tvgName: attr(line, 'tvg-name'),
        logo: attr(line, 'tvg-logo'),
        httpHeaders: {},
      };
    } else if (line.toUpperCase().startsWith('#EXTGRP:')) {
      const g = line.slice(line.indexOf(':') + 1).trim();
      if (pending && g) pending.group = g;
    } else if (line.toUpperCase().startsWith('#EXTVLCOPT:')) {
      // VLC options, e.g. `#EXTVLCOPT:http-user-agent=<ua>` or `#EXTVLCOPT:http-referrer=<url>`.
      const opt = line.slice('#EXTVLCOPT:'.length).trim();
      const eq = opt.indexOf('=');
      if (pending && eq > 0) {
        const key = opt.slice(0, eq).trim().toLowerCase();
        const val = opt.slice(eq + 1).trim();
        if (key === 'http-user-agent') pending.httpHeaders['User-Agent'] = val;
        else if (key === 'http-referrer' || key === 'http-referer') pending.httpHeaders['Referer'] = val;
        else if (key.startsWith('http-')) pending.httpHeaders[capitalizeHeader(key.slice(5))] = val;
      }
    } else if (line.toUpperCase().startsWith('#EXTHTTP:')) {
      // A JSON object of raw HTTP headers, e.g. `#EXTHTTP:{"cookie":"..."}`.
      if (pending) {
        try {
          const obj = JSON.parse(line.slice('#EXTHTTP:'.length).trim());
          if (obj && typeof obj === 'object') {
            for (const [k, v] of Object.entries(obj)) {
              if (typeof v === 'string') pending.httpHeaders[capitalizeHeader(k)] = v;
            }
          }
        } catch {
          /* malformed #EXTHTTP — ignore */
        }
      }
    } else if (!line.startsWith('#')) {
      // A media URL.
      flush(line);
    }
  }

  const seen = new Set<string>();
  const groups: string[] = [];
  for (const c of channels) {
    if (!seen.has(c.group)) {
      seen.add(c.group);
      groups.push(c.group);
    }
  }

  return { channels, groups };
}

/** Serialize channels back to an extended-M3U string (round-trip / export). */
export function toM3U(channels: IptvChannel[]): string {
  const out = ['#EXTM3U'];
  for (const c of channels) {
    const attrs = [
      c.tvgId ? `tvg-id="${c.tvgId}"` : null,
      `tvg-name="${c.name}"`,
      c.logo ? `tvg-logo="${c.logo}"` : null,
      `group-title="${c.group}"`,
    ]
      .filter(Boolean)
      .join(' ');
    out.push(`#EXTINF:-1 ${attrs},${c.name}`);
    // Re-emit VLC + HTTP directives so protected streams round-trip.
    if (c.httpHeaders) {
      const ua = c.httpHeaders['User-Agent'];
      if (ua) out.push(`#EXTVLCOPT:http-user-agent=${ua}`);
      const { ['User-Agent']: _omit, ...rest } = c.httpHeaders;
      if (Object.keys(rest).length) out.push(`#EXTHTTP:${JSON.stringify(rest)}`);
    }
    out.push(c.url);
  }
  return out.join('\n');
}
