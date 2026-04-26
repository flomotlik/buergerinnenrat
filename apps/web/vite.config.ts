import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

// Build-time provenance globals. The git SHA falls back to 'unknown' when
// the build runs outside a git checkout (e.g. inside a release tarball or a
// Docker image without `.git`). Both globals are declared in vite-env.d.ts
// so TypeScript knows about them at compile time.
const GIT_SHA = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
})();
const BUILD_DATE = new Date().toISOString();

export default defineConfig({
  // Base path for asset URLs. Defaults to the GitHub Pages project path so
  // production builds work out of the box. Local dev/preview and Playwright
  // e2e need to opt out via VITE_BASE_PATH=/ (see playwright.config.ts).
  base: process.env.VITE_BASE_PATH ?? '/buergerinnenrat/',
  define: {
    __GIT_SHA__: JSON.stringify(GIT_SHA),
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [solid()],
  resolve: {
    alias: {
      '@sortition/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@sortition/engine-contract': resolve(__dirname, '../../packages/engine-contract/src/index.ts'),
      '@sortition/engine-a': resolve(__dirname, '../../packages/engine-a/src/index.ts'),
    },
  },
  optimizeDeps: {
    // The `highs` package ships its WASM next to the JS bundle. Vite needs
    // to leave it as-is and copy it to the output during build.
    exclude: ['highs'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          solid: ['solid-js', 'solid-js/web'],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    fs: {
      allow: ['..', '../..', '../../..'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
});
