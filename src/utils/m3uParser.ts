import type { IPTVChannel, DRMConfig, ClearKeyPair } from '../store/playerStore';

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f5576c 0%, #ff6f91 100%)',
  'linear-gradient(135deg, #0250c5 0%, #d43f8d 100%)',
];

const glyphs = ['📺', '🎬', '📡', '🌐', '🎭', '🎵', '⚡', '🔮', '🎪', '🌟', '📻', '🎯'];

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Parse metadata lines between #EXTINF and URL ──
interface ChannelMeta {
  drm?: DRMConfig;
  headers: Record<string, string>;
  httpHeaders?: Record<string, string>; // from #EXTHTTP
}

function parseMetaLines(lines: string[]): ChannelMeta {
  let licenseType = '';
  let licenseKey = '';
  const headers: Record<string, string> = {};
  let httpHeaders: Record<string, string> | undefined;

  for (const raw of lines) {
    const line = raw.trim();

    // #KODIPROP:inputstream.adaptive.license_type=clearkey
    if (line.toLowerCase().includes('license_type=')) {
      licenseType = line.split('=').slice(1).join('=').trim().toLowerCase();
    }
    // #KODIPROP:inputstream.adaptive.license_key=KID:KEY
    if (line.toLowerCase().includes('license_key=')) {
      licenseKey = line.split('=').slice(1).join('=').trim();
    }

    // #EXTVLCOPT:http-referrer=URL
    if (line.toLowerCase().startsWith('#extvlcopt:http-referrer=')) {
      headers['Referer'] = line.split('=').slice(1).join('=').trim();
    }
    // #EXTVLCOPT:http-user-agent=UA
    if (line.toLowerCase().startsWith('#extvlcopt:http-user-agent=')) {
      headers['User-Agent'] = line.split('=').slice(1).join('=').trim();
    }
    // #EXTVLCOPT:http-origin=URL
    if (line.toLowerCase().startsWith('#extvlcopt:http-origin=')) {
      headers['Origin'] = line.split('=').slice(1).join('=').trim();
    }

    // #EXTHTTP:{"key":"value",...}
    if (line.startsWith('#EXTHTTP:')) {
      try {
        const json = line.substring(9).trim();
        const parsed = JSON.parse(json);
        if (typeof parsed === 'object' && parsed !== null) {
          httpHeaders = {};
          for (const k of Object.keys(parsed)) {
            httpHeaders[k] = String(parsed[k]);
            // Also normalize common header names
            if (k.toLowerCase().includes('authorization') || k.toLowerCase().includes('x-authorization')) {
              headers[k] = String(parsed[k]);
            }
          }
        }
      } catch { /* ignore bad JSON */ }
    }
  }

  // Merge httpHeaders into headers
  if (httpHeaders) {
    for (const k of Object.keys(httpHeaders)) {
      if (!headers[k]) headers[k] = httpHeaders[k];
    }
  }

  // Build DRM config
  let drm: DRMConfig | undefined;

  if (licenseType === 'clearkey' || licenseType === 'org.w3.clearkey') {
    if (licenseKey) {
      const clearKeys: ClearKeyPair[] = [];
      if (licenseKey.startsWith('{') || licenseKey.startsWith('[')) {
        try {
          const parsed = JSON.parse(licenseKey.startsWith('[') ? licenseKey : '[' + licenseKey + ']');
          for (const entry of parsed) {
            if (entry.kid && entry.key) clearKeys.push({ kid: entry.kid, key: entry.key });
          }
        } catch { /* bad JSON */ }
      } else {
        const pairs = licenseKey.split(',');
        for (const pair of pairs) {
          const parts = pair.trim().split(':');
          if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
            clearKeys.push({ kid: parts[0].trim(), key: parts[1].trim() });
          }
        }
      }
      if (clearKeys.length > 0) drm = { type: 'clearkey', clearKeys };
    }
  } else if (licenseType.includes('widevine') || licenseType === 'com.widevine.alpha') {
    if (licenseKey) drm = { type: 'widevine', servers: { 'com.widevine.alpha': licenseKey } };
  } else if (licenseType.includes('playready') || licenseType === 'com.microsoft.playready') {
    if (licenseKey) drm = { type: 'playready', servers: { 'com.microsoft.playready': licenseKey } };
  }

  return { drm, headers, httpHeaders };
}

// ── Parse URL with pipe headers: url|referer=X&origin=Y ──
function parseUrlWithHeaders(rawUrl: string): { url: string; headers: Record<string, string> } {
  const pipeIdx = rawUrl.indexOf('|');
  if (pipeIdx === -1) return { url: rawUrl, headers: {} };

  const url = rawUrl.substring(0, pipeIdx);
  const headerStr = rawUrl.substring(pipeIdx + 1);
  const headers: Record<string, string> = {};

  // Parse key=value pairs separated by &
  const pairs = headerStr.split('&');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx > 0) {
      const key = pair.substring(0, eqIdx).trim();
      const val = pair.substring(eqIdx + 1).trim();
      // Normalize header names
      if (key.toLowerCase() === 'referer' || key.toLowerCase() === 'referrer') {
        headers['Referer'] = val;
      } else if (key.toLowerCase() === 'origin') {
        headers['Origin'] = val;
      } else if (key.toLowerCase() === 'user-agent' || key.toLowerCase() === 'useragent') {
        headers['User-Agent'] = val;
      } else {
        headers[key] = val;
      }
    }
  }

  return { url, headers };
}

function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('rtmp://') || str.startsWith('rtsp://');
}

