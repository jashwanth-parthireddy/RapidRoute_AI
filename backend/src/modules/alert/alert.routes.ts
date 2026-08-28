import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../../config/db';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { success, createError } from '../../utils/helpers';
import { broadcastEvent } from '../../websocket';
import { sendNotification } from '../../services/notificationService';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

// GET /api/alerts — list alerts (filtered by role)
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let whereClause = '';
    const params: any[] = [];

    if (req.user!.role === 'officer') {
      const officer = await queryOne<any>('SELECT id FROM traffic_officers WHERE user_id=$1', [req.user!.userId]);
      if (!officer) throw createError('Officer profile not found', 404);
      params.push(officer.id);
      whereClause = `WHERE al.officer_id=$${params.length}`;
    } else if (req.query.emergency_id) {
      params.push(req.query.emergency_id);
      whereClause = `WHERE al.emergency_id=$${params.length}`;
    }

    const alerts = await query<any>(`
      SELECT al.*,
        j.name AS junction_name, j.latitude AS junction_lat, j.longitude AS junction_lng, j.traffic_level,
        e.emergency_code, e.priority,
        a.ambulance_number,
        u.name AS officer_name
      FROM alerts al
      JOIN junctions j ON j.id=al.junction_id
      JOIN emergencies e ON e.id=al.emergency_id
      JOIN ambulances a ON a.id=e.ambulance_id
      LEFT JOIN traffic_officers o ON o.id=al.officer_id
      LEFT JOIN users u ON u.id=o.user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT 100
    `, params);
    return success(res, alerts);
  } catch (err) { next(err); }
});

// POST /api/alerts — create alert for a junction+officer
router.post('/', authorize('admin', 'control_room'), async (req, res: Response, next: NextFunction) => {
  try {
    const { emergency_id, junction_id, officer_id, priority, eta_minutes, message } = req.body;
    if (!emergency_id || !junction_id) throw createError('emergency_id and junction_id required', 400);

    const [alert] = await query<any>(`
      INSERT INTO alerts (emergency_id, junction_id, officer_id, priority, status, eta_minutes, message, sent_at)
      VALUES ($1,$2,$3,$4,'sent',$5,$6,NOW()) RETURNING *
    `, [emergency_id, junction_id, officer_id || null, priority || 'high', eta_minutes || null, message || null]);

    // Notify officer
    if (officer_id) {
      const officerUser = await queryOne<any>(`
        SELECT u.id, u.name, u.email FROM traffic_officers o
        JOIN users u ON u.id=o.user_id WHERE o.id=$1`, [officer_id]);
      if (officerUser) {
        await sendNotification({
          userId: officerUser.id,
          title: '🚨 Emergency Ambulance Alert',
          message: message || `Ambulance approaching your junction. ETA: ${eta_minutes?.toFixed(1)} min`,
          type: 'emergency',
          metadata: { alertId: alert.id, emergencyId: emergency_id },
        });
      }
    }

    broadcastEvent('JUNCTION_ALERT_CREATED', { alert, junctionId: junction_id, officerId: officer_id });
    logger.info('Alert created', { alertId: alert.id, junctionId: junction_id });
    return success(res, alert, 'Alert created', 201);
  } catch (err) { next(err); }
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', authorize('officer', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [alert] = await query<any>(
      `UPDATE alerts SET status='acknowledged', acknowledged_at=NOW()
       WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!alert) throw createError('Alert not found', 404);
    broadcastEvent('JUNCTION_ALERT_ACKNOWLEDGED', { alertId: alert.id, junctionId: alert.junction_id });
    return success(res, alert, 'Alert acknowledged');
  } catch (err) { next(err); }
});

// POST /api/alerts/:id/clearing
router.post('/:id/clearing', authorize('officer', 'admin'), async (req, res: Response, next: NextFunction) => {
  try {
    const [alert] = await query<any>(
      `UPDATE alerts SET status='clearing', clearing_at=NOW() WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!alert) throw createError('Alert not found', 404);
    await query(`UPDATE junctions SET status='alert_sent' WHERE id=$1`, [alert.junction_id]);
    broadcastEvent('JUNCTION_CLEARING', { alertId: alert.id, junctionId: alert.junction_id });
    return success(res, alert, 'Route being cleared');
  } catch (err) { next(err); }
});

// POST /api/alerts/:id/clear — ambulance passed
router.post('/:id/clear', authorize('officer', 'admin'), async (req, res: Response, next: NextFunction) => {
  try {
    const [alert] = await query<any>(
      `UPDATE alerts SET status='passed', completed_at=NOW() WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!alert) throw createError('Alert not found', 404);
    await query(`UPDATE junctions SET status='clear' WHERE id=$1`, [alert.junction_id]);
    broadcastEvent('JUNCTION_CLEARED', { alertId: alert.id, junctionId: alert.junction_id });
    return success(res, alert, 'Ambulance passed');
  } catch (err) { next(err); }
});

export default router;
