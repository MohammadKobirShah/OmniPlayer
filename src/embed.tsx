/**
 * OmniStream — standalone library entry.
 *
 * This file is the build target for the distributable JS bundle
 * (see `library/vite.lib.config.ts`). When loaded via a <script> tag it
 * attaches `OmniStream` to `window` and auto-mounts any element marked with
 * `data-omni-source`.
 */
import './styles/OmniPlayer.css';
import { OmniStream } from './lib/omniPlayerApi';

declare global {
  interface Window {
    OmniStream?: typeof OmniStream;
  }
}

if (typeof window !== 'undefined') {
  // Expose the global API (e.g. window.OmniStream.mount(...) or OmniStream.scan()).
  window.OmniStream = OmniStream;

  // Declarative auto-init: any <div data-omni-source="..."> becomes a player.
  const autoStart = () => {
    try {
      OmniStream.scan();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[OmniStream] auto-init failed:', err);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoStart, { once: true });
  } else {
    autoStart();
  }
}

export { OmniStream };
export default OmniStream;
