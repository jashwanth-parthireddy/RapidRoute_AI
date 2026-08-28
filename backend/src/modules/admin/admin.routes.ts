import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../../config/db';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { success, createError } from '../../utils/helpers';

const router = Router();
router.use(authenticate, authorize('admin'));

// GET /api/admin/users
router.get('/users', async (req, res: Response, next: NextFunction) => {
  try {
    const users = await query<any>(
      'SELECT id, name, email, phone, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    return success(res, users);
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['active','inactive','suspended'].includes(status)) throw createError('Invalid status', 400);
    await query('UPDATE users SET status=$1 WHERE id=$2', [status, req.params.id]);
    return success(res, null, 'User status updated');
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res: Response, next: NextFunction) => {
  try {
    await query('DELETE FROM users WHERE id=$1', [req.params.id]);
    return success(res, null, 'User deleted');
  } catch (err) { next(err); }
});

// GET /api/admin/logs
router.get('/logs', async (req, res: Response, next: NextFunction) => {
  try {
    const logs = await query<any>(`
      SELECT al.*, u.name AS user_name FROM audit_logs al
      LEFT JOIN users u ON u.id=al.user_id
      ORDER BY al.created_at DESC LIMIT 100
    `);
    return success(res, logs);
  } catch (err) { next(err); }
});

// GET /api/admin/stats
router.get('/stats', async (_req, res: Response, next: NextFunction) => {
  try {
    const [counts] = await query<any>(`
      SELECT
        (SELECT COUNT(*) FROM users)                                          AS total_users,
        (SELECT COUNT(*) FROM ambulances)                                     AS total_ambulances,
        (SELECT COUNT(*) FROM hospitals)                                      AS total_hospitals,
        (SELECT COUNT(*) FROM junctions)                                      AS total_junctions,
        (SELECT COUNT(*) FROM traffic_officers)                               AS total_officers,
        (SELECT COUNT(*) FROM emergencies WHERE status='active')              AS active_emergencies,
        (SELECT COUNT(*) FROM emergencies WHERE status='completed')           AS completed_emergencies
    `);
    return success(res, counts);
  } catch (err) { next(err); }
});

export default router;
