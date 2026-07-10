import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    // Emit TypeScript declarations (dist/index.d.ts) so consumers get types.
    dts({ include: ['src'], tsconfigPath: './tsconfig.app.json' }),
  ],

  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'PhotonGridReact',
      fileName: 'index',
      formats: ['es', 'cjs']
    },

    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'photon-grid-core'
      ],

      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
