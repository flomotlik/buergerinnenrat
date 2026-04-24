import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: {
    alias: {
      '@sortition/engine-contract': resolve(__dirname, '../engine-contract/src/index.ts'),
    },
  },
});
