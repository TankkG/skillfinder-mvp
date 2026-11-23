import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/skillfinder-test',
      JWT_ACCESS_SECRET: 'test-access-secret-value',
      JWT_REFRESH_SECRET: 'test-refresh-secret-value',
    },
  },
  resolve: {
    alias: {
      '@skillfinder/shared': path.resolve(
        process.cwd(),
        '../../packages/shared/src/index.ts',
      ),
    },
  },
});
