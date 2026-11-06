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

  if (isProd) {
    const dist = path.join(root, 'dist');
    if (!fs.existsSync(dist)) {
      console.error('Run `npm run build` before starting in production.');
      process.exit(1);
    }
    app.use(express.static(dist));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root,
      appType: 'mpa',
      server: { middlewareMode: true },
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
