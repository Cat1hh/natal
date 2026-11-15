import { defineConfig } from 'vite';

// Em desenvolvimento, /api e /auth vão para o servidor Node (porta 3000).
// O build sai direto em ../public, que o servidor já serve.
export default defineConfig({
  build: { outDir: '../public', emptyOutDir: true },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        headers: {
          Origin: 'http://localhost:3000',
          Referer: 'http://localhost:3000/',
        },
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        headers: {
          Origin: 'http://localhost:3000',
          Referer: 'http://localhost:3000/',
        },
      },
    },
  },
});