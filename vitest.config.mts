import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      // Isolate fileDb writes from real data/ during tests
      IP_HELPER_DATA_DIR: path.resolve(import.meta.dirname, './src/__tests__/.tmp-data'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
