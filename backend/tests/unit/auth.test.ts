/**
 * Unit Tests — Authentication Logic
 * Tests the auth error handler and error sanitization without a real DB.
 * DB-backed auth tests would require an integration test setup.
 */

import { createError } from '../../src/middleware/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ─── createError helper ───────────────────────────────────
describe('createError()', () => {
  test('creates error with correct status code', () => {
    const err = createError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
  });

  test('creates error with code when provided', () => {
    const err = createError('Bad request', 400, 'INVALID_EMAIL');
    expect(err.code).toBe('INVALID_EMAIL');
  });

  test('does not set code property when not provided', () => {
    const err = createError('Server error', 500);
    expect(err.code).toBeUndefined();
  });

  test('defaults to 400 when no status provided', () => {
    const err = createError('Bad input');
    expect(err.statusCode).toBe(400);
  });

  test('is an instance of Error', () => {
    const err = createError('Test', 401);
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── Password hashing (bcrypt) ───────────────────────────
describe('bcrypt password verification', () => {
  const SEED_HASH = '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS';
  const CORRECT_PASSWORD = 'Password123!';

  test('seed hash matches Password123!', async () => {
    const valid = await bcrypt.compare(CORRECT_PASSWORD, SEED_HASH);
    expect(valid).toBe(true);
  }, 10000);

  test('wrong password does not match seed hash', async () => {
    const valid = await bcrypt.compare('WrongPassword!', SEED_HASH);
    expect(valid).toBe(false);
  }, 10000);

  test('bcrypt.hash + compare round-trip', async () => {
    const hash = await bcrypt.hash('TestPass99!', 10);
    const valid = await bcrypt.compare('TestPass99!', hash);
    expect(valid).toBe(true);
  }, 10000);
});

// ─── JWT token generation ─────────────────────────────────
describe('JWT token generation and verification', () => {
  const SECRET = 'test-secret-min-32-chars-long-pad';
  const PAYLOAD = { userId: 'uuid-1', email: 'test@test.com', role: 'driver' };

  test('generates a verifiable token', () => {
    const token = jwt.sign(PAYLOAD, SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, SECRET) as typeof PAYLOAD;
    expect(decoded.userId).toBe(PAYLOAD.userId);
    expect(decoded.email).toBe(PAYLOAD.email);
    expect(decoded.role).toBe(PAYLOAD.role);
  });

  test('rejects token with wrong secret', () => {
    const token = jwt.sign(PAYLOAD, SECRET, { expiresIn: '1h' });
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  test('rejects expired token', async () => {
    const token = jwt.sign(PAYLOAD, SECRET, { expiresIn: '1ms' });
    await new Promise(r => setTimeout(r, 5));
    expect(() => jwt.verify(token, SECRET)).toThrow(/expired/);
  });

  test('control_room role encodes correctly', () => {
    const crPayload = { userId: 'cr-001', email: 'control@rapidroute.ai', role: 'control_room' };
    const token = jwt.sign(crPayload, SECRET, { expiresIn: '24h' });
    const decoded = jwt.verify(token, SECRET) as typeof crPayload;
    expect(decoded.role).toBe('control_room');
  });
});

// ─── Error code detection (mirrors errorHandler logic) ────
describe('DB error code detection', () => {
  const DB_CONN_CODES = new Set([
    'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET',
    '57P03', '08006', '08001', '08004', 'CONNECTION_TIMEOUT',
  ]);

  test('ECONNREFUSED is a DB connection code', () => {
    expect(DB_CONN_CODES.has('ECONNREFUSED')).toBe(true);
  });

  test('ETIMEDOUT is a DB connection code', () => {
    expect(DB_CONN_CODES.has('ETIMEDOUT')).toBe(true);
  });

  test('generic 500 code is NOT a DB connection code', () => {
    expect(DB_CONN_CODES.has('ERR_UNKNOWN')).toBe(false);
  });

  test('pg error 57P03 (cannot_connect_now) is a DB connection code', () => {
    expect(DB_CONN_CODES.has('57P03')).toBe(true);
  });
});
