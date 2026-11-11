import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

export async function createApp() {
  const isProd = process.env.NODE_ENV === 'production';
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'theseus-global' });
  });

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const [pathname, query = ''] = req.url.split(/\?(.*)/s);
    const clean = pathname.replace(/\/+$/, '').replace(/\.html$/, '').replace(/\/index$/, '');
    if (pathname !== '/' && clean !== pathname) {
      return res.redirect(301, (clean || '/') + (query ? `?${query}` : ''));
    }
    next();
  });

  if (isProd) {
    const dist = path.join(root, 'dist');
    if (!fs.existsSync(dist)) {
      console.error('Run `npm run build` before starting in production.');
      process.exit(1);
    }
    app.use(express.static(dist, { extensions: ['html'], redirect: false }));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root,
      appType: 'mpa',
      server: { middlewareMode: true },
    });
    app.use((req, _res, next) => {
      const [pathname, query] = req.url.split(/\?(.*)/s);
      if (pathname !== '/' && fs.existsSync(path.join(root, `${pathname}.html`))) {
        req.url = `${pathname}.html${query ? `?${query}` : ''}`;
      }
      next();
    });
    app.use(vite.middlewares);
  }

  return { app };
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/.*(?=server)/, ''));

if (isDirectRun) {
  const port = Number(process.env.PORT) || 3000;

  createApp()
    .then(({ app }) => {
      app.listen(port, () => {
        console.log(`[dev] Site http://localhost:${port}`);
      });
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
