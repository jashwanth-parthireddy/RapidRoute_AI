import { query } from '../config/db';
import { sendToUser } from '../websocket';
import { logger } from '../utils/logger';

interface NotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: string;
  metadata?: object;
}

export async function sendNotification(params: NotificationParams): Promise<void> {
  const { userId, title, message, type = 'info', metadata = {} } = params;

  // 1. Persist in DB
  try {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, metadata)
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, title, message, type, JSON.stringify(metadata)]
    );
  } catch (err: any) {
    logger.warn('Failed to persist notification', { userId, error: err.message });
  }

  // 2. Real-time WebSocket push
  sendToUser(userId, 'NOTIFICATION', { title, message, type, metadata });

  // 3. Email (optional — only if email configured)
  if (process.env.EMAIL_USER) {
    sendEmailNotification(params).catch((e) =>
      logger.warn('Email send failed', { error: e.message })
    );
  }
}

async function sendEmailNotification({ userId, title, message }: NotificationParams): Promise<void> {
  // Lazy import nodemailer so the app still works if not installed
  try {
    const nodemailer = await import('nodemailer');
    const user = await query<any>('SELECT email FROM users WHERE id=$1', [userId]);
    if (!user[0]?.email) return;

    const transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   parseInt(process.env.EMAIL_PORT || '587'),
      auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      user[0].email,
      subject: `[RapidRoute AI] ${title}`,
      text:    message,
      html:    `<div style="font-family:sans-serif"><h2>🚑 ${title}</h2><p>${message}</p><hr/><small>RapidRoute AI Emergency System</small></div>`,
    });
  } catch {
    // silently skip
  }
}

// GET notifications for a user
export async function getUserNotifications(userId: string, limit = 20): Promise<any[]> {
  return query<any>(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`,
    [notificationId, userId]
  );
}
