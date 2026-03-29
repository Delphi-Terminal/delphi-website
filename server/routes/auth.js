import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';
import { signAccessToken } from '../lib/jwt.js';
import { sendAuthEmail } from '../lib/mailer.js';
import { getCookie, requireAuth, requireRole, COOKIE_ACCESS } from '../middleware/auth.js';
import { createCsrfToken, csrfProtection, verifyCsrfToken } from '../middleware/csrf.js';
import express from 'express';
import { prisma } from '../prisma.js';

const COOKIE_REFRESH = 'dm_refresh';
const MAX_LOGIN_FAILS = 5;
const LOCK_MINUTES = 15;
const REFRESH_DAYS = 7;
const CODE_TTL_MINUTES = 15;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this IP. Try again later.' },
});

const strictLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const authActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again shortly.' },
});

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function makeCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function codeDeadline() {
  return Math.floor(Date.now() / 1000) + CODE_TTL_MINUTES * 60;
}

function cookieOpts(req, maxAgeMs) {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeMs,
  };
}

async function issueSession({ req, res, user, jwtAccessSecret }) {
  const now = Math.floor(Date.now() / 1000);
  const access = await signAccessToken(
    { sub: String(user.id), role: user.role },
    jwtAccessSecret
  );

  const rawRefresh = crypto.randomBytes(48).toString('base64url');
  const refreshHash = hashToken(rawRefresh);
  const exp = now + REFRESH_DAYS * 24 * 60 * 60;
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: exp,
    },
  });

  res.cookie(COOKIE_ACCESS, access, cookieOpts(req, 15 * 60 * 1000));
  res.cookie(COOKIE_REFRESH, rawRefresh, cookieOpts(req, REFRESH_DAYS * 24 * 60 * 60 * 1000));
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    email_verified_at: user.emailVerifiedAt ? Math.floor(user.emailVerifiedAt.getTime() / 1000) : null,
  };
}

function toAdminUser(user) {
  return {
    ...toPublicUser(user),
    created_at: user.createdAt ? Math.floor(user.createdAt.getTime() / 1000) : null,
  };
}

async function sendVerificationCode(email, code) {
  await sendAuthEmail({
    to: email,
    subject: 'Verify your Delphi Markets account',
    heading: 'Verify your email',
    intro: 'Enter this code on the Delphi Markets verification screen to activate your account.',
    code,
    detail: `This code expires in ${CODE_TTL_MINUTES} minutes. If you did not request this account, you can ignore this email.`,
  });
}

async function sendPasswordResetCode(email, code) {
  await sendAuthEmail({
    to: email,
    subject: 'Reset your Delphi Markets password',
    heading: 'Reset your password',
    intro: 'Use this code to reset your Delphi Markets password.',
    code,
    detail: `This code expires in ${CODE_TTL_MINUTES} minutes. If you did not request a password reset, you can ignore this email.`,
  });
}

