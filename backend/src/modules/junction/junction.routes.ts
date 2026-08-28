import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../../config/db';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { success, createError, haversine } from '../../utils/helpers';
import { callAIService } from '../../services/aiService';

const router = Router();
router.use(authenticate);

// GET /api/junctions — all junctions
router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const junctions = await query<any>(`
      SELECT j.*, t.vehicle_count, t.average_speed, t.congestion_pct, t.recorded_at AS traffic_updated_at,
             o.id AS officer_id, u.name AS officer_name
      FROM junctions j
      LEFT JOIN LATERAL (
        SELECT * FROM traffic_data WHERE junction_id=j.id ORDER BY recorded_at DESC LIMIT 1
      ) t ON TRUE
      LEFT JOIN traffic_officers o ON o.assigned_junction_id=j.id
      LEFT JOIN users u ON u.id=o.user_id
      ORDER BY j.name
    `);
    return success(res, junctions);
  } catch (err) { next(err); }
});

// GET /api/junctions/near-route?points=...&radius=0.5
router.get('/near-route', async (req, res: Response, next: NextFunction) => {
  try {
    const { points, radius = '0.5' } = req.query as { points: string; radius?: string };
    if (!points) throw createError('points required (JSON array of {lat,lng})', 400);

    const routePoints: Array<{lat:number;lng:number}> = JSON.parse(points);
    const radiusKm = parseFloat(radius);

    const junctions = await query<any>('SELECT * FROM junctions');
    const nearby = junctions.filter((j: any) =>
      routePoints.some(p => haversine(p.lat, p.lng, j.latitude, j.longitude) <= radiusKm)
    );

    // Add AI priority scores
    let prioritized = nearby;
    try {
      const aiRes = await callAIService('/junctions/prioritize', { junctions: nearby });
      if (aiRes?.junctions) prioritized = aiRes.junctions;
    } catch { /* use plain list */ }

    return success(res, prioritized);
  } catch (err) { next(err); }
});

// GET /api/junctions/:id
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const j = await queryOne<any>(`
      SELECT j.*, o.id AS officer_id, u.name AS officer_name, u.phone AS officer_phone
      FROM junctions j
      LEFT JOIN traffic_officers o ON o.assigned_junction_id=j.id
      LEFT JOIN users u ON u.id=o.user_id
      WHERE j.id=$1`, [req.params.id]);
    if (!j) throw createError('Junction not found', 404);
    return success(res, j);
  } catch (err) { next(err); }
});

// PATCH /api/junctions/:id/traffic — update traffic level
router.patch('/:id/traffic', authorize('admin', 'control_room'), async (req, res: Response, next: NextFunction) => {
  try {
    const { traffic_level } = req.body;
    await query('UPDATE junctions SET traffic_level=$1 WHERE id=$2', [traffic_level, req.params.id]);
    return success(res, null, 'Junction traffic updated');
  } catch (err) { next(err); }
});

export default router;
