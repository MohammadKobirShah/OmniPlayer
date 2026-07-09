import { useEffect, useState } from 'react';
import { SAMPLE_CHANNELS, buildSampleEpg } from '../lib/playlist';
import { usePlayerStore } from '../store/playerStore';
import type { IptvChannel } from '../lib/m3u';
import OmniPlayer from './OmniPlayer';
import ErrorBoundary from './ErrorBoundary';

const DEMO_STREAM = 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd';

const SNIPPETS: Record<string, { label: string; lang: string; code: string }[]> = {
  cdn: [
    {
      label: 'HTML',
      lang: 'html',
      code: `<head>
  <link rel="stylesheet"
        href="https://unpkg.com/omnistream-player/dist-lib/omnistream.css" />
</head>
<body>
  <!-- host must set size + position:relative -->
  <div id="player"
       style="position:relative;width:960px;aspect-ratio:16/9"></div>

  <script src="https://unpkg.com/omnistream-player/dist-lib/omnistream.umd.js"></script>
  <script>
    OmniStream.mount('#player', {
      manifest: 'https://example.com/stream.mpd',
      title: 'My Channel',
    });
  </script>
</body>`,
    },
    {
      label: 'Declarative',
      lang: 'html',
      code: `<div
  style="position:relative;width:100%;aspect-ratio:16/9"
  data-omni-source="https://example.com/stream.mpd"
  data-omni-title="My Channel"
  data-omni-glyph="📺"
></div>
<!-- just load omnistream.umd.js — it auto-mounts! -->`,
    },
  ],
  npm: [
    {
      label: 'Install',
      lang: 'bash',
      code: `npm install omnistream-player`,
    },
    {
      label: 'Use',
      lang: 'js',
      code: `import { OmniStream } from 'omnistream-player';
import 'omnistream-player/style.css';

const player = OmniStream.mount('#player', {
  manifest: 'https://example.com/stream.m3u8',
  drm: { servers: { 'com.widevine.alpha': 'https://license...' } },
});

player.on('error', (e) => console.error(e));`,
    },
  ],
  build: [
    {
      label: 'Build the bundle',
      lang: 'bash',
      code: `# add to package.json scripts:
#   "build:lib": "vite build --config library/vite.lib.config.ts"
npm run build:lib

# output → ./dist-lib/
#   omnistream.es.js      (ES module)
#   omnistream.umd.js     (window.OmniStream)
#   omnistream.css`,
    },
    {
      label: 'Publish',
      lang: 'bash',
      code: `npm version patch
npm publish
# instantly served via unpkg / jsDelivr:
# https://unpkg.com/omnistream-player/dist-lib/omnistream.umd.js`,
    },
  ],
};

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="omni-codeblock">
      <div className="omni-codeblock-head">
        <span className="omni-code-lang">{lang}</span>
        <button className="omni-copy-btn" onClick={copy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function DistributeGuide({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<keyof typeof SNIPPETS>('cdn');

  // Seed the shared store with a single demo channel so the embedded player
  // (rendered directly below) has a source to play. Restore the app's library
  // when leaving the page.
  useEffect(() => {
    const channel: IptvChannel = {
      id: 'docs-preview',
      tvgId: 'docs-preview',
      tvgName: 'Live Embed Preview',
      name: 'Live Embed Preview',
      url: DEMO_STREAM,
      logo: null,
      group: 'Embedded',
      number: 1,
      glyph: '🚀',
      gradient: 'linear-gradient(135deg, #1a1f3a 0%, #3a1f5d 55%, #6d1f4a 100%)',
      description: 'Shaka Angel One demo stream playing inside a plain container.',
    };
    usePlayerStore.getState().setPlaylist([channel]);
    usePlayerStore.getState().selectChannel(channel.id);
    return () => {
      usePlayerStore.getState().clearChannel();
      usePlayerStore.getState().setPlaylist(SAMPLE_CHANNELS);
      usePlayerStore.getState().setEpg(buildSampleEpg(SAMPLE_CHANNELS));
    };
  }, []);

  const tabs: { id: keyof typeof SNIPPETS; label: string }[] = [
    { id: 'cdn', label: 'CDN / <script>' },
    { id: 'npm', label: 'npm module' },
    { id: 'build', label: 'Build & publish' },
  ];

  return (
    <div
      className="min-h-screen w-full text-white"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: 'radial-gradient(110% 80% at 50% -10%, #1b1b22 0%, #0b0b0b 55%), #0b0b0b',
      }}
    >
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <header className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-indigo-300">
              Distribution
            </span>
            <button
              onClick={onBack}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white"
            >
              ← Back to library
            </button>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Embed OmniStream on any website
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            The exact same engine that powers this app ships as a drop-in player — like{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">shaka-player</code>.
            Mount it with one line of JavaScript, or a single declarative{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">data-</code> attribute.
          </p>
        </header>

        {/* Live preview */}
        <section className="mb-10">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/45">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live embed preview · running right now
          </div>
          <div
            className="omni-host overflow-hidden rounded-2xl border border-white/10"
            style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}
          >
            <ErrorBoundary>
              <OmniPlayer embed />
            </ErrorBoundary>
          </div>
          <p className="mt-2 text-xs text-white/35">
            This box is just a plain <code>&lt;div&gt;</code> with{' '}
            <code>position:relative</code> + an aspect-ratio. The player fills it.
          </p>
        </section>

        {/* Tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? 'border-[#e50914] bg-[#e50914]/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Snippets */}
        <div className="grid gap-4">
          {SNIPPETS[tab].map((s) => (
            <div key={s.label}>
              <div className="mb-1.5 text-xs font-semibold text-white/50">{s.label}</div>
              <CodeBlock code={s.code} lang={s.lang} />
            </div>
          ))}
        </div>

        {/* API table */}
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">Programmatic API</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-white/50">
                <tr>
                  <th className="px-4 py-2 font-semibold">Method</th>
                  <th className="px-4 py-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/70">
                {[
                  ['mount(target, options)', 'Create a player in an element → returns a handle'],
                  ['play() · pause() · togglePlay()', 'Transport control'],
                  ['seekTo(s) · seekBy(±s)', 'Seek to time / by delta'],
                  ['setVolume(v) · mute() · unmute()', 'Audio'],
                  ['toggleFullscreen()', 'Fullscreen the host'],
                  ['reload()', 'Destroy + recreate (error/leak recovery)'],
                  ['destroy()', 'Unmount + cleanup'],
                  ['on(event, fn)', 'ready · play · pause · error · timeupdate …'],
                  ['getState()', 'Snapshot of all playback state'],
                ].map(([m, d]) => (
                  <tr key={m}>
                    <td className="px-4 py-2 font-mono text-[0.8rem] text-[#f87171]">{m}</td>
                    <td className="px-4 py-2 text-white/60">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-center text-[0.7rem] text-white/25">
          Full instructions in <code className="text-white/45">DISTRIBUTION.md</code> · reference
          config in <code className="text-white/45">library/</code>
        </p>
      </div>
    </div>
  );
}