export function parseM3U(content: string): { channels: IPTVChannel[] } {
  const lines = content.split('\n');
  const channels: IPTVChannel[] = [];

  // Find #EXTM3U — allow leading whitespace/blank lines
  let startIdx = 0;
  while (startIdx < lines.length) {
    if (lines[startIdx].trim().startsWith('#EXTM3U')) break;
    startIdx++;
  }
  if (startIdx >= lines.length) return { channels: [] };

  let i = startIdx + 1;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines, comments (=====), bare text
    if (!line || line === '' ||
        (line.startsWith('#') && !line.startsWith('#EXTINF') && !line.startsWith('#EXTM3U'))) {
      i++;
      continue;
    }

    // ── #EXTINF line found ──
    if (line.startsWith('#EXTINF:')) {
      // Parse attributes
      const nameMatch = line.match(/,(.+)$/);
      const name = nameMatch ? nameMatch[1].trim() : 'Channel ' + (channels.length + 1);
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      const group = groupMatch ? groupMatch[1] : 'Uncategorized';
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const logo = logoMatch ? logoMatch[1] : undefined;
      // tvg-id and tvg-name parsed but reserved for EPG matching
      // const tvgId = line.match(/tvg-id="([^"]*)"/i)?.[1];
      // const tvgName = line.match(/tvg-name="([^"]*)"/i)?.[1];

      // Collect all meta lines (#KODIPROP, #EXTVLCOPT, #EXTHTTP) until URL
      const metaLines: string[] = [];
      i++;
      while (i < lines.length) {
        const ml = lines[i].trim();
        if (!ml || ml === '') { i++; continue; } // skip blank
        if (ml.startsWith('#KODIPROP:') || ml.startsWith('#EXTVLCOPT:') || ml.startsWith('#EXTHTTP:')) {
          metaLines.push(ml);
          i++;
          continue;
        }
        // Skip comment lines (including #https:// commented-out URLs)
        if (ml.startsWith('#')) { i++; continue; }
        // This should be the URL
        break;
      }

      // Get URL line
      if (i < lines.length) {
        const rawUrlLine = lines[i].trim();
        if (isUrl(rawUrlLine)) {
          // Parse URL (may have |referer=...&origin=...)
          const { url, headers: urlHeaders } = parseUrlWithHeaders(rawUrlLine);

          // Parse meta lines
          const meta = parseMetaLines(metaLines);

          // Merge all headers: meta headers + URL pipe headers
          const allHeaders: Record<string, string> = {};
          for (const k of Object.keys(meta.headers)) allHeaders[k] = meta.headers[k];
          for (const k of Object.keys(urlHeaders)) allHeaders[k] = urlHeaders[k];

          const hash = hashStr(name + url);
          const isLive = url.includes('.m3u8') || url.includes('.mpd') || url.includes('live') || url.includes('.ts');

          const hasHeaders = Object.keys(allHeaders).length > 0;

          channels.push({
            id: 'ch-' + hash + '-' + channels.length,
            name: name,
            url: url,
            group: group,
            logo: logo,
            glyph: glyphs[hash % glyphs.length],
            gradient: gradients[hash % gradients.length],
            number: channels.length + 1,
            isLive: isLive,
            drm: meta.drm,
            headers: hasHeaders ? allHeaders : undefined,
          });
        }
      }
    }

    i++;
  }

  return { channels };
}

/**
 * Fetch an M3U playlist from a URL and parse it.
 */
export async function fetchAndParseM3U(url: string): Promise<{ channels: IPTVChannel[] }> {
  try {
    const resp = await fetch(url, {
      mode: 'cors',
      headers: { 'Accept': 'text/plain, application/x-mpegurl, */*' },
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    return parseM3U(text);
  } catch (err) {
    console.error('[OmniStream] Failed to fetch M3U:', err);
    return { channels: [] };
  }
}

export function getStreamType(url: string): string {
  if (url.includes('.mpd')) return 'DASH';
  if (url.includes('.m3u8')) return 'HLS';
  if (url.includes('.mp4')) return 'MP4';
  if (url.includes('.webm')) return 'WebM';
  if (url.includes('.ts')) return 'TS';
  return 'Stream';
}

export function getDrmLabel(drm?: DRMConfig): string {
  if (!drm) return 'Clear';
  switch (drm.type) {
    case 'clearkey': return 'ClearKey';
    case 'widevine': return 'Widevine';
    case 'playready': return 'PlayReady';
    default: return 'Clear';
  }
}

export const sampleM3U = '#EXTM3U\n\
#EXTINF:-1 tvg-name="Angel One (DASH)" group-title="Demo Streams",Angel One — DASH\n\
https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd\n\
#EXTINF:-1 tvg-name="Big Buck Bunny (HLS)" group-title="Demo Streams",Big Buck Bunny — HLS\n\
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8\n\
#EXTINF:-1 tvg-name="Sintel (DASH)" group-title="Demo Streams",Sintel — DASH\n\
https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd\n\
#EXTINF:-1 tvg-name="Tears of Steel (DASH)" group-title="Demo Streams",Tears of Steel — DASH\n\
https://storage.googleapis.com/shaka-demo-assets/tos/dash.mpd\n\
#EXTINF:-1 tvg-name="Heliocentrism (DASH)" group-title="Demo Streams",Heliocentrism — DASH\n\
https://storage.googleapis.com/shaka-demo-assets/heliocentrism/heliocentrism.mpd\n\
#EXTINF:-1 tvg-name="ClearKey DRM Test (DASH)" group-title="DRM Streams",ClearKey DRM — Live DASH\n\
#KODIPROP:inputstream.adaptive.license_type=clearkey\n\
#KODIPROP:inputstream.adaptive.license_key=f6564ec2aee819046328a0e153be574d:ff46a8a1031eb27ef22576a077c98ab7\n\
https://otte.cache.aiv-cdn.net/bom-nitro/live/clients/enc/ajfoeddkbz/out/v1/b78800b9b2304879b15843f455836829/cenc.mpd';
