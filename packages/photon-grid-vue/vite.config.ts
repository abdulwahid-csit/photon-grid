import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'node:path';

// Library build for photon-grid-vue. The component is authored as a plain
// `defineComponent` (no .vue SFC), so no Vue template compiler is needed here —
// `vue` and `photon-grid-core` are externalized as peer dependencies.
export default defineConfig({
  plugins: [dts({ include: ['src'], tsconfigPath: './tsconfig.json' })],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'PhotonGridVue',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vue', 'photon-grid-core'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
});
