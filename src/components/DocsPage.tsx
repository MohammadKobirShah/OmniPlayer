import React, { useState } from 'react';
import { TvIcon } from './Icons';

interface DocsPageProps {
  onLaunchDemo: (version: 'v1' | 'v2' | 'tv') => void;
  onBack?: () => void;
}

const HOST = 'https://your-cdn.com';

const CODE_EXAMPLES = {
  v1: {
    label: 'Player v1 — Classic',
    desc: 'Full-featured OTT player with channels drawer, settings panel, stats, gestures, keyboard shortcuts.',
    features: ['Glassmorphic UI', 'Channel drawer', 'IPTV/M3U import', 'Stats for nerds', 'Touch gestures', 'Keyboard shortcuts', 'TV D-pad mode'],
    embedHTML: (host: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmniStream Player</title>

  <!-- OmniStream CSS -->
  <link rel="stylesheet" href="${host}/assets/omnistream.css">
</head>
<body>

  <!-- Player container -->
  <div id="player"></div>

  <!-- OmniStream JS -->
  <script src="${host}/assets/omnistream.js"></script>
  <script>
    OmniStream.mount('#player', {
      manifest: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
      title: 'Angel One',
      version: 'v1'
    });
  </script>
</body>
</html>`,
  },
  v2: {
    label: 'Player v2 — Premium',
    desc: 'YouTube-inspired clean player with premium icons, dynamic audio/subs tabs, smooth progress bar.',
    features: ['YouTube-style controls', 'Premium SVG icons', 'Dynamic audio/subs', 'CC button', '3-level volume', 'PiP support', 'Smooth ABR'],
    embedHTML: (host: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmniStream v2</title>
  <link rel="stylesheet" href="${host}/assets/omnistream.css">
</head>
<body>

  <div id="player"></div>

  <script src="${host}/assets/omnistream.js"></script>
  <script>
    OmniStream.mount('#player', {
      manifest: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
      title: 'Angel One',
      version: 'v2'
    });
  </script>
</body>
</html>`,
  },
  tv: {
    label: 'Player TV — Smart TV',
    desc: 'Dedicated 10-foot UI for Samsung Tizen, LG webOS, Android TV, Fire TV. D-pad navigation, remote keys.',
    features: ['10-foot UI', 'D-pad spatial nav', 'Media keys', 'Channel Up/Down', 'No backdrop-filter', 'Chrome 65+', 'Tizen/webOS/Fire TV'],
    embedHTML: (host: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>OmniStream TV</title>
  <link rel="stylesheet" href="${host}/assets/omnistream.css">
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: #000; }
  </style>
</head>
<body>

  <div id="player"></div>

  <script src="${host}/assets/omnistream.js"></script>
  <script>
    OmniStream.mount('#player', {
      manifest: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
      title: 'Angel One',
      version: 'tv'
    });
  </script>
</body>
</html>`,
  },
};

const SCRIPT_TAG_EXAMPLE = (host: string) => `<!-- Add to <head> -->
<link rel="stylesheet" href="${host}/assets/omnistream.css">

<!-- Add before </body> -->
<script src="${host}/assets/omnistream.js"></script>`;

const API_DOCS = [
  { method: 'OmniStream.mount(el, options)', desc: 'Mount player into a container element. Returns player handle.' },
  { method: 'options.manifest', desc: 'String — DASH .mpd or HLS .m3u8 URL (required)' },
  { method: 'options.title', desc: 'String — Title shown in top bar' },
  { method: 'options.version', desc: '"v1" | "v2" | "tv" — Player skin' },
  { method: 'options.autoplay', desc: 'Boolean — Auto-play on mount (default: true)' },
  { method: 'options.drm', desc: '{ type, clearKeys, servers } — DRM config' },
  { method: 'options.m3u', desc: 'String — M3U playlist content for IPTV channels' },
  { method: 'player.play()', desc: 'Start / resume playback' },
  { method: 'player.pause()', desc: 'Pause playback' },
  { method: 'player.seekTo(seconds)', desc: 'Seek to absolute time in seconds' },
  { method: 'player.setVolume(0-1)', desc: 'Set volume level' },
  { method: 'player.setQuality(id|null)', desc: 'Set quality (null = auto ABR)' },
  { method: 'player.destroy()', desc: 'Unmount and release all resources' },
  { method: 'player.on(event, fn)', desc: 'Listen to: ready, play, pause, error, timeupdate' },
];

const DRM_EXAMPLE = `// ClearKey DRM
OmniStream.mount('#player', {
  manifest: 'https://example.com/stream.mpd',
  version: 'v2',
  drm: {
    type: 'clearkey',
    clearKeys: [{
      kid: 'f6564ec2aee819046328a0e153be574d',
      key: 'ff46a8a1031eb27ef22576a077c98ab7'
    }]
  }
});

// Widevine DRM
OmniStream.mount('#player', {
  manifest: 'https://example.com/stream.mpd',
  drm: {
    type: 'widevine',
    servers: { 'com.widevine.alpha': 'https://license.example.com/v1' }
  }
});`;

const M3U_EXAMPLE = `// Load IPTV playlist with per-channel DRM
OmniStream.mount('#player', {
  version: 'v1',
  m3u: \`#EXTM3U
#EXTINF:-1 group-title="News",BBC World
https://example.com/bbc.m3u8
#EXTINF:-1 group-title="Sports",ESPN
#KODIPROP:inputstream.adaptive.license_type=clearkey
#KODIPROP:inputstream.adaptive.license_key=KID:KEY
https://example.com/espn.mpd\`
});`;

const SELF_HOST_GUIDE = `# Self-hosting OmniStream

## 1. Build
npm run build

## 2. Output files
dist/
├── index.html          ← Full demo app (single-file)
├── assets/
│   ├── omnistream.js   ← Player JS bundle
│   └── omnistream.css  ← Player styles

## 3. Deploy
# Upload dist/ to any static host:
# - Cloudflare Workers / Pages
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - Any nginx/Apache server

## 4. Use
# Reference the hosted files in your HTML:
<link rel="stylesheet" href="https://your-domain.com/assets/omnistream.css">
<script src="https://your-domain.com/assets/omnistream.js"></script>`;

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  return (
    <div className="doc-code-block">
      <div className="doc-code-header">
        <span className="doc-code-lang">{lang}</span>
        <button className="doc-copy-btn" onClick={copy}>{copied ? '✓ Copied!' : 'Copy'}</button>
      </div>
      <pre className="doc-code"><code>{code}</code></pre>
    </div>
  );
}

export const DocsPage: React.FC<DocsPageProps> = ({ onLaunchDemo, onBack }) => {
  const [activeTab, setActiveTab] = useState<'v1' | 'v2' | 'tv'>('v2');
  const [cdnHost, setCdnHost] = useState(HOST);
  const example = CODE_EXAMPLES[activeTab];

  return (
    <div className="doc-container">
      {/* Hero */}
      <div className="doc-hero">
        <div className="doc-hero-inner">
          {onBack && (
            <div className="doc-top-row">
              <button className="doc-back-btn" onClick={onBack}>← Back to Library</button>
            </div>
          )}
          <div className="doc-logo">
            <div className="doc-logo-icon"><TvIcon size={24} /></div>
            <span className="doc-logo-mark">OMNI</span>
            <span className="doc-logo-stream">STREAM</span>
          </div>
          <h1 className="doc-headline">Embed & Host Your Player</h1>
          <p className="doc-sub">
            Self-host the JS & CSS. Embed in any website with one script tag. 3 player skins included.
          </p>
        </div>
      </div>

      {/* CDN Host input */}
      <div className="doc-section">
        <h3 className="doc-section-title">Your Hosted URL</h3>
        <p className="doc-text">Enter the base URL where you'll host the player files. All embed codes below will update automatically.</p>
        <div className="doc-host-input">
          <input
            type="text"
            value={cdnHost}
            onChange={(e) => setCdnHost(e.target.value)}
            placeholder="https://your-cdn.com"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Quick Start */}
      <div className="doc-section">
        <h3 className="doc-section-title">Quick Start — Script Tags</h3>
        <p className="doc-text">Add these two lines to any HTML page:</p>
        <CodeBlock code={SCRIPT_TAG_EXAMPLE(cdnHost)} lang="HTML" />
      </div>

      {/* Version tabs */}
      <div className="doc-section">
        <h3 className="doc-section-title">Full Embed Examples</h3>
        <div className="doc-tabs">
          {(['v1', 'v2', 'tv'] as const).map((v) => (
            <button key={v} className={`doc-tab ${activeTab === v ? 'active' : ''}`}
              onClick={() => setActiveTab(v)}>
              {v === 'tv' ? '📺 TV' : v === 'v2' ? 'v2 Premium' : 'v1 Classic'}
            </button>
          ))}
        </div>

        <div className="doc-version-card">
          <div className="doc-version-info">
            <h2>{example.label}</h2>
            <p>{example.desc}</p>
            <div className="doc-features">
              {example.features.map((f) => (
                <span key={f} className="doc-feature-tag">✓ {f}</span>
              ))}
            </div>
            <button className="doc-demo-btn" onClick={() => onLaunchDemo(activeTab)}>
              ▶ Launch Live Demo
            </button>
          </div>
        </div>

        <CodeBlock code={example.embedHTML(cdnHost)} lang="HTML" />
      </div>

      {/* Self-hosting guide */}
      <div className="doc-section">
        <h3 className="doc-section-title">Self-Hosting Guide</h3>
        <p className="doc-text">Build the project and deploy the <code>dist/</code> folder to any static host.</p>
        <CodeBlock code={SELF_HOST_GUIDE} lang="Shell" />
      </div>

      {/* API Reference */}
      <div className="doc-section">
        <h3 className="doc-section-title">API Reference</h3>
        <div className="doc-api-table">
          {API_DOCS.map((row) => (
            <div key={row.method} className="doc-api-row">
              <code className="doc-api-method">{row.method}</code>
              <span className="doc-api-desc">{row.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DRM */}
      <div className="doc-section">
        <h3 className="doc-section-title">DRM Configuration</h3>
        <p className="doc-text">Supports ClearKey, Widevine, and PlayReady. Also parses #KODIPROP from M3U playlists.</p>
        <CodeBlock code={DRM_EXAMPLE} lang="JavaScript" />
      </div>

      {/* M3U */}
      <div className="doc-section">
        <h3 className="doc-section-title">IPTV / M3U Import</h3>
        <p className="doc-text">Load channel playlists with groups, logos, and per-channel DRM configuration.</p>
        <CodeBlock code={M3U_EXAMPLE} lang="JavaScript" />
      </div>

      {/* Platform Matrix */}
      <div className="doc-section">
        <h3 className="doc-section-title">Platform Support</h3>
        <div className="doc-platform-grid">
          {[
            { platform: 'Chrome', min: '65+', icon: '🌐' },
            { platform: 'Firefox', min: '74+', icon: '🦊' },
            { platform: 'Edge', min: '80+', icon: '🔷' },
            { platform: 'Safari', min: '14+ (HLS)', icon: '🧭' },
            { platform: 'Android TV', min: 'Android 7+', icon: '📺' },
            { platform: 'Samsung Tizen', min: '2017+', icon: '📱' },
            { platform: 'LG webOS', min: '3.0+', icon: '🖥' },
            { platform: 'Fire TV', min: 'All models', icon: '🔥' },
            { platform: 'Xbox', min: 'Edge', icon: '🎮' },
            { platform: 'PlayStation', min: 'PS4/PS5', icon: '🎯' },
          ].map((p) => (
            <div key={p.platform} className="doc-platform-card">
              <span className="doc-platform-icon">{p.icon}</span>
              <span className="doc-platform-name">{p.platform}</span>
              <span className="doc-platform-min">{p.min}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Version comparison */}
      <div className="doc-section">
        <h3 className="doc-section-title">Version Comparison</h3>
        <div className="doc-api-table">
          {[
            { feature: 'UI Style', v1: 'Glassmorphic OTT', v2: 'YouTube minimal', tv: '10-foot leanback' },
            { feature: 'Controls', v1: 'Center + Bottom', v2: 'Bottom only', tv: 'Center + Bottom' },
            { feature: 'Settings', v1: '4-tab glass panel', v2: 'Compact dynamic tabs', tv: 'Fullscreen overlay' },
            { feature: 'Channel Drawer', v1: '✓', v2: '—', tv: '—' },
            { feature: 'Touch Gestures', v1: '✓', v2: '✓', tv: '—' },
            { feature: 'D-pad Navigation', v1: 'Basic', v2: '—', tv: '✓ Full spatial' },
            { feature: 'Media Remote Keys', v1: 'Basic', v2: '—', tv: '✓ Full' },
            { feature: 'Stats Panel', v1: '✓', v2: '—', tv: '—' },
            { feature: 'PiP', v1: '✓', v2: '✓', tv: '—' },
            { feature: 'Min Browser', v1: 'Chrome 80+', v2: 'Chrome 80+', tv: 'Chrome 65+' },
          ].map((row) => (
            <div key={row.feature} className="doc-api-row doc-compare-row">
              <span className="doc-compare-feature">{row.feature}</span>
              <span className="doc-compare-val">{row.v1}</span>
              <span className="doc-compare-val">{row.v2}</span>
              <span className="doc-compare-val">{row.tv}</span>
            </div>
          ))}
          <div className="doc-api-row doc-compare-row doc-compare-header">
            <span className="doc-compare-feature">Feature</span>
            <span className="doc-compare-val">v1</span>
            <span className="doc-compare-val">v2</span>
            <span className="doc-compare-val">TV</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="doc-footer">
        <span className="doc-footer-brand">
          <span className="doc-logo-mark">OMNI</span>
          <span className="doc-logo-stream">STREAM</span>
        </span>
        <span>Professional Media Player · Shaka Player + React + Zustand</span>
      </footer>
    </div>
  );
};
