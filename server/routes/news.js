import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { prisma } from '../prisma.js';

const CATEGORIES = ['world', 'economy', 'tech', 'research'];
const VARIANTS = ['hero', 'tall', 'wide', 'default'];

const validateArticle = [
  body('title').isString().trim().isLength({ min: 1, max: 500 }),
  body('excerpt').isString().trim().isLength({ min: 1, max: 2000 }),
  body('body').optional().isString().isLength({ max: 100000 }),
  body('cover_image').optional({ values: 'null' }).isString().isLength({ max: 2000 }),
  body('category').isIn(CATEGORIES),
  body('author').isString().trim().isLength({ min: 1, max: 200 }),
  body('card_variant').optional().isIn(VARIANTS),
  body('sort_order').optional().isInt({ min: 0, max: 9999 }),
  body('published_at').optional().isInt(),
];

function toApiArticle(a) {
  return {
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    cover_image: a.coverImage,
    category: a.category,
    author: a.author,
    card_variant: a.cardVariant,
    sort_order: a.sortOrder,
    published_at: a.publishedAt,
    created_at: Math.floor(a.createdAt.getTime() / 1000),
    updated_at: Math.floor(a.updatedAt.getTime() / 1000),
  };
}

export function createNewsRouter({ jwtAccessSecret }) {
  const router = express.Router();
  const auth = requireAuth(jwtAccessSecret);
  const adminOnly = requireRole('admin');

  router.get('/public', async (_req, res) => {
    const rows = await prisma.newsArticle.findMany({
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    });
    res.json({ articles: rows.map(toApiArticle) });
  });

  router.get('/public/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const row = await prisma.newsArticle.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ article: toApiArticle(row) });
  });

  router.get('/admin', auth, adminOnly, async (_req, res) => {
    const rows = await prisma.newsArticle.findMany({
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    });
    res.json({ articles: rows.map(toApiArticle) });
  });

  router.post('/', auth, adminOnly, csrfProtection, validateArticle, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }
    const now = Math.floor(Date.now() / 1000);
    const published = req.body.published_at ?? now;
    const variant = req.body.card_variant || 'default';
    const order = req.body.sort_order ?? 0;

    const article = await prisma.newsArticle.create({
      data: {
        title: req.body.title,
        excerpt: req.body.excerpt,
        body: req.body.body || '',
        coverImage: req.body.cover_image || null,
        category: req.body.category,
        author: req.body.author,
        cardVariant: variant,
        sortOrder: order,
        publishedAt: published,
      },
    });
    res.status(201).json({ article: toApiArticle(article) });
  });

  router.put(
    '/:id',
    auth,
    adminOnly,
    csrfProtection,
    param('id').isInt(),
    body('title').optional().isString().trim().isLength({ min: 1, max: 500 }),
    body('excerpt').optional().isString().trim().isLength({ min: 1, max: 2000 }),
    body('body').optional().isString().isLength({ max: 100000 }),
    body('cover_image').optional({ values: 'null' }).isString().isLength({ max: 2000 }),
    body('category').optional().isIn(CATEGORIES),
    body('author').optional().isString().trim().isLength({ min: 1, max: 200 }),
    body('card_variant').optional().isIn(VARIANTS),
    body('sort_order').optional().isInt({ min: 0, max: 9999 }),
    body('published_at').optional().isInt(),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input', details: errors.array() });
      }
      const id = Number(req.params.id);
      const cur = await prisma.newsArticle.findUnique({ where: { id } });
      if (!cur) return res.status(404).json({ error: 'Not found' });

      const merged = {
        title: req.body.title ?? cur.title,
        excerpt: req.body.excerpt ?? cur.excerpt,
        body: req.body.body ?? cur.body,
        coverImage: req.body.cover_image !== undefined ? (req.body.cover_image || null) : cur.coverImage,
        category: req.body.category ?? cur.category,
        author: req.body.author ?? cur.author,
        cardVariant: req.body.card_variant ?? cur.cardVariant,
        sortOrder: req.body.sort_order ?? cur.sortOrder,
        publishedAt: req.body.published_at ?? cur.publishedAt,
      };

      const article = await prisma.newsArticle.update({
        where: { id },
        data: merged,
      });
      res.json({ article: toApiArticle(article) });
    }
  );

  router.delete('/:id', auth, adminOnly, csrfProtection, param('id').isInt(), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id' });
    const id = Number(req.params.id);
    try {
      await prisma.newsArticle.delete({ where: { id } });
      res.json({ ok: true });
    } catch {
      return res.status(404).json({ error: 'Not found' });
    }
  });

  return router;
}
