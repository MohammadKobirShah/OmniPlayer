import { useState } from 'react';
import { Library } from './components/Library';
import { OmniPlayer } from './components/OmniPlayer';
import { PlayerV2 } from './components/v2/PlayerV2';
import { PlayerTV } from './components/v2/PlayerTV';
import { DocsPage } from './components/DocsPage';
import { usePlayerStore } from './store/playerStore';
import { parseM3U, sampleM3U } from './utils/m3uParser';
import './components/v2/playerV2.css';
import './components/v2/playerTV.css';
import './components/v2/splash.css';
import './components/docs.css';

type View = 'library' | 'docs' | 'player-v1' | 'player-v2' | 'player-tv';

export default function App() {
  const [view, setView] = useState<View>('library');
  const [playerVersion, setPlayerVersion] = useState<'v1' | 'v2' | 'tv'>('v1');

  const handlePlay = () => {
    if (playerVersion === 'tv') setView('player-tv');
    else if (playerVersion === 'v2') setView('player-v2');
    else setView('player-v1');
  };

  const handleExit = () => {
    const store = usePlayerStore.getState();
    store.reset();
    store.toggleDrawer(false);
    setView('library');
  };

  const handleLaunchDemo = (version: 'v1' | 'v2' | 'tv') => {
    // Load demo channels if empty
    const store = usePlayerStore.getState();
    if (store.iptvChannels.length === 0) {
      const result = parseM3U(sampleM3U);
      store.setChannels(result.channels);
    }
    // Select first channel
    const chs = usePlayerStore.getState().iptvChannels;
    if (chs.length > 0) {
      store.selectChannel(chs[0].id);
    }
    setPlayerVersion(version);
    if (version === 'tv') setView('player-tv');
    else if (version === 'v2') setView('player-v2');
    else setView('player-v1');
  };

  if (view === 'player-v1') return <OmniPlayer onExit={handleExit} />;
  if (view === 'player-v2') return <PlayerV2 onExit={handleExit} />;
  if (view === 'player-tv') return <PlayerTV onExit={handleExit} />;
  if (view === 'docs') return (
    <DocsPage onLaunchDemo={handleLaunchDemo} onBack={() => setView('library')} />
  );

  return (
    <Library
      onPlay={handlePlay}
      playerVersion={playerVersion}
      onVersionChange={setPlayerVersion}
      onShowDocs={() => setView('docs')}
    />
  );
}
