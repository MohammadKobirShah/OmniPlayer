/**
 * OmniStream — LIBRARY build config.
 *
 * This is SEPARATE from the app's `vite.config.ts`. It compiles the player
 * into a distributable JS + CSS bundle (ES + UMD) that anyone can drop onto
 * a website, exactly like `shaka-player`.
 *
 * Usage:
 *   npm run build:lib          # → ./dist-lib/omnistream.es.js
 *                                ./dist-lib/omnistream.umd.js
 *                                ./dist-lib/omnistream.css
 *
 * Add to your package.json scripts:
 *   "build:lib": "vite build --config library/vite.lib.config.ts"
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// ESM-safe path helpers (no __dirname in ESM configs).
const entry = fileURLToPath(new URL('../src/embed.tsx', import.meta.url));
const outDir = fileURLToPath(new URL('../dist-lib', import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Keep one CSS file so consumers load a single stylesheet.
  css: { codeSplit: false },
  build: {
    outDir,
    emptyOutDir: true,
    // Produce source maps for easier debugging on consumer sites.
    sourcemap: true,
    // Tune the chunk size warning (Shaka is large by design).
    chunkSizeWarningLimit: 1600,
    lib: {
      entry,
      // Global variable name exposed on `window` for the UMD build.
      name: 'OmniStream',
      formats: ['es', 'umd'],
      fileName: (format) => `omnistream.${format}.js`,
    },
    rollupOptions: {
      // Bundle React + Shaka so the UMD build is a true drop-in <script>.
      // For npm consumption you may prefer to externalize them instead:
      //   external: ['react', 'react-dom', 'shaka-player']
      external: [],
      output: {
        // Single, predictable asset name → omnistream.css
        assetFileNames: 'omnistream.[ext]',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'shaka-player': 'shaka',
        },
      },
    },
  },
});
