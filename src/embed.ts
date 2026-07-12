/**
 * OmniStream Embed SDK
 * 
 * Usage (CDN / script tag):
 * 
 *   <script src="https://your-cdn.com/omnistream.js"></script>
 *   <script>
 *     OmniStream.mount('#player', {
 *       manifest: 'https://example.com/stream.mpd',
 *       title: 'My Video',
 *       version: 'v2',
 *     });
 *   </script>
 * 
 * This file re-exports the public API for library builds.
 */

export { usePlayerStore } from './store/playerStore';
export type { IPTVChannel, DRMConfig, QualityLevel } from './store/playerStore';
export { parseM3U } from './utils/m3uParser';
export { formatTime } from './utils/formatTime';
export { getLanguageName } from './utils/languageNames';
