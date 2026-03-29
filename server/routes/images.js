import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

export function createImageRouter({ jwtAccessSecret }) {
  const router = express.Router();
  const auth = requireAuth(jwtAccessSecret);
  const adminOnly = requireRole('admin');

  router.post('/upload', auth, adminOnly, csrfProtection, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'news', resource_type: 'image' },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      res.json({ url: result.secure_url });
    } catch (err) {
      console.error('[cloudinary]', err.message);
      res.status(500).json({ error: 'Image upload failed' });
    }
  });

  return router;
}
