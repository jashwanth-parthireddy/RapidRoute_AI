import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/db';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { success, createError, generateEmergencyCode, haversine } from '../../utils/helpers';
import { broadcastEvent } from '../../websocket';
import { callAIService } from '../../services/aiService';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

const CreateEmergencySchema = z.object({
  ambulance_id: z.string().uuid(),
  hospital_id:  z.string().uuid(),
  priority:     z.enum(['low', 'medium', 'high', 'critical']).default('high'),
  notes:        z.string().optional(),
  patient_info: z.object({}).passthrough().optional(),
});

// GET /api/emergencies/active
router.get('/active', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const emergencies = await query<any>(`
      SELECT e.*,
        a.ambulance_number, a.current_latitude, a.current_longitude, a.current_speed,
        h.name AS hospital_name, h.latitude AS hospital_lat, h.longitude AS hospital_lng,
        u.name AS driver_name
      FROM emergencies e
      JOIN ambulances a ON a.id = e.ambulance_id
      JOIN hospitals  h ON h.id = e.hospital_id
      JOIN users      u ON u.id = e.driver_id
      WHERE e.status = 'active'
      ORDER BY e.start_time DESC
    `);
    return success(res, emergencies);
  } catch (err) { next(err); }
});

// GET /api/emergencies — paginated history
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page  = parseInt(req.query.page as string  || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [limit, offset];

    if (req.user!.role === 'driver') {
      params.push(req.user!.userId);
      whereClause = `WHERE e.driver_id = $${params.length}`;
    } else if (req.user!.role === 'hospital') {
      const hospital = await queryOne<any>('SELECT id FROM hospitals WHERE user_id=$1', [req.user!.userId]);
      if (hospital) {
        params.push(hospital.id);
        whereClause = `WHERE e.hospital_id = $${params.length}`;
      }
    }

    const emergencies = await query<any>(`
      SELECT e.*, a.ambulance_number, h.name AS hospital_name, u.name AS driver_name
      FROM emergencies e
      JOIN ambulances a ON a.id = e.ambulance_id
      JOIN hospitals  h ON h.id = e.hospital_id
      JOIN users      u ON u.id = e.driver_id
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    return success(res, emergencies);
  } catch (err) { next(err); }
});

// GET /api/emergencies/:id
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const emergency = await queryOne<any>(`
      SELECT e.*,
        a.ambulance_number, a.current_speed, a.current_latitude AS amb_lat, a.current_longitude AS amb_lng,
        h.name AS hospital_name, h.latitude AS hospital_lat, h.longitude AS hospital_lng, h.address AS hospital_address,
        u.name AS driver_name, u.phone AS driver_phone
      FROM emergencies e
      JOIN ambulances a ON a.id = e.ambulance_id
      JOIN hospitals  h ON h.id = e.hospital_id
      JOIN users      u ON u.id = e.driver_id
      WHERE e.id = $1
    `, [req.params.id]);
    if (!emergency) throw createError('Emergency not found', 404);
    return success(res, emergency);
  } catch (err) { next(err); }
});

// POST /api/emergencies — create
router.post('/', authorize('driver', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = CreateEmergencySchema.parse(req.body);

    // Validate ambulance
    const ambulance = await queryOne<any>('SELECT * FROM ambulances WHERE id=$1', [body.ambulance_id]);
    if (!ambulance) throw createError('Ambulance not found', 404);
    if (ambulance.status === 'emergency') throw createError('Ambulance already in emergency', 409);

    // Validate hospital
    const hospital = await queryOne<any>('SELECT * FROM hospitals WHERE id=$1', [body.hospital_id]);
    if (!hospital) throw createError('Hospital not found', 404);

    const code = generateEmergencyCode();
    const driverId = req.user!.role === 'driver' ? req.user!.userId : ambulance.driver_id;

    const [emergency] = await query<any>(`
      INSERT INTO emergencies
        (emergency_code, ambulance_id, hospital_id, driver_id, status, priority,
         start_latitude, start_longitude, current_latitude, current_longitude, notes, patient_info)
      VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$6,$7,$8,$9)
      RETURNING *
    `, [
      code, body.ambulance_id, body.hospital_id, driverId, body.priority,
      ambulance.current_latitude, ambulance.current_longitude,
      body.notes || null,
      JSON.stringify(body.patient_info || {}),
    ]);

    logger.info('Emergency created', { emergencyId: emergency.id, code });
    return success(res, { ...emergency, hospital, ambulance }, 'Emergency created', 201);
  } catch (err) { next(err); }
});

// PATCH /api/emergencies/:id/activate
router.patch('/:id/activate', authorize('driver', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const emergency = await queryOne<any>('SELECT * FROM emergencies WHERE id=$1', [req.params.id]);
    if (!emergency) throw createError('Emergency not found', 404);
    if (emergency.status !== 'pending') throw createError('Emergency already active or completed', 400);

    // Get full data
    const ambulance = await queryOne<any>('SELECT * FROM ambulances WHERE id=$1', [emergency.ambulance_id]);
    const hospital  = await queryOne<any>('SELECT * FROM hospitals WHERE id=$1',  [emergency.hospital_id]);

    // Calculate initial ETA
    const distKm = haversine(
      ambulance!.current_latitude, ambulance!.current_longitude,
      hospital!.latitude, hospital!.longitude
    );
    const etaMinutes = (distKm / 40) * 60; // assume 40 km/h average emergency speed

    // Activate
    await query(
      `UPDATE emergencies SET status='active', start_time=NOW(), eta_minutes=$1, distance_remaining=$2
       WHERE id=$3`,
      [etaMinutes, distKm, emergency.id]
    );
    await query(`UPDATE ambulances SET status='emergency' WHERE id=$1`, [emergency.ambulance_id]);

    // Get AI route recommendation in background
    callAIService('/route/recommend', {
      origin:      { lat: ambulance!.current_latitude, lng: ambulance!.current_longitude },
      destination: { lat: hospital!.latitude,          lng: hospital!.longitude          },
      emergency_id: emergency.id,
    }).catch((e) => logger.warn('AI route call failed, using fallback', { error: e.message }));

    // Broadcast to all connected clients
    const payload = {
      emergency: { ...emergency, status: 'active', eta_minutes: etaMinutes, distance_remaining: distKm },
      ambulance, hospital,
    };
    broadcastEvent('AMBULANCE_EMERGENCY_STARTED', payload);

    logger.info('Emergency activated', { emergencyId: emergency.id });
    return success(res, payload, 'Emergency activated');
  } catch (err) { next(err); }
});

// PATCH /api/emergencies/:id/end
router.patch('/:id/end', authorize('driver', 'admin', 'control_room'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const emergency = await queryOne<any>('SELECT * FROM emergencies WHERE id=$1', [req.params.id]);
    if (!emergency) throw createError('Emergency not found', 404);
    if (emergency.status !== 'active') throw createError('Emergency is not active', 400);

    await query(
      `UPDATE emergencies SET status='completed', end_time=NOW() WHERE id=$1`,
      [emergency.id]
    );
    await query(`UPDATE ambulances SET status='available' WHERE id=$1`, [emergency.ambulance_id]);

    // Save analytics
    const normalEta   = emergency.eta_minutes || 30;
    const startTime   = new Date(emergency.start_time).getTime();
    const actualMin   = (Date.now() - startTime) / 60000;
    const timeSaved   = Math.max(0, normalEta - actualMin);

    const alerts = await query<any>(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='cleared' OR status='passed') AS cleared
       FROM alerts WHERE emergency_id=$1`,
      [emergency.id]
    );

    await query(`
      INSERT INTO emergency_trip_analytics
        (emergency_id, normal_eta, optimized_eta, actual_duration, time_saved,
         junctions_alerted, junctions_cleared, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      ON CONFLICT (emergency_id) DO UPDATE SET
        actual_duration=EXCLUDED.actual_duration, time_saved=EXCLUDED.time_saved
    `, [
      emergency.id,
      normalEta,
      emergency.eta_minutes,
      actualMin,
      timeSaved,
      parseInt(alerts[0]?.total || '0'),
      parseInt(alerts[0]?.cleared || '0'),
    ]);

    broadcastEvent('EMERGENCY_COMPLETED', {
      emergencyId: emergency.id,
      timeSaved: timeSaved.toFixed(1),
      actualDuration: actualMin.toFixed(1),
    });

    logger.info('Emergency completed', { emergencyId: emergency.id, timeSaved });
    return success(res, { emergencyId: emergency.id, timeSaved, actualDuration: actualMin });
  } catch (err) { next(err); }
});

export default router;
