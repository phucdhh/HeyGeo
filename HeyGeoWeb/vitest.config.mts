import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    // `next build` copies traced sources (tests included) into .next/standalone,
    // so a run from the project root would otherwise execute each test twice.
    exclude: ['**/node_modules/**', '**/.next/**'],
    // The engine round-trip file redraws a whole construction in jsdom, twice over,
    // per test — 5s is the wall those cases tip against when every file runs at
    // once, not a hanging test.
    testTimeout: 15_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
});
