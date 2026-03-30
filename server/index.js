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
    res.json({ ok: true, service: 'delphi-website' });
  });

  if (isProd) {
    const dist = path.join(root, 'dist');
    if (!fs.existsSync(dist)) {
      console.error('Run `npm run build` before starting in production.');
      process.exit(1);
    }
    app.get('/about.html', (_req, res) => res.redirect(301, '/about'));
    app.get('/data.html', (_req, res) => res.redirect(301, '/data'));
    app.get('/news.html', (_req, res) => res.redirect(301, '/news'));
    app.get('/admin/login.html', (_req, res) => res.redirect(302, '/login'));
    app.get('/about', (_req, res) => res.sendFile(path.join(dist, 'about.html')));
    app.get('/data', (_req, res) => res.sendFile(path.join(dist, 'data.html')));
    app.get('/news', (_req, res) => res.sendFile(path.join(dist, 'news.html')));
    app.get('/news/article', (_req, res) => res.sendFile(path.join(dist, 'article.html')));
    app.get('/terms', (_req, res) => res.sendFile(path.join(dist, 'terms.html')));
    app.get('/privacy', (_req, res) => res.sendFile(path.join(dist, 'privacy.html')));
    app.get('/login', (_req, res) => res.sendFile(path.join(dist, 'login.html')));
    app.get('/create-account', (_req, res) => res.sendFile(path.join(dist, 'create-account.html')));
    app.get('/verify', (_req, res) => res.sendFile(path.join(dist, 'verify.html')));
    app.get('/forgot-password', (_req, res) => res.sendFile(path.join(dist, 'forgot-password.html')));
    app.get('/reset-password', (_req, res) => res.sendFile(path.join(dist, 'reset-password.html')));
    app.use(express.static(dist));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const devHtmlRoute = async (req, res, next, relPath) => {
      try {
        const url = req.originalUrl;
        const filePath = path.join(root, relPath);
        if (!fs.existsSync(filePath)) {
          next();
          return;
        }
        let template = fs.readFileSync(filePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    };

    app.get('/', (req, res, next) => devHtmlRoute(req, res, next, 'index.html'));
    app.get('/index.html', (req, res, next) => devHtmlRoute(req, res, next, 'index.html'));
    app.get('/about.html', (_req, res) => res.redirect(301, '/about'));
    app.get('/data.html', (_req, res) => res.redirect(301, '/data'));
    app.get('/news.html', (_req, res) => res.redirect(301, '/news'));
    app.get('/admin/login.html', (_req, res) => res.redirect(302, '/login'));
    app.get('/about', (req, res, next) => devHtmlRoute(req, res, next, 'about.html'));
    app.get('/data', (req, res, next) => devHtmlRoute(req, res, next, 'data.html'));
    app.get('/news', (req, res, next) => devHtmlRoute(req, res, next, 'news.html'));
    app.get('/news/article', (req, res, next) => devHtmlRoute(req, res, next, 'article.html'));
    app.get('/terms', (req, res, next) => devHtmlRoute(req, res, next, 'terms.html'));
    app.get('/privacy', (req, res, next) => devHtmlRoute(req, res, next, 'privacy.html'));
    app.get('/login', (req, res, next) => devHtmlRoute(req, res, next, 'login.html'));
    app.get('/create-account', (req, res, next) => devHtmlRoute(req, res, next, 'create-account.html'));
    app.get('/verify', (req, res, next) => devHtmlRoute(req, res, next, 'verify.html'));
    app.get('/forgot-password', (req, res, next) => devHtmlRoute(req, res, next, 'forgot-password.html'));
    app.get('/reset-password', (req, res, next) => devHtmlRoute(req, res, next, 'reset-password.html'));
    app.get('/admin/dashboard.html', (req, res, next) =>
      devHtmlRoute(req, res, next, 'admin/dashboard.html')
    );

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
