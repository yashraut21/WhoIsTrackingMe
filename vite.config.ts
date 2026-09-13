import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync } from 'node:fs';

/**
 * Build mode controls which browser manifest is bundled into dist/.
 *
 *   npm run build:chrome   →  mode = 'chrome'  (default)
 *   npm run build:firefox  →  mode = 'firefox'
 *   npm run build:all      →  runs both sequentially, outputting to dist-chrome/ and dist-firefox/
 *
 * The mode is passed via --mode flag: `vite build --mode firefox`
 */
export default defineConfig(({ mode }) => {
  // Resolve which manifest to copy. Default to 'chrome' for bare `vite build`.
  const browserTarget = (mode === 'firefox' || mode === 'chrome') ? mode : 'chrome';
  const manifestSrc = resolve(__dirname, `manifests/${browserTarget}.json`);

  // Per-browser output directories keep dist artifacts separate.
  // `npm run build` (no mode) uses the legacy single `dist/` path for back-compat.
  const outDir = mode === 'firefox'
    ? 'dist-firefox'
    : mode === 'chrome'
    ? 'dist-chrome'
    : 'dist';

  return {
    plugins: [
      react(),
      // Custom plugin: copy the correct browser manifest after build
      {
        name: 'copy-browser-manifest',
        closeBundle() {
          try {
            mkdirSync(outDir, { recursive: true });
            copyFileSync(manifestSrc, resolve(__dirname, `${outDir}/manifest.json`));
            console.log(`\n✓ Copied manifests/${browserTarget}.json → ${outDir}/manifest.json`);
          } catch (e) {
            console.error('Failed to copy manifest:', e);
          }
        },
      },
    ],
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          dashboard: resolve(__dirname, 'index.html'),
          popup: resolve(__dirname, 'popup.html'),
          background: resolve(__dirname, 'src/background/index.ts')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    }
  };
});
