import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';
import { initCsrf } from './middleware/csrf.js';
import { createAuthRouter } from './routes/auth.js';
import { createNewsRouter } from './routes/news.js';
import { createImageRouter } from './routes/images.js';
import { ensureAdminUser, seedNewsIfEmpty, purgeExpiredRefreshTokens } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

let dbConnected = false;

function devJwtSecret() {
  const s = process.env.JWT_ACCESS_SECRET;
  if (s && s.length >= 48) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set JWT_ACCESS_SECRET in .env (at least 48 characters).');
  }
  const gen = crypto.randomBytes(48).toString('hex');
  console.warn(
    '[cms] JWT_ACCESS_SECRET not set; using ephemeral dev secret (logins reset on server restart).'
  );
  return gen;
}

export async function createApp() {
  const isProd = process.env.NODE_ENV === 'production';
  const useDb = Boolean(process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL);

  if (isProd && !useDb) {
    throw new Error('PRISMA_DATABASE_URL or DATABASE_URL is required in production.');
  }

  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  if (useDb) {
    try {
      const jwtAccessSecret = devJwtSecret();
      initCsrf(process.env.CSRF_SECRET);

      await prisma.$connect();
      dbConnected = true;

      purgeExpiredRefreshTokens().catch((e) => console.error('[cms] purge refresh tokens', e));

      await ensureAdminUser(process.env.INITIAL_ADMIN_EMAIL, process.env.INITIAL_ADMIN_PASSWORD);
      await seedNewsIfEmpty();

      app.use('/api/auth', createAuthRouter({ jwtAccessSecret }));
      app.use('/api/news', createNewsRouter({ jwtAccessSecret }));
      app.use('/api/images', createImageRouter({ jwtAccessSecret }));

      app.get('/api/health', (_req, res) => {
        res.json({ ok: true, service: 'delphi-cms', db: 'postgresql' });
      });
    } catch (dbErr) {
      if (isProd) throw dbErr;
      console.warn('[dev] Database unreachable - running frontend only.', dbErr.message);
      dbConnected = false;
      app.use('/api', (_req, res) => {
        res.status(503).json({ error: 'Database unavailable in dev mode' });
      });
    }
  } else {
    console.warn(
      '[dev] No PRISMA_DATABASE_URL or DATABASE_URL - frontend only. Add Postgres + .env for CMS/API. Same UI: http://localhost:3000'
    );
    app.get('/api/health', (_req, res) => {
      res.json({ ok: true, service: 'delphi-frontend', db: 'disabled' });
    });
    app.use('/api', (_req, res) => {
      res.status(503).json({ error: 'API disabled (set DATABASE_URL for CMS)' });
    });
  }

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

/* ── Local dev / Heroku: start the server when run directly ── */
const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/.*(?=server)/, ''));

if (isDirectRun) {
  const port = Number(process.env.PORT) || 3000;

  async function shutdown(signal) {
    console.log(`[cms] ${signal} - shutting down`);
    if (dbConnected) {
      await prisma.$disconnect().catch(() => {});
    }
    process.exit(0);
  }

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  createApp()
    .then(({ app }) => {
      app.listen(port, () => {
        console.log(`[dev] Site http://localhost:${port}`);
        if (process.env.NODE_ENV !== 'production' && dbConnected) {
          console.log('[auth] Login http://localhost:' + port + '/login');
          console.log('[cms] Dashboard http://localhost:' + port + '/admin/dashboard.html');
        }
      });
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
