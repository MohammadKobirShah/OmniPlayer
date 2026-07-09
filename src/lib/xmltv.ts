export interface EpgProgramme {
  channel: string;
  /** Start time in epoch milliseconds. */
  start: number;
  /** Stop time in epoch milliseconds. */
  stop: number;
  title: string;
  desc: string;
}

export type EpgMap = Record<string, EpgProgramme[]>;

/**
 * Parse an XMLTV date string. Accepts the canonical format
 * `YYYYMMDDHHmmss +ZZZZ`, the `...Z` shorthand, or any ISO-8601 string.
 */
export function parseXmltvDate(raw: string): number {
  if (!raw) return NaN;
  const m = raw
    .trim()
    .match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4}|Z)?$/);
  if (!m) {
    const t = Date.parse(raw);
    return Number.isNaN(t) ? NaN : t;
  }
  const [, y, mo, d, h, mi, s, tz] = m;
  const tzPart = !tz || tz === 'Z' ? '' : tz.slice(0, 3) + ':' + tz.slice(3);
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${tzPart}`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? NaN : t;
}

/** Format an epoch-ms timestamp as a localized `HH:MM` clock. */
export function formatClock(ms: number): string {
  if (!Number.isFinite(ms)) return '--:--';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Parse an XMLTV `<tv>` document into a map of channel → programmes. */
export function parseXMLTV(xml: string): EpgMap {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const map: EpgMap = {};
  const programmes = doc.querySelectorAll('programme');
  programmes.forEach((p) => {
    const channel = p.getAttribute('channel') || '';
    if (!channel) return;
    const start = parseXmltvDate(p.getAttribute('start') || '');
    const stop = parseXmltvDate(p.getAttribute('stop') || '');
    const title = p.querySelector('title')?.textContent?.trim() || 'Unknown Program';
    const desc = p.querySelector('desc')?.textContent?.trim() || '';
    (map[channel] ||= []).push({ channel, start, stop, title, desc });
  });
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.start - b.start));
  return map;
}

/* --------------------------- Runtime helpers ------------------------------ */

export interface NowNext {
  current?: EpgProgramme;
  next?: EpgProgramme;
}

/** Find the currently-airing and the next programme for a channel. */
export function nowNext(epg: EpgMap, channelId: string, now = Date.now()): NowNext {
  const list = epg[channelId];
  if (!list) return {};
  const current = list.find((p) => p.start <= now && p.stop > now);
  const next = list.find((p) => p.start > now);
  return { current, next };
}

/** Playback progress (0–1) of a programme at a given time. */
export function progressOf(p: EpgProgramme | undefined, now = Date.now()): number {
  if (!p || !p.stop || p.stop === p.start) return 0;
  return Math.min(1, Math.max(0, (now - p.start) / (p.stop - p.start)));
}

/** Human-friendly duration like "45 min". */
export function durationLabel(p: EpgProgramme): string {
  const mins = Math.max(1, Math.round((p.stop - p.start) / 60000));
  return `${mins} min`;
}
