import React, { useState, useMemo, useEffect, memo } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { parseM3U, sampleM3U, getStreamType, getDrmLabel } from '../utils/m3uParser';
import {
  CloseIcon,
  SearchIcon,
  ImportIcon,
  HeartIcon,
  HeartFilledIcon,
  MenuIcon,
} from './Icons';

interface ChannelDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export const ChannelDrawer: React.FC<ChannelDrawerProps> = memo(({ open, onClose, onSelect }) => {
  const channels = usePlayerStore((s) => s.iptvChannels);
  const groups = usePlayerStore((s) => s.iptvGroups);
  const activeChannelId = usePlayerStore((s) => s.activeChannelId);
  const favorites = usePlayerStore((s) => s.favorites);
  const drawerQuery = usePlayerStore((s) => s.drawerQuery);
  const setDrawerQuery = usePlayerStore((s) => s.setDrawerQuery);
  const toggleFavorite = usePlayerStore((s) => s.toggleFavorite);
  const mergeChannels = usePlayerStore((s) => s.mergeChannels);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const favChannels = useMemo(
    () => channels.filter((c) => favorites.includes(c.id)),
    [channels, favorites]
  );

  const groupList = useMemo(() => {
    const list = groups.map((name) => ({
      name,
      count: channels.filter((c) => c.group === name).length,
    }));
    if (favChannels.length) {
      list.unshift({ name: '★ Favorites', count: favChannels.length });
    }
    return list;
  }, [groups, channels, favChannels.length]);

  const [activeGroup, setActiveGroup] = useState(groupList[0]?.name ?? '');

  useEffect(() => {
    if (groupList.length && !groupList.some((g) => g.name === activeGroup)) {
      setActiveGroup(groupList[0].name);
    }
  }, [groupList, activeGroup]);

  const filteredChannels = useMemo(() => {
    const base =
      activeGroup === '★ Favorites'
        ? favChannels
        : channels.filter((c) => c.group === activeGroup);
    const q = drawerQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (c) => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
  }, [activeGroup, channels, favChannels, drawerQuery]);

  const handleImport = () => {
    const text = importText.trim();
    if (!text) {
      setImportMsg('Paste an .m3u playlist first.');
      return;
    }
    const result = parseM3U(text);
    if (!result.channels.length) {
      setImportMsg('No channels found — is this a valid #EXTM3U file?');
      return;
    }
    mergeChannels(result.channels);
    setImportMsg(`Imported ${result.channels.length} channel${result.channels.length === 1 ? '' : 's'}.`);
    setImportText('');
    setTimeout(() => setImportMsg(null), 2500);
  };

  return (
    <>
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
        <div className="omni-drawer-head">
          <div className="omni-drawer-title">
            <MenuIcon size={20} />
            <span>Live Channels</span>
            <span className="omni-drawer-count">{channels.length}</span>
          </div>
          <button className="omni-drawer-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="omni-drawer-search">
          <SearchIcon size={16} />
          <input
            value={drawerQuery}
            onChange={(e) => setDrawerQuery(e.target.value)}
            placeholder="Search channels…"
            spellCheck={false}
          />
          <button
            className="omni-drawer-import-btn"
            onClick={() => setShowImport((v) => !v)}
            title="Import .m3u"
          >
            <ImportIcon size={16} />
          </button>
        </div>

        {showImport && (
          <div className="omni-import omni-glass">
            <p>
              Paste an extended <code>.m3u</code> playlist. Groups & logos are detected
              automatically.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={sampleM3U.slice(0, 120) + '…'}
              rows={4}
              spellCheck={false}
            />
            <div className="omni-import-actions">
              <button className="omni-import-run" onClick={handleImport}>
                Import
              </button>
              <button className="omni-import-sample" onClick={() => setImportText(sampleM3U)}>
                Load sample
              </button>
            </div>
            {importMsg && <div className="omni-import-msg">{importMsg}</div>}
          </div>
        )}

        <div className="omni-drawer-body">
          <nav className="omni-drawer-rail">
            {groupList.map((g) => (
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

          <div className="omni-drawer-list">
            {filteredChannels.length === 0 && (
              <div className="omni-list-empty">
                No channels match "{drawerQuery}".
              </div>
            )}
            {filteredChannels.map((ch, idx) => {
              const isActive = activeChannelId === ch.id;
              const isFav = favorites.includes(ch.id);
              const streamType = ch.isLive ? 'LIVE' : getStreamType(ch.url);
              const drmType = getDrmLabel(ch.drm);

              return (
                <button
                  key={ch.id}
                  className={`omni-channel ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelect(ch.id)}
                >
                  <span className="omni-channel-num">{ch.number || idx + 1}</span>
                  <span
                    className="omni-channel-logo"
                    style={{ background: ch.gradient }}
                  >
                    {ch.glyph}
                  </span>
                  <span className="omni-channel-meta">
                    <span className="omni-channel-name">{ch.name}</span>
                    <span className="omni-channel-now">
                      <span className="omni-now-live">● {streamType}</span>{drmType !== 'Clear' && <span className="omni-channel-drm"> 🔒 {drmType}</span>}
                    </span>
                  </span>
                  <button
                    className={`omni-channel-fav ${isFav ? 'is-fav' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(ch.id);
                    }}
                    title={isFav ? 'Remove favorite' : 'Add favorite'}
                  >
                    {isFav ? <HeartFilledIcon size={15} /> : <HeartIcon size={15} />}
                  </button>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
});
