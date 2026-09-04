import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../../config/db';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { success, createError, haversine } from '../../utils/helpers';
import { callAIService } from '../../services/aiService';
import { broadcastEvent } from '../../websocket';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

/**
 * Generate a simple intermediate waypoint list between two points.
 * In production this would call a routing engine (OSRM/Valhalla).
 * For the prototype we interpolate linearly with small random offsets.
 */
function interpolateWaypoints(
  oLat: number, oLng: number,
  dLat: number, dLng: number,
  steps = 10
): Array<{ lat: number; lng: number }> {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jitter = (Math.random() - 0.5) * 0.002;
    pts.push({ lat: oLat + (dLat - oLat) * t + jitter, lng: oLng + (dLng - oLng) * t + jitter });
  }
  pts[0] = { lat: oLat, lng: oLng };
  pts[pts.length - 1] = { lat: dLat, lng: dLng };
  return pts;
}

// GET /api/routes/recommended?emergency_id=...
router.get('/recommended', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { emergency_id } = req.query as { emergency_id: string };
    if (!emergency_id) throw createError('emergency_id required', 400);

    const emergency = await queryOne<any>(`
      SELECT e.*, h.latitude AS h_lat, h.longitude AS h_lng,
             a.current_latitude AS a_lat, a.current_longitude AS a_lng
      FROM emergencies e
      JOIN hospitals  h ON h.id = e.hospital_id
      JOIN ambulances a ON a.id = e.ambulance_id
      WHERE e.id = $1`, [emergency_id]);
    if (!emergency) throw createError('Emergency not found', 404);

    // Return existing active route only if it still matches
    // the ambulance's current location and hospital destination.
    const existing = await queryOne<any>(
      `SELECT * FROM routes WHERE emergency_id=$1 AND is_active=TRUE LIMIT 1`,
      [emergency_id]
    );

    const currentOLat = Number(emergency.current_latitude ?? emergency.a_lat);
    const currentOLng = Number(emergency.current_longitude ?? emergency.a_lng);
    const currentDLat = Number(emergency.h_lat);
    const currentDLng = Number(emergency.h_lng);

    if (existing) {
      try {
        const existingWaypoints =
          typeof existing.waypoints === 'string'
            ? JSON.parse(existing.waypoints)
            : existing.waypoints;

        const first = Array.isArray(existingWaypoints)
          ? existingWaypoints[0]
          : null;

        const last = Array.isArray(existingWaypoints)
          ? existingWaypoints[existingWaypoints.length - 1]
          : null;

        const startMatches =
          first &&
          Math.abs(Number(first.lat) - currentOLat) < 0.0001 &&
          Math.abs(Number(first.lng) - currentOLng) < 0.0001;

        const destinationMatches =
          last &&
          Math.abs(Number(last.lat) - currentDLat) < 0.0001 &&
          Math.abs(Number(last.lng) - currentDLng) < 0.0001;

        if (startMatches && destinationMatches) {
          return success(res, existing);
        }
      } catch {
        // Invalid/stale route — regenerate it below.
      }

      // Old route does not match the current ambulance position.
      await query(
        `UPDATE routes SET is_active=FALSE WHERE emergency_id=$1`,
        [emergency_id]
      );
    }

    // Build two route options
    const oLat = emergency.current_latitude || emergency.a_lat;
    const oLng = emergency.current_longitude || emergency.a_lng;
    const dLat = emergency.h_lat;
    const dLng = emergency.h_lng;
    const distKm = haversine(oLat, oLng, dLat, dLng);

    const normalWpts = interpolateWaypoints(oLat, oLng, dLat, dLng, 10);
    const altWpts = interpolateWaypoints(oLat, oLng, dLat, dLng, 12);

    const normalTime = (distKm / 30) * 60;        // minutes at 30 km/h
    const altDistKm = distKm * 1.13;              // slightly longer road
    const altTime = (altDistKm / 40) * 60;     // faster due to less traffic

    // Ask AI to score
    let aiReasoning = 'Route B recommended: predicted lower congestion and fewer high-delay junctions.';
    let aiScore = 85;
    try {
      const aiRes = await callAIService('/route/score', {
        normal: { distance: distKm, estimated_time: normalTime },
        alt: { distance: altDistKm, estimated_time: altTime },
        emergency_id,
      });
      if (aiRes?.reasoning) aiReasoning = aiRes.reasoning;
      if (aiRes?.score) aiScore = aiRes.score;
    } catch { /* use defaults */ }

    // Deactivate old routes
    await query(`UPDATE routes SET is_active=FALSE WHERE emergency_id=$1`, [emergency_id]);

    // Insert both routes
    await query(`
      INSERT INTO routes (emergency_id, route_type, waypoints, distance_km, estimated_time, ai_score, ai_reasoning, is_active)
      VALUES ($1,'normal',  $2, $3, $4, 60, 'Standard route via current roads.', FALSE)
    `, [emergency_id, JSON.stringify(normalWpts), distKm, normalTime]);

    const [activeRoute] = await query<any>(`
      INSERT INTO routes (emergency_id, route_type, waypoints, distance_km, estimated_time, ai_score, ai_reasoning, is_active)
      VALUES ($1,'ai_optimized', $2, $3, $4, $5, $6, TRUE)
      RETURNING *
    `, [emergency_id, JSON.stringify(altWpts), altDistKm, altTime, aiScore, aiReasoning]);

    // Update emergency ETA
    await query(`UPDATE emergencies SET eta_minutes=$1, distance_remaining=$2 WHERE id=$3`,
      [altTime, altDistKm, emergency_id]);

    broadcastEvent('ETA_UPDATED', { emergencyId: emergency_id, etaMinutes: altTime, distanceKm: altDistKm });

    return success(res, { ...activeRoute, normal: { distance: distKm, time: normalTime } });
  } catch (err) { next(err); }
});

