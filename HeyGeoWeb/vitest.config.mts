import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    // `next build` copies traced sources (tests included) into .next/standalone,
    // so a run from the project root would otherwise execute each test twice.
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
});
