import { verifyAccessToken } from '../lib/jwt.js';

const COOKIE_ACCESS = 'dm_access';

export function getCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parts = raw.split(';');
  for (const p of parts) {
    const [k, ...rest] = p.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function requireAuth(secret) {
  return async (req, res, next) => {
    try {
      const token = getCookie(req, COOKIE_ACCESS);
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const payload = await verifyAccessToken(token, secret);
      req.user = { id: Number(payload.sub), role: payload.role };
      next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export { COOKIE_ACCESS };
