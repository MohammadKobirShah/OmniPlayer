import { useEffect, useMemo, useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { nowNext, formatClock, progressOf, durationLabel } from '../lib/xmltv';
import { guessContainer } from '../lib/m3u';
import { parseM3U } from '../lib/m3u';
import { SAMPLE_M3U } from '../lib/playlist';
import {
  CloseIcon,
  SearchIcon,
  StarIcon,
  StarFilledIcon,
  TvIcon,
  ImportIcon,
} from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (channelId: string) => void;
}

export default function IptvDrawer({ open, onClose, onSelect }: Props) {
  const channels = usePlayerStore((s) => s.iptvChannels);
  const groups = usePlayerStore((s) => s.iptvGroups);
  const epg = usePlayerStore((s) => s.epg);
  const activeChannelId = usePlayerStore((s) => s.activeChannelId);
  const favorites = usePlayerStore((s) => s.favorites);
  const query = usePlayerStore((s) => s.drawerQuery);
  const setQuery = usePlayerStore((s) => s.setDrawerQuery);
  const toggleFavorite = usePlayerStore((s) => s.toggleFavorite);
  const mergeChannels = usePlayerStore((s) => s.mergeChannels);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // Favourites pseudo-group always sits at the top of the rail.
  const favChannels = useMemo(
    () => channels.filter((c) => favorites.includes(c.id)),
    [channels, favorites],
  );

  const rail = useMemo(() => {
    const base: { name: string; count: number; fav?: boolean }[] = groups.map((g) => ({
      name: g,
      count: channels.filter((c) => c.group === g).length,
    }));
    if (favChannels.length) {
      base.unshift({ name: '★ Favorites', count: favChannels.length, fav: true });
    }
    return base;
  }, [groups, channels, favChannels.length]);

  const [activeGroup, setActiveGroup] = useState(rail[0]?.name ?? '');

  useEffect(() => {
    // Keep the active group valid when the playlist changes.
    if (rail.length && !rail.some((r) => r.name === activeGroup)) {
      setActiveGroup(rail[0].name);
    }
  }, [rail, activeGroup]);

  const list = useMemo(() => {
    const pool = activeGroup === '★ Favorites' ? favChannels : channels.filter((c) => c.group === activeGroup);
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((c) => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }, [activeGroup, channels, favChannels, query]);

  const handleImport = () => {
    const text = importText.trim();
    if (!text) {
      setImportMsg('Paste an .m3u playlist first.');
      return;
    }
    const parsed = parseM3U(text);
    if (!parsed.channels.length) {
      setImportMsg('No channels found — is this a valid #EXTM3U file?');
      return;
    }
    mergeChannels(parsed.channels);
    setImportMsg(`Imported ${parsed.channels.length} channel${parsed.channels.length === 1 ? '' : 's'}.`);
    setImportText('');
    setTimeout(() => setImportMsg(null), 2500);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`omni-drawer-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`omni-drawer omni-glass ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Channels"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="omni-drawer-head">
          <div className="omni-drawer-title">
            <TvIcon size={20} />
            <span>Live Channels</span>
            <span className="omni-drawer-count">{channels.length}</span>
          </div>
          <button className="omni-drawer-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="omni-drawer-search">
          <SearchIcon size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels…"
            spellCheck={false}
          />
          <button
            className="omni-drawer-import-btn"
            onClick={() => setImportOpen((o) => !o)}
            title="Import .m3u"
          >
            <ImportIcon size={16} />
          </button>
        </div>

        {importOpen && (
          <div className="omni-import omni-glass">
            <p>Paste an extended <code>.m3u</code> playlist. Groups &amp; logos are detected automatically.</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={SAMPLE_M3U.slice(0, 120) + '…'}
              rows={4}
              spellCheck={false}
            />
            <div className="omni-import-actions">
              <button className="omni-import-run" onClick={handleImport}>
                Import
              </button>
              <button className="omni-import-sample" onClick={() => setImportText(SAMPLE_M3U)}>
                Load sample
              </button>
            </div>
            {importMsg && <div className="omni-import-msg">{importMsg}</div>}
          </div>
        )}

        {/* Two-column body */}
        <div className="omni-drawer-body">
          {/* Category rail */}
          <nav className="omni-drawer-rail">
            {rail.map((g) => (
              <button
                key={g.name}
                className={`omni-rail-item ${activeGroup === g.name ? 'is-active' : ''}`}
                onClick={() => setActiveGroup(g.name)}
              >
                <span className="omni-rail-name">{g.name}</span>
                <span className="omni-rail-count">{g.count}</span>
              </button>
            ))}
          </nav>

          {/* Channel list */}
          <div className="omni-drawer-list">
            {list.length === 0 && <div className="omni-list-empty">No channels match “{query}”.</div>}
            {list.map((c, idx) => {
              const isActive = activeChannelId === c.id;
              const isFav = favorites.includes(c.id);
              const { current } = nowNext(epg, c.id);
              const liveBadge = c.isLive ? 'LIVE' : guessContainer(c.url);
              return (
                <button
                  key={c.id}
                  className={`omni-channel ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelect(c.id)}
                >
                  <span className="omni-channel-num">{c.number || idx + 1}</span>
                  <span className="omni-channel-logo" style={{ background: c.gradient }}>
                    {c.glyph}
                    {c.logo && (
                      <img
                        src={c.logo}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </span>
                  <span className="omni-channel-meta">
                    <span className="omni-channel-name">{c.name}</span>
                    {current ? (
                      <span className="omni-channel-now">
                        <span className="omni-now-live">● {liveBadge}</span> {current.title}
                      </span>
                    ) : (
                      <span className="omni-channel-now omni-muted">No programme info</span>
                    )}
                  </span>
                  <button
                    className={`omni-channel-fav ${isFav ? 'is-fav' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(c.id);
                    }}
                    title={isFav ? 'Remove favorite' : 'Add favorite'}
                  >
                    {isFav ? <StarFilledIcon size={15} /> : <StarIcon size={15} />}
                  </button>
                </button>
              );
            })}
          </div>
        </div>

        {/* EPG footer — NOW / NEXT for the active channel */}
        <EpgFooter />
      </aside>
    </>
  );
}

/** NOW / NEXT strip docked to the bottom of the drawer (TiviMate style). */
function EpgFooter() {
  const channels = usePlayerStore((s) => s.iptvChannels);
  const epg = usePlayerStore((s) => s.epg);
  const activeChannelId = usePlayerStore((s) => s.activeChannelId);

  const channel = channels.find((c) => c.id === activeChannelId) ?? null;
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  if (!channel) return null;
  const { current, next } = nowNext(epg, channel.id);

  return (
    <div className="omni-epg-footer omni-glass">
      <div className="omni-epg-head">
        <span className="omni-epg-channel" style={{ background: channel.gradient }}>
          {channel.glyph}
        </span>
        <div className="omni-epg-titles">
          <strong>{channel.name}</strong>
          <span className="omni-epg-sub">Programme Guide</span>
        </div>
      </div>

      {current ? (
        <div className="omni-epg-prog omni-epg-now">
          <div className="omni-epg-prog-top">
            <span className="omni-epg-tag">NOW</span>
            <span className="omni-epg-time">
              {formatClock(current.start)} – {formatClock(current.stop)} · {durationLabel(current)}
            </span>
          </div>
          <div className="omni-epg-prog-name">{current.title}</div>
          <div className="omni-epg-bar">
            <div className="omni-epg-bar-fill" style={{ width: `${progressOf(current) * 100}%` }} />
          </div>
          {current.desc && <div className="omni-epg-desc">{current.desc}</div>}
        </div>
      ) : (
        <div className="omni-epg-prog omni-muted">No programme information available.</div>
      )}

      {next && (
        <div className="omni-epg-prog omni-epg-next">
          <div className="omni-epg-prog-top">
            <span className="omni-epg-tag omni-epg-tag-next">NEXT</span>
            <span className="omni-epg-time">{formatClock(next.start)} – {formatClock(next.stop)}</span>
          </div>
          <div className="omni-epg-prog-name">{next.title}</div>
        </div>
      )}
    </div>
  );
}