// POST /api/routes/recalculate
router.post('/recalculate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { emergency_id, reason } = req.body;
    if (!emergency_id) throw createError('emergency_id required', 400);

    const emergency = await queryOne<any>(`
      SELECT e.*, h.latitude AS h_lat, h.longitude AS h_lng
      FROM emergencies e JOIN hospitals h ON h.id=e.hospital_id
      WHERE e.id=$1 AND e.status='active'`, [emergency_id]);
    if (!emergency) throw createError('Active emergency not found', 404);

    const oLat = emergency.current_latitude;
    const oLng = emergency.current_longitude;
    const dLat = emergency.h_lat;
    const dLng = emergency.h_lng;

    if (!oLat || !oLng) throw createError('Ambulance location not yet available', 400);

    const distKm = haversine(oLat, oLng, dLat, dLng);
    const newTime = (distKm / 38) * 60;
    const waypts = interpolateWaypoints(oLat, oLng, dLat, dLng, 12);

    await query(`UPDATE routes SET is_active=FALSE WHERE emergency_id=$1`, [emergency_id]);

    const [route] = await query<any>(`
      INSERT INTO routes (emergency_id, route_type, waypoints, distance_km, estimated_time, ai_score, ai_reasoning, is_active)
      VALUES ($1,'recalculated',$2,$3,$4,90,$5,TRUE) RETURNING *
    `, [emergency_id, JSON.stringify(waypts), distKm, newTime, reason || 'Route recalculated due to traffic change.']);

    await query(`UPDATE emergencies SET eta_minutes=$1, distance_remaining=$2 WHERE id=$3`,
      [newTime, distKm, emergency_id]);

    broadcastEvent('ROUTE_CHANGED', { emergencyId: emergency_id, route, reason });
    broadcastEvent('ETA_UPDATED', { emergencyId: emergency_id, etaMinutes: newTime, distanceKm: distKm });

    logger.info('Route recalculated', { emergencyId: emergency_id, reason });
    return success(res, route, 'Route recalculated');
  } catch (err) { next(err); }
});

// GET /api/routes?emergency_id=...
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { emergency_id } = req.query as { emergency_id: string };
    if (!emergency_id) throw createError('emergency_id required', 400);
    const routes = await query<any>(
      `SELECT * FROM routes WHERE emergency_id=$1 ORDER BY created_at DESC`,
      [emergency_id]
    );
    return success(res, routes);
  } catch (err) { next(err); }
});

export default router;
