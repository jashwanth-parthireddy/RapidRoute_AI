import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../../config/db';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { success, createError } from '../../utils/helpers';
import { broadcastEvent } from '../../websocket';
import { sendNotification } from '../../services/notificationService';

const router = Router();
router.use(authenticate);

// GET /api/hospitals
router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const hospitals = await query<any>('SELECT * FROM hospitals ORDER BY name');
    return success(res, hospitals);
  } catch (err) { next(err); }
});

// GET /api/hospitals/:id
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const h = await queryOne<any>('SELECT * FROM hospitals WHERE id=$1', [req.params.id]);
    if (!h) throw createError('Hospital not found', 404);
    return success(res, h);
  } catch (err) { next(err); }
});

// GET /api/hospitals/:id/incoming-emergencies
router.get('/:id/incoming-emergencies', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const emergencies = await query<any>(`
      SELECT e.*, a.ambulance_number, a.current_latitude, a.current_longitude, a.current_speed,
             u.name AS driver_name
      FROM emergencies e
      JOIN ambulances a ON a.id=e.ambulance_id
      JOIN users u ON u.id=e.driver_id
      WHERE e.hospital_id=$1 AND e.status='active'
      ORDER BY e.start_time DESC
    `, [req.params.id]);
    return success(res, emergencies);
  } catch (err) { next(err); }
});

// GET /api/hospitals/my/incoming — hospital user's own incoming
router.get('/my/incoming', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const hospital = await queryOne<any>('SELECT id FROM hospitals WHERE user_id=$1', [req.user!.userId]);
    if (!hospital) throw createError('Hospital profile not found', 404);

    const emergencies = await query<any>(`
      SELECT e.*, a.ambulance_number, a.current_latitude, a.current_longitude, a.current_speed,
             u.name AS driver_name
      FROM emergencies e
      JOIN ambulances a ON a.id=e.ambulance_id
      JOIN users u ON u.id=e.driver_id
      WHERE e.hospital_id=$1 AND e.status='active'
      ORDER BY e.start_time DESC
    `, [hospital.id]);
    return success(res, emergencies);
  } catch (err) { next(err); }
});

// POST /api/hospitals/notify — send notification to hospital
router.post('/notify', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { hospital_id, emergency_id, eta_minutes, message } = req.body;
    if (!hospital_id || !emergency_id) throw createError('hospital_id and emergency_id required', 400);

    const hospital = await queryOne<any>('SELECT * FROM hospitals WHERE id=$1', [hospital_id]);
    if (!hospital || !hospital.user_id) throw createError('Hospital not found', 404);

    await sendNotification({
      userId: hospital.user_id,
      title: '🚑 Incoming Emergency Ambulance',
      message: message || `Ambulance ETA: ${eta_minutes?.toFixed(0)} minutes. Prepare emergency team.`,
      type: 'emergency',
      metadata: { emergencyId: emergency_id, eta_minutes },
    });

    broadcastEvent('HOSPITAL_NOTIFIED', { hospitalId: hospital_id, emergencyId: emergency_id, etaMinutes: eta_minutes });
    return success(res, null, 'Hospital notified');
  } catch (err) { next(err); }
});

export default router;