export function createAuthRouter({ jwtAccessSecret }) {
  const router = express.Router();
  const auth = requireAuth(jwtAccessSecret);
  const adminOnly = requireRole('admin');

  router.get('/csrf', (req, res) => {
    const csrfToken = createCsrfToken();
    res.json({ csrfToken });
  });

  router.post(
    '/register',
    authActionLimiter,
    body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
    body('password').isString().isLength({ min: 12, max: 512 }),
    body('csrfToken').isString().isLength({ min: 1, max: 256 }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      if (!verifyCsrfToken(req.body.csrfToken)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      const email = req.body.email;
      const password = req.body.password;
      const passwordHash = await bcrypt.hash(password, 12);
      const code = makeCode();
      const expiresAt = codeDeadline();
      const verificationCodeHash = hashToken(code);

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.emailVerifiedAt) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      let user;
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            verificationCodeHash,
            verificationCodeExpiresAt: expiresAt,
            passwordResetCodeHash: null,
            passwordResetCodeExpiresAt: null,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            role: 'customer',
            verificationCodeHash,
            verificationCodeExpiresAt: expiresAt,
          },
        });
      }

      await sendVerificationCode(email, code);

      res.status(201).json({
        ok: true,
        next: `/verify?email=${encodeURIComponent(email)}`,
        user: toPublicUser(user),
      });
    }
  );

  router.post(
    '/verify-email',
    authActionLimiter,
    body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
    body('code').isString().trim().isLength({ min: 6, max: 6 }),
    body('csrfToken').isString().isLength({ min: 1, max: 256 }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      if (!verifyCsrfToken(req.body.csrfToken)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      const email = req.body.email;
      const codeHash = hashToken(req.body.code);
      const user = await prisma.user.findUnique({ where: { email } });
      const now = Math.floor(Date.now() / 1000);

      if (
        !user ||
        user.emailVerifiedAt ||
        !user.verificationCodeHash ||
        !user.verificationCodeExpiresAt ||
        user.verificationCodeExpiresAt < now ||
        user.verificationCodeHash !== codeHash
      ) {
        return res.status(400).json({ error: 'Invalid or expired verification code.' });
      }

      const verifiedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          verificationCodeHash: null,
          verificationCodeExpiresAt: null,
        },
      });

      res.json({ ok: true, user: toPublicUser(verifiedUser) });
    }
  );

  router.post(
    '/resend-verification',
    authActionLimiter,
    body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
    body('csrfToken').isString().isLength({ min: 1, max: 256 }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      if (!verifyCsrfToken(req.body.csrfToken)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      const email = req.body.email;
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && !user.emailVerifiedAt) {
        const code = makeCode();
        await prisma.user.update({
          where: { id: user.id },
          data: {
            verificationCodeHash: hashToken(code),
            verificationCodeExpiresAt: codeDeadline(),
          },
        });
        await sendVerificationCode(email, code);
      }

      res.json({ ok: true });
    }
  );

  router.post(
    '/login',
    loginLimiter,
    strictLoginLimiter,
    body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
    body('password').isString().isLength({ min: 1, max: 512 }),
    body('csrfToken').isString().isLength({ min: 1, max: 256 }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      if (!verifyCsrfToken(req.body.csrfToken)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      const email = req.body.email;
      const password = req.body.password;
      const now = Math.floor(Date.now() / 1000);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.lockedUntil != null && user.lockedUntil > now) {
        return res.status(423).json({ error: 'Account temporarily locked. Try again later.' });
      }

      let ok = false;
      try {
        ok = await bcrypt.compare(password, user.passwordHash);
      } catch {
        ok = false;
      }

      if (!ok) {
        const fails = (user.failedLoginAttempts || 0) + 1;
        const lockedUntil =
          fails >= MAX_LOGIN_FAILS ? now + LOCK_MINUTES * 60 : null;
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: fails, lockedUntil },
        });
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.role !== 'admin' && !user.emailVerifiedAt) {
        return res.status(403).json({
          error: 'Verify your email before signing in.',
          needs_verification: true,
          next: `/verify?email=${encodeURIComponent(user.email)}`,
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });

      await issueSession({ req, res, user: updatedUser, jwtAccessSecret });

      res.json({
        user: toPublicUser(updatedUser),
      });
    }
  );

  router.post(
    '/forgot-password',
    authActionLimiter,
    body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
    body('csrfToken').isString().isLength({ min: 1, max: 256 }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      if (!verifyCsrfToken(req.body.csrfToken)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      const email = req.body.email;
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && (user.emailVerifiedAt || user.role === 'admin')) {
        const code = makeCode();
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetCodeHash: hashToken(code),
            passwordResetCodeExpiresAt: codeDeadline(),
          },
        });
        await sendPasswordResetCode(email, code);
      }

      res.json({ ok: true });
    }
  );

  router.post(
    '/reset-password',
    authActionLimiter,
    body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
    body('code').isString().trim().isLength({ min: 6, max: 6 }),
    body('password').isString().isLength({ min: 12, max: 512 }),
    body('csrfToken').isString().isLength({ min: 1, max: 256 }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      if (!verifyCsrfToken(req.body.csrfToken)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      const email = req.body.email;
      const codeHash = hashToken(req.body.code);
      const user = await prisma.user.findUnique({ where: { email } });
      const now = Math.floor(Date.now() / 1000);

      if (
        !user ||
        !user.passwordResetCodeHash ||
        !user.passwordResetCodeExpiresAt ||
        user.passwordResetCodeExpiresAt < now ||
        user.passwordResetCodeHash !== codeHash
      ) {
        return res.status(400).json({ error: 'Invalid or expired reset code.' });
      }

      const passwordHash = await bcrypt.hash(req.body.password, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetCodeHash: null,
          passwordResetCodeExpiresAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      res.json({ ok: true });
    }
  );

  router.post(
    '/logout',
    body('csrfToken').isString().isLength({ min: 1, max: 256 }),
    async (req, res) => {
      if (!verifyCsrfToken(req.body.csrfToken)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }
      const refresh = getCookie(req, COOKIE_REFRESH);
      if (refresh) {
        const h = hashToken(refresh);
        await prisma.refreshToken.deleteMany({ where: { tokenHash: h } });
      }
      res.clearCookie(COOKIE_ACCESS, { path: '/', sameSite: 'strict' });
      res.clearCookie(COOKIE_REFRESH, { path: '/', sameSite: 'strict' });
      res.json({ ok: true });
    }
  );

  router.post(
    '/refresh',
    body('csrfToken').isString().isLength({ min: 1, max: 256 }),
    async (req, res) => {
      if (!verifyCsrfToken(req.body.csrfToken)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }
      const raw = getCookie(req, COOKIE_REFRESH);
      if (!raw) return res.status(401).json({ error: 'Unauthorized' });

      const h = hashToken(raw);
      const now = Math.floor(Date.now() / 1000);

      const row = await prisma.refreshToken.findFirst({
        where: {
          tokenHash: h,
          expiresAt: { gt: now },
        },
        include: { user: true },
      });

      if (!row) {
        res.clearCookie(COOKIE_ACCESS, { path: '/', sameSite: 'strict' });
        res.clearCookie(COOKIE_REFRESH, { path: '/', sameSite: 'strict' });
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await prisma.refreshToken.delete({ where: { id: row.id } });

      const newRaw = crypto.randomBytes(48).toString('base64url');
      const newHash = hashToken(newRaw);
      const exp = now + REFRESH_DAYS * 24 * 60 * 60;
      await prisma.refreshToken.create({
        data: {
          userId: row.userId,
          tokenHash: newHash,
          expiresAt: exp,
        },
      });

      const access = await signAccessToken(
        { sub: String(row.userId), role: row.user.role },
        jwtAccessSecret
      );

      res.cookie(COOKIE_ACCESS, access, cookieOpts(req, 15 * 60 * 1000));
      res.cookie(COOKIE_REFRESH, newRaw, cookieOpts(req, REFRESH_DAYS * 24 * 60 * 60 * 1000));
      res.json({ ok: true });
    }
  );

  router.get('/me', async (req, res) => {
    const token = getCookie(req, COOKIE_ACCESS);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { verifyAccessToken } = await import('../lib/jwt.js');
      const payload = await verifyAccessToken(token, jwtAccessSecret);
      const user = await prisma.user.findUnique({
        where: { id: Number(payload.sub) },
        select: { id: true, email: true, role: true, emailVerifiedAt: true, createdAt: true },
      });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      res.json({ user: toAdminUser(user) });
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  });

  router.put(
    '/me/password',
    auth,
    csrfProtection,
    authActionLimiter,
    body('currentPassword').isString().isLength({ min: 1, max: 512 }),
    body('newPassword').isString().isLength({ min: 12, max: 512 }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'New password must be at least 12 characters.' });
      }

      try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
        if (!valid) return res.status(403).json({ error: 'Current password is incorrect.' });

        const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

        res.json({ ok: true });
      } catch (err) {
        console.error('[auth] PUT /me/password error', err.message);
        res.status(500).json({ error: 'Failed to update password.' });
      }
    }
  );

  router.get('/admin/users', auth, adminOnly, async (_req, res) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          email: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });
      res.json({ users: users.map(toAdminUser) });
    } catch (err) {
      console.error('[auth] GET /admin/users error', err.message);
      res.status(500).json({ error: 'Failed to load users' });
    }
  });

  router.post(
    '/admin/users',
    auth,
    adminOnly,
    csrfProtection,
    authActionLimiter,
    body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
    body('password').isString().isLength({ min: 12, max: 512 }),
    body('role').optional().isIn(['customer', 'admin']),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input' });
      }

      const email = req.body.email;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(req.body.password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: req.body.role || 'customer',
          emailVerifiedAt: new Date(),
        },
      });

      res.status(201).json({ user: toAdminUser(user) });
    }
  );

  router.delete(
    '/admin/users/:id',
    auth,
    adminOnly,
    csrfProtection,
    param('id').isInt(),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid id' });
      }

      const id = Number(req.params.id);
      if (req.user?.id === id) {
        return res.status(400).json({ error: 'You cannot delete your own admin account.' });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true },
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      if (user.role === 'admin') {
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'You must keep at least one admin account.' });
        }
      }

      await prisma.refreshToken.deleteMany({ where: { userId: id } });
      await prisma.user.delete({ where: { id } });
      res.json({ ok: true });
    }
  );

  return router;
}
