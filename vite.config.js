import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import apiPlugin from './server/plugin.js';

export default defineConfig({
  plugins: [react(), apiPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['pg', 'sqlite3', 'sqlite'],
    },
  },
});
