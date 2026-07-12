import React, { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { parseM3U, fetchAndParseM3U, sampleM3U, getStreamType } from '../utils/m3uParser';
import { PlayIcon, ImportIcon, TvIcon } from './Icons';
import { useTVDetection } from '../hooks/useTVDetection';
import { useSpatialNav } from '../hooks/useSpatialNav';

interface LibraryProps {
  onPlay: () => void;
  playerVersion?: 'v1' | 'v2' | 'tv';
  onVersionChange?: (v: 'v1' | 'v2' | 'tv') => void;
  onShowDocs?: () => void;
}

export const Library: React.FC<LibraryProps> = ({ onPlay, playerVersion = 'v1', onVersionChange, onShowDocs }) => {
  const channels = usePlayerStore((s) => s.iptvChannels);
  const setChannels = usePlayerStore((s) => s.setChannels);
  const selectChannel = usePlayerStore((s) => s.selectChannel);
  const tvMode = usePlayerStore((s) => s.tvMode);

  const containerRef = useRef<HTMLDivElement>(null);

  const [customUrl, setCustomUrl] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // ── TV Detection: runs once on mount ──
  useTVDetection();

  // ── Spatial nav for TV on library page ──
  useSpatialNav(containerRef, tvMode);

  // Auto-focus first card on TV
  useEffect(() => {
    if (!tvMode) return;
    const timer = setTimeout(() => {
      const firstCard = containerRef.current?.querySelector('.library-card') as HTMLElement | null;
      firstCard?.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [tvMode, channels.length]);

  // Load demo channels on first visit
  useEffect(() => {
    if (channels.length === 0) {
      const result = parseM3U(sampleM3U);
      setChannels(result.channels);
    }
  }, []);

  const [urlLoading, setUrlLoading] = useState(false);

  const handlePlayUrl = async () => {
    const url = customUrl.trim();
    if (!url) return;

    // If URL ends with .m3u or .m3u8-like playlist URL — fetch and parse as M3U
    if (url.match(/\.(m3u8?|txt)$/i) || url.includes('/m3u') || url.includes('raw.githubusercontent.com')) {
      setUrlLoading(true);
      try {
        const result = await fetchAndParseM3U(url);
        if (result.channels.length > 0) {
          usePlayerStore.getState().mergeChannels(result.channels);
          setCustomUrl('');
          setUrlLoading(false);
          // Auto-play first channel
          selectChannel(result.channels[0].id);
          onPlay();
          return;
        }
      } catch { /* fall through to single stream */ }
      setUrlLoading(false);
    }

    // Single stream URL
    const id = 'custom-' + Date.now();
    const channel = {
      id: id,
      name: 'Custom Stream',
      url: url,
      group: 'Custom',
      glyph: '🔗',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      isLive: url.includes('.m3u8') || url.includes('.mpd'),
    };
    usePlayerStore.getState().mergeChannels([channel]);
    selectChannel(id);
    onPlay();
  };

  const handlePlayChannel = (id: string) => {
    selectChannel(id);
    onPlay();
  };

  const handleImport = () => {
    const text = importText.trim();
    if (!text) return;
    const result = parseM3U(text);
    if (!result.channels.length) {
      setImportMsg('No channels found.');
      return;
    }
    usePlayerStore.getState().mergeChannels(result.channels);
    setImportMsg(`Imported ${result.channels.length} channels!`);
    setImportText('');
    setTimeout(() => {
      setImportMsg(null);
      setShowImport(false);
    }, 2000);
  };

  const grouped = channels.reduce(
    (acc, ch) => {
      if (!acc[ch.group]) acc[ch.group] = [];
      acc[ch.group].push(ch);
      return acc;
    },
    {} as Record<string, typeof channels>
  );

  // Handle Enter on cards for TV
  const handleCardKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePlayChannel(id);
    }
  };

  return (
    <div className={`library-container ${tvMode ? 'library-tv' : ''}`} ref={containerRef}>
      {/* Hero */}
      <div className="library-hero">
        <div className="library-hero-content">
          <div className="library-logo">
            <div className="library-logo-icon">
              <TvIcon size={28} />
            </div>
            <div className="library-logo-text">
              <span className="library-brand-mark">OMNI</span>
              <span className="library-brand-stream">STREAM</span>
            </div>
            {tvMode && <span className="library-tv-indicator">📺 TV Mode</span>}
          </div>
          <h1 className="library-headline">
            Professional Media Player
          </h1>
          <p className="library-sub">
            {tvMode
              ? 'Use your remote to navigate. Press OK/Enter to play.'
              : 'Adaptive streaming with Shaka Player. DASH & HLS support, DRM-ready, IPTV channels, keyboard shortcuts, touch gestures, and more.'}
          </p>

          {/* Custom URL — hide on TV (no keyboard) */}
          {!tvMode && (
            <div className="library-url-input">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Stream URL (.mpd .m3u8) or M3U playlist URL…"
                onKeyDown={(e) => e.key === 'Enter' && handlePlayUrl()}
              />
              <button onClick={handlePlayUrl} disabled={!customUrl.trim() || urlLoading}>
                <PlayIcon size={18} /> {urlLoading ? 'Loading...' : 'Play'}
              </button>
            </div>
          )}

          {!tvMode && (
            <div className="library-actions">
              <button
                className="library-import-btn"
                onClick={() => setShowImport((v) => !v)}
              >
                <ImportIcon size={16} /> Import M3U
              </button>
              {onShowDocs && (
                <button className="library-import-btn" onClick={onShowDocs}>
                  📄 Embed & API Docs
                </button>
              )}

              {onVersionChange && (
                <div className="library-version-toggle">
                  <button
                    className={`library-ver-btn ${playerVersion === 'v1' ? 'active' : ''}`}
                    onClick={() => onVersionChange('v1')}
                  >
                    v1
                  </button>
                  <button
                    className={`library-ver-btn ${playerVersion === 'v2' ? 'active' : ''}`}
                    onClick={() => onVersionChange('v2')}
                  >
                    v2 ✨
                  </button>
                  <button
                    className={`library-ver-btn ${playerVersion === 'tv' ? 'active' : ''}`}
                    onClick={() => onVersionChange('tv')}
                  >
                    📺 TV
                  </button>
                </div>
              )}
            </div>
          )}

          {showImport && !tvMode && (
            <div className="library-import-panel">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="#EXTM3U playlist content..."
                rows={5}
              />
              <div className="library-import-actions">
                <button onClick={handleImport}>Import</button>
                <button onClick={() => setImportText(sampleM3U)}>Load Sample</button>
              </div>
              {importMsg && <p className="library-import-msg">{importMsg}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Channel Grid */}
      <div className="library-content">
        {Object.entries(grouped).map(([group, chs]) => (
          <div key={group} className="library-group">
            <h2 className="library-group-title">{group}</h2>
            <div className="library-grid">
              {chs.map((ch) => (
                <button
                  key={ch.id}
                  className="library-card"
                  onClick={() => handlePlayChannel(ch.id)}
                  onKeyDown={(e) => handleCardKeyDown(e, ch.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Play ${ch.name}`}
                >
                  <div
                    className="library-card-icon"
                    style={{ background: ch.gradient }}
                  >
                    <span className="library-card-glyph">{ch.glyph}</span>
                  </div>
                  <div className="library-card-info">
                    <span className="library-card-name">{ch.name}</span>
                    <span className="library-card-type">
                      {ch.isLive ? '● LIVE' : getStreamType(ch.url)}
                    </span>
                  </div>
                  <div className="library-card-play">
                    <PlayIcon size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {channels.length === 0 && (
          <div className="library-empty">
            <p>No channels loaded. Import an M3U playlist or paste a stream URL above.</p>
          </div>
        )}
      </div>

      {/* Feature badges — hide on TV */}
      {!tvMode && (
        <div className="library-features">
          <div className="library-feature">
            <span className="library-feature-icon">📡</span>
            <span className="library-feature-title">DASH & HLS</span>
            <span className="library-feature-desc">Adaptive bitrate streaming</span>
          </div>
          <div className="library-feature">
            <span className="library-feature-icon">🔒</span>
            <span className="library-feature-title">DRM Ready</span>
            <span className="library-feature-desc">Widevine & PlayReady</span>
          </div>
          <div className="library-feature">
            <span className="library-feature-icon">📺</span>
            <span className="library-feature-title">Smart TV</span>
            <span className="library-feature-desc">Tizen, webOS, Android TV</span>
          </div>
          <div className="library-feature">
            <span className="library-feature-icon">⌨️</span>
            <span className="library-feature-title">Shortcuts</span>
            <span className="library-feature-desc">Full keyboard control</span>
          </div>
          <div className="library-feature">
            <span className="library-feature-icon">👆</span>
            <span className="library-feature-title">Gestures</span>
            <span className="library-feature-desc">Touch & swipe controls</span>
          </div>
          <div className="library-feature">
            <span className="library-feature-icon">📊</span>
            <span className="library-feature-title">Stats</span>
            <span className="library-feature-desc">Real-time stream analytics</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="library-footer">
        <span className="library-footer-brand">
          <span className="library-brand-mark">OMNI</span>
          <span className="library-brand-stream">STREAM</span>
        </span>
        <span>Professional Media Player · Powered by Shaka Player</span>
      </footer>
    </div>
  );
};
