import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/db';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { success, createError, haversine } from '../../utils/helpers';
import { broadcastEvent } from '../../websocket';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

const LocationSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed:     z.number().min(0).optional(),
  heading:   z.number().optional(),
});

// GET /api/ambulances — list all
router.get('/', authorize('admin', 'control_room'), async (_req, res: Response, next: NextFunction) => {
  try {
    const ambulances = await query<any>(`
      SELECT a.*, u.name AS driver_name, u.phone AS driver_phone
      FROM ambulances a
      LEFT JOIN users u ON u.id = a.driver_id
      ORDER BY a.ambulance_number
    `);
    return success(res, ambulances);
  } catch (err) { next(err); }
});

// GET /api/ambulances/my — driver's own ambulance
router.get('/my', authorize('driver'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ambulance = await queryOne<any>(
      `SELECT a.*, u.name AS driver_name FROM ambulances a
       LEFT JOIN users u ON u.id = a.driver_id
       WHERE a.driver_id = $1`,
      [req.user!.userId]
    );
    if (!ambulance) throw createError('No ambulance assigned to this driver', 404);
    return success(res, ambulance);
  } catch (err) { next(err); }
});

// GET /api/ambulances/:id
router.get('/:id', authorize('admin', 'control_room', 'driver'), async (req, res: Response, next: NextFunction) => {
  try {
    const ambulance = await queryOne<any>(`
      SELECT a.*, u.name AS driver_name, u.phone AS driver_phone
      FROM ambulances a LEFT JOIN users u ON u.id = a.driver_id
      WHERE a.id = $1`, [req.params.id]);
    if (!ambulance) throw createError('Ambulance not found', 404);
    return success(res, ambulance);
  } catch (err) { next(err); }
});

// GET /api/ambulances/:id/location
router.get('/:id/location', async (req, res: Response, next: NextFunction) => {
  try {
    const loc = await queryOne<any>(
      `SELECT id, ambulance_number, current_latitude, current_longitude, current_speed, heading, last_location_at, status
       FROM ambulances WHERE id = $1`,
      [req.params.id]
    );
    if (!loc) throw createError('Ambulance not found', 404);
    return success(res, loc);
  } catch (err) { next(err); }
});

// POST /api/ambulances/:id/location — update from driver GPS
router.post('/:id/location', authorize('driver', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = LocationSchema.parse(req.body);
    const { latitude, longitude, speed = 0, heading = 0 } = body;

    const ambulance = await queryOne<any>(
      'SELECT id, driver_id, status FROM ambulances WHERE id = $1',
      [req.params.id]
    );
    if (!ambulance) throw createError('Ambulance not found', 404);
    if (req.user!.role === 'driver' && ambulance.driver_id !== req.user!.userId) {
      throw createError('Not your ambulance', 403);
    }

    await query(
      `UPDATE ambulances SET current_latitude=$1, current_longitude=$2,
       current_speed=$3, heading=$4, last_location_at=NOW()
       WHERE id=$5`,
      [latitude, longitude, speed, heading, req.params.id]
    );

    // Update active emergency location too
    await query(
      `UPDATE emergencies SET current_latitude=$1, current_longitude=$2, current_speed=$3
       WHERE ambulance_id=$4 AND status='active'`,
      [latitude, longitude, speed, req.params.id]
    );

    const payload = { ambulanceId: req.params.id, latitude, longitude, speed, heading, timestamp: new Date() };
    broadcastEvent('AMBULANCE_LOCATION_UPDATED', payload);

    logger.debug('Location updated', { ambulanceId: req.params.id, latitude, longitude });
    return success(res, payload, 'Location updated');
  } catch (err) { next(err); }
});

// POST /api/ambulances — create (admin)
router.post('/', authorize('admin'), async (req, res: Response, next: NextFunction) => {
  try {
    const { ambulance_number, vehicle_type, driver_id } = req.body;
    if (!ambulance_number) throw createError('ambulance_number required', 400);
    const [amb] = await query<any>(
      `INSERT INTO ambulances (ambulance_number, vehicle_type, driver_id)
       VALUES ($1,$2,$3) RETURNING *`,
      [ambulance_number, vehicle_type || 'ALS', driver_id || null]
    );
    return success(res, amb, 'Ambulance created', 201);
  } catch (err) { next(err); }
});

export default router;
