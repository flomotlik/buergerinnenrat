import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

export default defineConfig({
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
