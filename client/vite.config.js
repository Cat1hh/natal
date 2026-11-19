import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function vulporaPortalRouting() {
  return {
    name: 'vulpora-portal-routing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const isAsset =
          url.startsWith('/api') ||
          url.startsWith('/auth') ||
          url.startsWith('/src') ||
          url.startsWith('/@') ||
          url.startsWith('/node_modules') ||
          path.extname(url) !== '';

        if (isAsset || /^\/comunidade\/[^/]+\/natal(\/|$)/i.test(url)) {
          return next();
        }

        // Converte qualquer acesso sem # para /#/... (igual ao server.js)
        if (url !== '/') {
          const target = url
            .replace(/^\/comunidade\/ducks(?=\/|$)/i, '/comunidade/heaven')
            .replace(/^\/comunidades\/?$/i, '/portal/comunidades')
            .replace(/^\/comunidade\/([^/]+)\/?$/i, '/comunidade/$1/eventos');

          res.writeHead(302, { Location: `/#${target}` });
          return res.end();
        }

        const vulporaHtml = path.resolve(__dirname, 'public/vulpora.html');
        if (fs.existsSync(vulporaHtml)) {
          res.setHeader('Content-Type', 'text/html');
          res.end(fs.readFileSync(vulporaHtml, 'utf-8'));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [vulporaPortalRouting()],
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