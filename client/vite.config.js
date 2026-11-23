import { defineConfig } from 'vite';
import { readFile } from 'node:fs/promises';
import { getFrontendEntry } from './src/routes.js';

function portalRouting() {
  return {
    name: 'vulpora-portal-routing',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (!['GET', 'HEAD'].includes(req.method) ||
            /^\/(?:api|auth|src|@[^/]*|node_modules)(?:\/|$)/.test(pathname) ||
            /\.[^/]+$/.test(pathname) || getFrontendEntry(pathname) === 'index.html') return next();
        try {
          const html = await readFile(new URL('./public/vulpora.html', import.meta.url), 'utf8');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(req.method === 'HEAD' ? '' : html);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [portalRouting()],
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
