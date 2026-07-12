import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { Library } from '../components/Library';
import { OmniPlayer } from '../components/OmniPlayer';
import { usePlayerStore } from '../store/playerStore';
import { parseM3U, sampleM3U } from '../utils/m3uParser';
import '../index.css';

function V1App() {
  const [view, setView] = useState<'library' | 'player'>('library');

  useEffect(() => {
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

  if (view === 'player') return <OmniPlayer onExit={handleExit} />;
  return (
    <Library
      onPlay={handlePlay}
      playerVersion="v1"
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <V1App />
  </StrictMode>
);
