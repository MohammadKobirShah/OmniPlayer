import { useEffect, useMemo, useState } from 'react';
import { usePlayerStore } from './store/playerStore';
import { SAMPLE_CHANNELS, buildSampleEpg } from './lib/playlist';
import { guessContainer } from './lib/m3u';
import { detectDevice } from './lib/deviceDetect';
import OmniPlayer from './components/OmniPlayer';
import DistributeGuide from './components/DistributeGuide';
import { SearchIcon, StarIcon, PlayIcon } from './components/icons';

const FEATURES = ['Headless Shaka v4', 'M3U + XMLTV/EPG', 'Widevine DRM', 'Mobile Gestures', 'Chromecast'];

export default function App() {
  const channels = usePlayerStore((s) => s.iptvChannels);
  const groups = usePlayerStore((s) => s.iptvGroups);
  const favorites = usePlayerStore((s) => s.favorites);
  const setPlaylist = usePlayerStore((s) => s.setPlaylist);
  const setEpg = usePlayerStore((s) => s.setEpg);
  const selectChannel = usePlayerStore((s) => s.selectChannel);

  const [view, setView] = useState<'library' | 'player' | 'docs'>('library');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('All');

  const setTvMode = usePlayerStore((s) => s.setTvMode);
  const setReduceMotion = usePlayerStore((s) => s.setReduceMotion);

  // Detect device profile + load the IPTV playlist / EPG once on startup.
  useEffect(() => {
    const dev = detectDevice();
    setTvMode(dev.isSmartTV);
    setReduceMotion(dev.prefersReducedMotion || dev.isLowPerf);
    setPlaylist(SAMPLE_CHANNELS);
    setEpg(buildSampleEpg(SAMPLE_CHANNELS));
  }, [setPlaylist, setEpg, setTvMode, setReduceMotion]);

  const launch = (id: string) => {
    selectChannel(id);
    setView('player');
  };

  const filters = useMemo(() => {
    const favRow = favorites.length ? ['★ Favorites'] : [];
    return ['All', ...favRow, ...groups];
  }, [groups, favorites.length]);

  const filtered = useMemo(() => {
    let pool = channels;
    if (group === '★ Favorites') pool = pool.filter((c) => favorites.includes(c.id));
    else if (group !== 'All') pool = pool.filter((c) => c.group === group);
    const q = query.trim().toLowerCase();
    if (q) pool = pool.filter((c) => c.name.toLowerCase().includes(q));
    return pool;
  }, [channels, group, favorites, query]);

  if (view === 'player') {
    return <OmniPlayer onExit={() => setView('library')} />;
  }

  if (view === 'docs') {
    return <DistributeGuide onBack={() => setView('library')} />;
  }

  return (
    <div
      className="min-h-screen w-full text-white"
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        background: 'radial-gradient(110% 80% at 50% -10%, #1b1b22 0%, #0b0b0b 55%), #0b0b0b',
      }}
    >
      {/* Glow accents */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/2 h-[460px] w-[760px] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(229,9,20,0.5), transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-white/60">
                Phase 2–3 · IPTV &amp; Premium
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-emerald-300">
                ● {channels.length} Channels · EPG Live
              </span>
            </div>
            <h1 className="flex items-baseline gap-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
              <span style={{ color: '#e50914', textShadow: '0 0 26px rgba(229,9,20,0.55)' }}>OMNI</span>
              <span className="tracking-[0.3em] text-white/90">STREAM</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
              A headless Shaka engine wrapped in a TiviMate-style IPTV experience — M3U playlists,
              XMLTV programme guide, mobile gestures and Chromecast. Pick a channel to enter.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <button
              onClick={() => setView('docs')}
              className="rounded-xl border border-[#e50914]/40 bg-[#e50914]/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.03] hover:bg-[#e50914]/25"
            >
              📦 Embed this player →
            </button>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map((f) => (
                <span
                  key={f}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[0.72rem] font-medium text-white/60"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* Toolbar */}
        <div className="mb-7 flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <SearchIcon size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search channels…"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="rounded-md px-2 py-0.5 text-xs text-white/40 hover:text-white/80"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  group === g
                    ? 'border-[#e50914] bg-[#e50914]/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] py-16 text-center text-sm text-white/40">
            No channels match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => {
              const isDrm = !!c.drm;
              const container = guessContainer(c.url);
              return (
                <button
                  key={c.id}
                  onClick={() => launch(c.id)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-2xl hover:shadow-black/50"
                >
                  <div
                    className="relative flex aspect-video items-center justify-center overflow-hidden"
                    style={{ background: c.gradient }}
                  >
                    <span className="text-5xl drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
                      {c.glyph}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15" />

                    <div className="absolute left-2.5 top-2.5 flex gap-1.5">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[0.6rem] font-bold tracking-wide backdrop-blur-sm ${
                          isDrm
                            ? 'border-amber-400/40 bg-amber-400/15 text-amber-300'
                            : 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                        }`}
                      >
                        {isDrm ? 'Widevine' : 'Clear'}
                      </span>
                      {c.isLive && (
                        <span className="flex items-center gap-1 rounded-md border border-red-400/40 bg-red-500/20 px-2 py-0.5 text-[0.6rem] font-bold tracking-wide text-red-300 backdrop-blur-sm">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> LIVE
                        </span>
                      )}
                    </div>
                    <span className="absolute right-2.5 top-2.5 rounded-md bg-black/55 px-2 py-0.5 text-[0.6rem] font-bold tracking-wide text-white/80 backdrop-blur-sm">
                      {container}
                    </span>
                    <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/55 px-2 py-0.5 text-[0.62rem] font-bold tracking-wide text-white/70 backdrop-blur-sm">
                      CH {c.number}
                    </span>

                    {/* Play hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e50914] shadow-[0_0_30px_rgba(229,9,20,0.6)] transition-transform duration-300 group-hover:scale-110">
                        <PlayIcon size={24} />
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-[0.95rem] font-bold text-white">{c.name}</h3>
                      {favorites.includes(c.id) && <StarIcon size={14} className="shrink-0 text-amber-400" />}
                    </div>
                    <p className="mt-0.5 truncate text-[0.72rem] text-white/40">{c.group}</p>
                    {c.description && (
                      <p className="mt-1.5 line-clamp-2 text-[0.76rem] leading-relaxed text-white/45">
                        {c.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[0.78rem] leading-relaxed text-white/40">
          <strong className="text-white/70">Tips:</strong> Inside the player press{' '}
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[0.7rem] text-white/80">G</kbd> for the
          channel drawer, <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[0.7rem] text-white/80">S</kbd>{' '}
          for Stats for Nerds, or open Settings with{' '}
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[0.7rem] text-white/80">Q</kbd>. Widevine (🔒)
          streams need Chrome/Edge over HTTPS. You can paste your own <code>.m3u</code> via the drawer's
          Import button.
        </div>

        <p className="mt-6 text-center text-[0.7rem] text-white/25">
          OmniStream · React + Zustand + Shaka Player (headless) · Phase 2–3 MVP
        </p>
      </div>
    </div>
  );
}
