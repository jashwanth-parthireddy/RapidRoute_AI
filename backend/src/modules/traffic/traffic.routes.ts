import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../../config/db';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { success, createError } from '../../utils/helpers';
import { broadcastEvent } from '../../websocket';

const router = Router();
router.use(authenticate);

const TRAFFIC_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

// GET /api/traffic/current — all junctions with latest traffic
router.get('/current', async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await query<any>(`
      SELECT j.id, j.name, j.latitude, j.longitude, j.traffic_level, j.status,
             t.vehicle_count, t.average_speed, t.congestion_pct, t.recorded_at
      FROM junctions j
      LEFT JOIN LATERAL (
        SELECT * FROM traffic_data WHERE junction_id=j.id
        ORDER BY recorded_at DESC LIMIT 1
      ) t ON TRUE
      ORDER BY j.name
    `);
    return success(res, data);
  } catch (err) { next(err); }
});

// GET /api/traffic/junction/:id
router.get('/junction/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const history = await query<any>(
      `SELECT * FROM traffic_data WHERE junction_id=$1 ORDER BY recorded_at DESC LIMIT 20`,
      [req.params.id]
    );
    return success(res, history);
  } catch (err) { next(err); }
});

// POST /api/traffic/update — admin/simulation updates traffic
router.post('/update', authorize('admin', 'control_room'), async (req, res: Response, next: NextFunction) => {
  try {
    const { junction_id, traffic_level, vehicle_count, average_speed, congestion_pct } = req.body;
    if (!junction_id || !traffic_level) throw createError('junction_id and traffic_level required', 400);
    if (!TRAFFIC_LEVELS.includes(traffic_level)) throw createError('Invalid traffic_level', 400);

    await query(
      `UPDATE junctions SET traffic_level=$1 WHERE id=$2`,
      [traffic_level, junction_id]
    );
    const [td] = await query<any>(`
      INSERT INTO traffic_data (junction_id, traffic_level, vehicle_count, average_speed, congestion_pct)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [junction_id, traffic_level, vehicle_count || 0, average_speed || 0, congestion_pct || 0]);

    broadcastEvent('TRAFFIC_UPDATED', { junctionId: junction_id, traffic_level, vehicle_count, congestion_pct });
    return success(res, td, 'Traffic updated');
  } catch (err) { next(err); }
});

// POST /api/traffic/simulate-surge — randomise traffic for simulation
router.post('/simulate-surge', authorize('admin', 'control_room'), async (_req, res: Response, next: NextFunction) => {
  try {
    const junctions = await query<any>('SELECT id FROM junctions');
    const updates = junctions.slice(0, 5).map((j: any) => {
      const levels = ['high', 'critical'] as const;
      const level  = levels[Math.floor(Math.random() * 2)];
      const count  = Math.floor(Math.random() * 300 + 400);
      const speed  = Math.floor(Math.random() * 15 + 5);
      const cong   = Math.floor(Math.random() * 30 + 65);
      return query(`UPDATE junctions SET traffic_level=$1 WHERE id=$2`, [level, j.id]).then(() =>
        query(`INSERT INTO traffic_data (junction_id, traffic_level, vehicle_count, average_speed, congestion_pct)
               VALUES ($1,$2,$3,$4,$5)`, [j.id, level, count, speed, cong])
      );
    });
    await Promise.all(updates);
    broadcastEvent('TRAFFIC_UPDATED', { type: 'surge', message: 'Traffic surge simulated on 5 junctions' });
    return success(res, null, 'Traffic surge simulated');
  } catch (err) { next(err); }
});

export default router;
