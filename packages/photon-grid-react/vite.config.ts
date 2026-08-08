import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),

    dts({
      include: ['src'],
      tsconfigPath: './tsconfig.app.json',
    }),
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'PhotonGridReact',
      formats: ['es', 'cjs'],

      fileName: (format) => {
        return format === 'es'
          ? 'index.js'
          : 'index.cjs';
      },
    },

    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'photon-grid-core',
      ],
    },
  },
});