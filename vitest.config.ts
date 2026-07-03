import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Root Vitest configuration.
 *
 * Biscotto is a fully ESM monorepo:
 *   packages/core  -> ESM
 *   packages/cli   -> ESM
 *
 * We define projects per package so each side is transformed with the
 * module system it expects at runtime. Tests live in tests/core and
 * tests/cli at the repo root and import source files by deep path to
 * avoid triggering the bot's auto-run side-effects.
 */
export default defineConfig({
  test: {
    globals: false,
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'packages/core/src/kernel/**/*.ts',
        'packages/core/src/contracts/**/*.ts',
        'packages/cli/src/commands/**/*.ts',
        'packages/cli/src/template.ts',
        'packages/cli/src/fs.ts',
      ],
      exclude: [
        'packages/core/src/modules/**',
        'packages/core/src/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@biscotto/core': resolve(__dirname, 'packages/core/src'),
      '@biscotto/cli': resolve(__dirname, 'packages/cli/src'),
    },
  },
});
