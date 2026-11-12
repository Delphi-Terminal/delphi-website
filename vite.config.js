import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: true,
    hmr: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        shippers: resolve(__dirname, 'shippers.html'),
        carriers: resolve(__dirname, 'carriers.html'),
        mission: resolve(__dirname, 'mission.html'),
        quote: resolve(__dirname, 'quote.html'),
      },
    },
  },
});
