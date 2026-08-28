import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// pg / node error codes that indicate the database is unreachable
const DB_CONN_CODES = new Set([
  'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET',
  '57P03', // cannot_connect_now (pg starting)
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  'CONNECTION_TIMEOUT',
]);

function sanitiseError(err: AppError): { status: number; message: string; code?: string } {
  // DB connection refused / unreachable → 503, no internals leaked
  if (err.code && DB_CONN_CODES.has(err.code)) {
    logger.error('[DB] Connection failure', { code: err.code });
    return { status: 503, message: 'Database is temporarily unavailable. Please try again shortly.' };
  }

  // Validation errors from zod (thrown as plain errors with status 400)
  if (err.statusCode === 400) return { status: 400, message: err.message };

  // Authentication errors
  if (err.statusCode === 401) return { status: 401, message: err.message };
  if (err.statusCode === 403) return { status: 403, message: err.message };
  if (err.statusCode === 404) return { status: 404, message: err.message };
  if (err.statusCode === 409) return { status: 409, message: err.message };

  // Known app errors with explicit status codes
  if (err.statusCode && err.statusCode < 500) {
    return { status: err.statusCode, message: err.message, code: err.code };
  }

  // Generic 500 — don't expose internals in production
  return {
    status: 500,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  };
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const { status, message, code } = sanitiseError(err);

  logger.error(`[${req.method} ${req.path}] ${status} — ${err.message}`, {
    code: err.code,
    stack: err.stack?.split('\n')[1]?.trim(),
  });

  res.status(status).json({
    success: false,
    message,
    ...(code && { code }),
    ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: err.stack }),
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function createError(message: string, statusCode = 400, code?: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}
