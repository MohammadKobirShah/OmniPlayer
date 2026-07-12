import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { Library } from '../components/Library';
import { PlayerTV } from '../components/v2/PlayerTV';
import { usePlayerStore } from '../store/playerStore';
import { parseM3U, sampleM3U } from '../utils/m3uParser';
import '../index.css';
import '../components/v2/playerTV.css';
import '../components/v2/splash.css';

function TVApp() {
  const [view, setView] = useState<'library' | 'player'>('library');

  useEffect(() => {
    usePlayerStore.getState().setTvMode(true);
    if (usePlayerStore.getState().iptvChannels.length === 0) {
      const result = parseM3U(sampleM3U);
      usePlayerStore.getState().setChannels(result.channels);
    }
  }, []);

  const handlePlay = () => setView('player');
  const handleExit = () => {
    const store = usePlayerStore.getState();
    store.reset();
    store.toggleDrawer(false);
    setView('library');
  };

  if (view === 'player') return <PlayerTV onExit={handleExit} />;
  return (
    <Library
      onPlay={handlePlay}
      playerVersion="tv"
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TVApp />
  </StrictMode>
);
