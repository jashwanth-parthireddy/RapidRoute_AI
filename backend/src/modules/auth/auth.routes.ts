import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query, queryOne } from '../../config/db';
import { config } from '../../config/config';
import { success, createError } from '../../utils/helpers';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(['driver', 'officer', 'hospital', 'control_room']),
});

function generateTokens(payload: object) {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
  return { accessToken, refreshToken };
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = LoginSchema.parse(req.body);

    const user = await queryOne<any>(
      'SELECT id, name, email, phone, password_hash, role, status FROM users WHERE email = $1',
      [body.email.toLowerCase()]
    );

    if (!user) {
      throw createError('Invalid email or password', 401);
    }
    if (user.status !== 'active') {
      throw createError('Account is suspended or inactive', 403);
    }

    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid) throw createError('Invalid email or password', 401);

    const payload = { userId: user.id, email: user.email, role: user.role };
    const tokens = generateTokens(payload);

    logger.info('User logged in', { userId: user.id, role: user.role });

    return success(res, {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      ...tokens,
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = RegisterSchema.parse(req.body);

    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [body.email.toLowerCase()]);
    if (existing) throw createError('Email already registered', 409);

    const hash = await bcrypt.hash(body.password, 12);
    const [user] = await query<any>(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, role`,
      [body.name, body.email.toLowerCase(), body.phone || null, hash, body.role]
    );

    const payload = { userId: user.id, email: user.email, role: user.role };
    const tokens = generateTokens(payload);

    logger.info('User registered', { userId: user.id, role: user.role });

    return success(res, {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      ...tokens,
    }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await queryOne<any>(
      'SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );
    if (!user) throw createError('User not found', 404);
    return success(res, user);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError('Refresh token required', 400);

    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
    const tokens = generateTokens({ userId: payload.userId, email: payload.email, role: payload.role });

    return success(res, tokens, 'Token refreshed');
  } catch {
    next(createError('Invalid refresh token', 401));
  }
});

export default router;
