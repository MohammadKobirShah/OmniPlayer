# 📦 Distributing OmniStream as a Library

OmniStream is built so the **same code** can run as a full app *or* ship as a
drop-in player library — just like `shaka-player`. This guide shows you how to
build the bundle and let anyone embed it on their website.

> The app's own build (`vite build` → single-file `index.html`) is untouched.
> Library builds use a **separate** config: `library/vite.lib.config.ts`.

---

## 1. Architecture at a glance

| File | Role |
| --- | --- |
| `src/lib/omniPlayerApi.ts` | Public API — `OmniStream.mount()` / `.scan()` + the `OmniPlayerHandle` control object. |
| `src/embed.tsx` | Library **entry point**. Imports the player + CSS and registers `window.OmniStream`, then auto-mounts `[data-omni-source]` nodes. |
| `src/components/OmniPlayer.tsx` | The React UI. Its `embed` prop makes it fill a host container instead of the viewport. |
| `library/vite.lib.config.ts` | Vite **library mode** config (ES + UMD + CSS output). |
| `library/package.template.json` | npm `package.json` with `main`/`module`/`exports` fields. |
| `library/embed-cdn.html` | Reference HTML for the `<script>`-tag (CDN) usage. |

---

## 2. Build the distributable bundle

Add the script to your `package.json`:

```jsonc
{
  "scripts": {
    "build:lib": "vite build --config library/vite.lib.config.ts"
  }
}
```

Then run:

```bash
npm run build:lib
```

Output (in `./dist-lib/`):

| File | Purpose |
| --- | --- |
| `omnistream.es.js` | ES module — for bundlers (`import`). |
| `omnistream.umd.js` | UMD bundle — for `<script>` tags, exposes `window.OmniStream`. |
| `omnistream.css` | The full Matte-Black / Glassmorphism stylesheet. |

React + Shaka are **bundled in** so the UMD is a true drop-in. For npm consumers
who already ship React, externalize them (see the comment in
`library/vite.lib.config.ts` → `external`).

---

## 3. Usage on any website

### Option A — CDN / `<script>` tag (zero install)

```html
<head>
  <link rel="stylesheet" href="https://unpkg.com/omnistream-player/dist-lib/omnistream.css" />
</head>
<body>
  <!-- Host must set size + position:relative -->
  <div id="player" style="position:relative;width:960px;aspect-ratio:16/9"></div>

  <script src="https://unpkg.com/omnistream-player/dist-lib/omnistream.umd.js"></script>
  <script>
    const player = OmniStream.mount('#player', {
      manifest: 'https://example.com/stream.mpd',
      title: 'My Channel',
      drm: { servers: { 'com.widevine.alpha': 'https://your-license-server/license' } },
    });
  </script>
</body>
```

### Option B — Declarative (auto-mounted, no JS needed)

```html
<div
  class="omni-host"
  style="position:relative;width:100%;aspect-ratio:16/9"
  data-omni-source="https://example.com/stream.mpd"
  data-omni-title="My Channel"
  data-omni-glyph="📺"
></div>
```

Just load `omnistream.umd.js` and any `[data-omni-source]` element becomes a player.

### Option C — npm module (React or vanilla)

```bash
npm install omnistream-player
```

```js
import { OmniStream } from 'omnistream-player';
import 'omnistream-player/style.css';

const player = OmniStream.mount(document.querySelector('#player'), {
  manifest: 'https://example.com/stream.m3u8',
});
```

---

## 4. Programmatic API

```ts
const player = OmniStream.mount(target, options);
```

**`options`**

| Field | Type | Description |
| --- | --- | --- |
| `manifest` | `string` | **Required.** DASH `.mpd` or HLS `.m3u8` URL. |
| `drm` | `{ servers: Record<string,string> }` | License servers per key system. |
| `title` | `string` | Title shown in the top bar. |
| `description` | `string` | Optional programme description. |
| `glyph` | `string` | Emoji for the logo tile. |

**`player` handle methods**

```ts
player.play()            player.pause()         player.togglePlay()
player.seekTo(120)       player.seekBy(-10)
player.setVolume(0.8)    player.mute()          player.unmute()       player.toggleMute()
player.toggleFullscreen()
player.reload()          // destroy + recreate (error recovery / leak guard)
player.destroy()         // unmount + cleanup
player.getState()        // { isPlaying, currentTime, duration, volume, ... }
player.on('ready', () => {})
player.on('error', (e) => {})
```

**Events:** `ready` · `play` · `pause` · `ended` · `timeupdate` · `volumechange` · `fullscreenchange` · `error`

---

## 5. Publish to npm (and get free CDN)

1. Copy `library/package.template.json` over your `package.json` (merge fields),
   or keep it as a reference and publish from a build step.
2. Bump the version: `npm version patch`.
3. Publish:

   ```bash
   npm publish
   ```

Once on npm, **unpkg** and **jsDelivr** serve it instantly — no extra setup:

```
https://unpkg.com/omnistream-player/dist-lib/omnistream.umd.js
https://cdn.jsdelivr.net/npm/omnistream-player/dist-lib/omnistream.umd.js
```

---

## 6. Host requirements & gotchas

- **Sizing:** the host element (`#player`) must have an explicit size **and**
  `position: relative` (or absolute/fixed). Embed mode uses `position: absolute`
  to fill it. `aspect-ratio: 16/9` works great.
- **DRM:** Widevine/PlayReady need a **secure context** (HTTPS) and a capable
  browser (Chrome/Edge). Clear streams play anywhere.
- **CORS:** the stream origin must allow cross-origin requests.
- **One store per page:** the React wrapper uses a shared store, so mount **one
  primary player** per page (typical for OTT sites). The `OmniPlayerHandle` is
  fully isolated for control.

---

## 7. Wrap as a native app (optional)

- **Android/iOS:** wrap with [Capacitor](https://capacitorjs.com).
- **Tizen (Samsung) / webOS (LG):** the player already detects TV devices and
  enables 60fps solid-mode + D-pad spatial navigation. Wrap with the platform
  SDK or [Tauri](https://tauri.app).
