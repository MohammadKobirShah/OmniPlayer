/**
 * Protected-stream proxy helpers.
 *
 * Many IPTV providers (Toffee Live, Sony YAY! VIP, etc.) protect their streams
 * with custom HTTP headers — most commonly `User-Agent` and `Cookie`. The
 * browser's security model marks these as **forbidden header names**: you
 * cannot set `User-Agent` / `Cookie` / `Referer` / `Origin` from JavaScript,
 * so Shaka's request filter cannot attach them directly.
 *
 * Solution: route every request (manifest + segments + keys) through a small
 * same-origin/CORS-enabled proxy. The filter rewrites the URL to the proxy and
 * forwards the headers under `X-` prefixed names; the proxy strips the prefix
 * and injects the real headers server-side. See `proxy/server.js`.
 */

/* The full set of header names the browser refuses to let JS set. Any of these
   that a stream requires MUST go through the proxy. */
const FORBIDDEN_HEADERS = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'feature-policy',
  'host',
  'keep-alive',
  'origin',
  'proxy-', // prefix
  'referer',
  'referer2',
  'sec-', // prefix
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
  'user-agent',
]);

export function isForbiddenHeader(name: string): boolean {
  const lower = name.toLowerCase();
  if (FORBIDDEN_HEADERS.has(lower)) return true;
  return lower.startsWith('proxy-') || lower.startsWith('sec-');
}

/** Split headers into (browser-safe, must-proxy) buckets. */
export function partitionHeaders(
  headers: Record<string, string>,
): { safe: Record<string, string>; proxied: Record<string, string> } {
  const safe: Record<string, string> = {};
  const proxied: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (isForbiddenHeader(k)) proxied[k] = v;
    else safe[k] = v;
  }
  return { safe, proxied };
}

let configuredProxyBase = '';

/**
 * Set the proxy base URL at runtime, e.g. `https://my-site.com/proxy`.
 * When set, protected streams route through it. Leave empty to disable
 * (protected streams will then fail with a clear error hint).
 */
export function setProxyBase(url: string): void {
  configuredProxyBase = url.replace(/\/+$/, '');
}

export function getProxyBase(): string {
  return configuredProxyBase;
}

export function isProxyConfigured(): boolean {
  return configuredProxyBase.length > 0;
}

/** Does this header set require a proxy (i.e. any forbidden header present)? */
export function needsProxy(headers?: Record<string, string>): boolean {
  if (!headers) return false;
  return Object.keys(headers).some(isForbiddenHeader);
}

/**
 * Rewrite an upstream URL to route through the configured proxy.
 * The proxy reads the target from the `url` query param.
 */
export function proxyUrl(originalUrl: string): string {
  const sep = configuredProxyBase.includes('?') ? '&' : '?';
  return `${configuredProxyBase}${sep}url=${encodeURIComponent(originalUrl)}`;
}

export type HeaderAssignment = {
  /** Headers applied as-is to the request (browser permits these). */
  safe: Record<string, string>;
  /** Forbidden headers forwarded to the proxy under `X-` prefixes. */
  proxied: Record<string, string>;
  /** Final URI to use for this request (proxied if needed). */
  uri: string;
};

/**
 * Given a request URI and the channel's headers, decide the final URI and the
 * two header buckets. The proxy translates `X-User-Agent` → `User-Agent`, etc.
 */
export function resolveProxiedRequest(
  originalUri: string,
  headers?: Record<string, string>,
): HeaderAssignment {
  const { safe, proxied } = partitionHeaders(headers ?? {});
  const mustProxy = Object.keys(proxied).length > 0;

  if (!mustProxy) {
    // Plain custom headers only — attach directly (subject to target CORS).
    return { safe, proxied: {}, uri: originalUri };
  }

  // Forbidden headers present → must route through the proxy.
  const xHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(proxied)) {
    xHeaders[`X-${k}`] = v;
  }

  if (!isProxyConfigured()) {
    // Caller should detect this and surface a clear error instead.
    return { safe, proxied, uri: originalUri };
  }

  // If this URL is ALREADY a proxy URL (e.g. a segment whose URL was rewritten
  // inside a proxied HLS manifest), don't double-encode it — just keep the URI
  // and re-attach the X- headers so the proxy can re-inject them.
  const base = getProxyBase();
  if (base && originalUri.startsWith(base)) {
    return { safe, proxied: xHeaders, uri: originalUri };
  }

  return { safe, proxied: xHeaders, uri: proxyUrl(originalUri) };
}
