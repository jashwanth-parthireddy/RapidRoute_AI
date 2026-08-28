import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../../config/db';
import { authenticate, authorize } from '../../middleware/auth';
import { success, createError } from '../../utils/helpers';

const router = Router();
router.use(authenticate);

// GET /api/analytics/emergency/:id
router.get('/emergency/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const analytics = await queryOne<any>(
      'SELECT * FROM emergency_trip_analytics WHERE emergency_id=$1',
      [req.params.id]
    );

    const routes = await query<any>(
      'SELECT route_type, distance_km, estimated_time, ai_score FROM routes WHERE emergency_id=$1',
      [req.params.id]
    );

    const alerts = await query<any>(`
      SELECT al.status, al.priority, al.eta_minutes, j.name AS junction_name
      FROM alerts al JOIN junctions j ON j.id=al.junction_id
      WHERE al.emergency_id=$1 ORDER BY al.created_at`, [req.params.id]
    );

    return success(res, { analytics, routes, alerts });
  } catch (err) { next(err); }
});

// GET /api/analytics/summary — system-wide stats
router.get('/summary', authorize('admin', 'control_room'), async (_req, res: Response, next: NextFunction) => {
  try {
    const [stats] = await query<any>(`
      SELECT
        COUNT(DISTINCT e.id)                                         AS total_emergencies,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status='active')       AS active_emergencies,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status='completed')    AS completed_emergencies,
        COALESCE(AVG(a.time_saved),0)                               AS avg_time_saved,
        COALESCE(AVG(a.junctions_cleared),0)                        AS avg_junctions_cleared,
        COALESCE(SUM(a.time_saved),0)                               AS total_time_saved
      FROM emergencies e
      LEFT JOIN emergency_trip_analytics a ON a.emergency_id=e.id
    `);

    const recentEmergencies = await query<any>(`
      SELECT e.emergency_code, e.status, e.priority, e.start_time, e.end_time,
             a.ambulance_number, h.name AS hospital_name,
             eta.time_saved, eta.junctions_cleared
      FROM emergencies e
      JOIN ambulances a ON a.id=e.ambulance_id
      JOIN hospitals h ON h.id=e.hospital_id
      LEFT JOIN emergency_trip_analytics eta ON eta.emergency_id=e.id
      ORDER BY e.created_at DESC LIMIT 10
    `);

    const trafficStats = await query<any>(`
      SELECT j.name, j.traffic_level,
             COALESCE(t.vehicle_count,0) AS vehicle_count,
             COALESCE(t.congestion_pct,0) AS congestion_pct
      FROM junctions j
      LEFT JOIN LATERAL (
        SELECT * FROM traffic_data WHERE junction_id=j.id ORDER BY recorded_at DESC LIMIT 1
      ) t ON TRUE
      ORDER BY t.congestion_pct DESC NULLS LAST LIMIT 5
    `);

    return success(res, { stats, recentEmergencies, trafficStats });
  } catch (err) { next(err); }
});

// GET /api/analytics/timesaved — chart data
router.get('/timesaved', authorize('admin', 'control_room'), async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await query<any>(`
      SELECT DATE(completed_at) AS date,
             AVG(time_saved)::numeric(6,2) AS avg_time_saved,
             COUNT(*) AS count
      FROM emergency_trip_analytics
      WHERE completed_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(completed_at)
      ORDER BY date
    `);
    return success(res, data);
  } catch (err) { next(err); }
});

export default router;
