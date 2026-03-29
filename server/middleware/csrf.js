import Tokens from 'csrf';

const tokens = new Tokens();
let secret;

export function initCsrf(csrfSecret) {
  if (csrfSecret && csrfSecret.length >= 32) {
    secret = csrfSecret;
  } else {
    secret = tokens.secretSync();
  }
}

export function createCsrfToken() {
  return tokens.create(secret);
}

export function verifyCsrfToken(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    return tokens.verify(secret, token);
  } catch {
    return false;
  }
}

export function csrfProtection(req, res, next) {
  const token = req.headers['x-csrf-token'];
  if (!verifyCsrfToken(token)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}
