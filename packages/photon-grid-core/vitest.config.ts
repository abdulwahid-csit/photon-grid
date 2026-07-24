import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for photon-grid-core.
 *
 * Specs live under `tests/` (outside `src/`) so the `tsc` build glob
 * (`src/**\/*.ts`) never compiles them into `dist/`. The engine's pure logic
 * runs in the default fast `node` environment; DOM-dependent suites can opt into
 * `jsdom` per-file via a `// @vitest-environment jsdom` pragma.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/formula/**/*.ts', 'src/autofill/**/*.ts'],
      exclude: [
        'src/formula/**/*.types.ts', 'src/formula/index.ts',
        'src/autofill/**/*.types.ts', 'src/autofill/index.ts',
      ],
    },
  },
});
