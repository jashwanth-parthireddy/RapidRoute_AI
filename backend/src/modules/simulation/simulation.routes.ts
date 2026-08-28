import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../../config/db';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { success, createError, haversine, generateEmergencyCode } from '../../utils/helpers';
import { broadcastEvent } from '../../websocket';
import { sendNotification } from '../../services/notificationService';
import { callAIService } from '../../services/aiService';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate, authorize('admin', 'control_room'));

// Hyderabad area — realistic simulation hospitals
const HOSPITALS = [
  { id: '10000000-0000-0000-0000-000000000001', lat: 17.4399, lng: 78.4983 },
  { id: '10000000-0000-0000-0000-000000000002', lat: 17.4280, lng: 78.4551 },
  { id: '10000000-0000-0000-0000-000000000003', lat: 17.4239, lng: 78.4090 },
];

const SIM_ROUTES: Record<string, Array<{lat: number; lng: number; progress: number}>> = {};

// POST /api/simulation/start
router.post('/start', async (_req, res: Response, next: NextFunction) => {
  try {
    // Pick first available ambulance
    const ambulance = await queryOne<any>(`
      SELECT a.*, u.id AS driver_user_id FROM ambulances a
      JOIN users u ON u.id=a.driver_id
      WHERE a.status='available' LIMIT 1
    `);
    if (!ambulance) throw createError('No ambulances available for simulation', 400);

    // Pick random hospital
    const hospitalSeed = HOSPITALS[Math.floor(Math.random() * HOSPITALS.length)];
    const hospital = await queryOne<any>('SELECT * FROM hospitals WHERE id=$1', [hospitalSeed.id]);
    if (!hospital) throw createError('Hospital data missing — run seed', 500);

    const code = generateEmergencyCode();
    const oLat = ambulance.current_latitude  || 17.4373;
    const oLng = ambulance.current_longitude || 78.4483;

    const [emergency] = await query<any>(`
      INSERT INTO emergencies
        (emergency_code, ambulance_id, hospital_id, driver_id, status, priority,
         start_latitude, start_longitude, current_latitude, current_longitude)
      VALUES ($1,$2,$3,$4,'active','high',$5,$6,$5,$6)
      RETURNING *
    `, [code, ambulance.id, hospital.id, ambulance.driver_id, oLat, oLng]);

    await query('UPDATE ambulances SET status=$1 WHERE id=$2', ['emergency', ambulance.id]);

    const distKm   = haversine(oLat, oLng, hospital.latitude, hospital.longitude);
    const etaMin   = (distKm / 35) * 60;

    await query('UPDATE emergencies SET eta_minutes=$1, distance_remaining=$2 WHERE id=$3',
      [etaMin, distKm, emergency.id]);

    // Build interpolated route
    const steps = 30;
    const route: Array<{lat:number; lng:number; progress:number}> = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      route.push({
        lat:      oLat + (hospital.latitude  - oLat) * t,
        lng:      oLng + (hospital.longitude - oLng) * t,
        progress: t,
      });
    }
    SIM_ROUTES[emergency.id] = route;

    // Store route in DB
    await query(`
      INSERT INTO routes (emergency_id, route_type, waypoints, distance_km, estimated_time, ai_score, ai_reasoning, is_active)
      VALUES ($1,'ai_optimized',$2,$3,$4,88,'Simulation route: optimised for low-congestion path.',TRUE)
    `, [emergency.id, JSON.stringify(route.map(r => ({ lat: r.lat, lng: r.lng }))), distKm, etaMin]);

    // Alerts for first 3 junctions along the route
    const junctions = await query<any>('SELECT j.*, o.id AS officer_id FROM junctions j LEFT JOIN traffic_officers o ON o.assigned_junction_id=j.id LIMIT 5');
    for (let i = 0; i < Math.min(3, junctions.length); i++) {
      const j = junctions[i];
      const dist = haversine(oLat, oLng, j.latitude, j.longitude);
      const eta  = (dist / 35) * 60;
      await query(`
        INSERT INTO alerts (emergency_id, junction_id, officer_id, priority, status, eta_minutes, message, sent_at)
        VALUES ($1,$2,$3,'high','sent',$4,$5,NOW())
      `, [emergency.id, j.id, j.officer_id || null, eta, `🚨 Ambulance ${ambulance.ambulance_number} approaching in ${eta.toFixed(1)} min`]);
    }

    broadcastEvent('AMBULANCE_EMERGENCY_STARTED', {
      emergency: { ...emergency, status: 'active', eta_minutes: etaMin },
      ambulance, hospital,
    });

    logger.info('Simulation started', { emergencyId: emergency.id });
    return success(res, { emergency, ambulance, hospital, etaMinutes: etaMin }, 'Simulation started');
  } catch (err) { next(err); }
});

// POST /api/simulation/tick — advance ambulance one step
router.post('/tick', async (req, res: Response, next: NextFunction) => {
  try {
    const { emergency_id } = req.body;
    const emergency = await queryOne<any>(
      `SELECT e.*, a.id AS amb_id, h.latitude AS h_lat, h.longitude AS h_lng
       FROM emergencies e
       JOIN ambulances a ON a.id=e.ambulance_id
       JOIN hospitals h ON h.id=e.hospital_id
       WHERE e.id=$1 AND e.status='active'`, [emergency_id]
    );
    if (!emergency) throw createError('Active emergency not found', 404);

    const route = SIM_ROUTES[emergency_id];
    if (!route || route.length < 2) {
      // Auto-complete
      await query(`UPDATE emergencies SET status='completed', end_time=NOW() WHERE id=$1`, [emergency_id]);
      await query(`UPDATE ambulances SET status='available' WHERE id=$1`, [emergency.amb_id]);
      broadcastEvent('AMBULANCE_ARRIVED', { emergencyId: emergency_id });
      return success(res, { completed: true });
    }

    const next = route.shift()!;
    const distKm  = haversine(next.lat, next.lng, emergency.h_lat, emergency.h_lng);
    const etaMin  = (distKm / 35) * 60;
    const speed   = 35 + Math.random() * 15;

    await query(
      `UPDATE ambulances SET current_latitude=$1, current_longitude=$2, current_speed=$3, last_location_at=NOW() WHERE id=$4`,
      [next.lat, next.lng, speed, emergency.amb_id]
    );
    await query(
      `UPDATE emergencies SET current_latitude=$1, current_longitude=$2, eta_minutes=$3, distance_remaining=$4 WHERE id=$5`,
      [next.lat, next.lng, etaMin, distKm, emergency_id]
    );

    broadcastEvent('AMBULANCE_LOCATION_UPDATED', { ambulanceId: emergency.amb_id, latitude: next.lat, longitude: next.lng, speed, heading: 90 });
    broadcastEvent('ETA_UPDATED', { emergencyId: emergency_id, etaMinutes: etaMin, distanceKm: distKm });

    const completed = route.length === 0;
    return success(res, { location: next, etaMinutes: etaMin, distanceKm: distKm, routeRemaining: route.length, completed });
  } catch (err) { next(err); }
});

// POST /api/simulation/congestion — trigger traffic surge + route change
router.post('/congestion', async (req, res: Response, next: NextFunction) => {
  try {
    const { emergency_id } = req.body;
    const emergency = await queryOne<any>(
      `SELECT e.*, h.latitude AS h_lat, h.longitude AS h_lng
       FROM emergencies e JOIN hospitals h ON h.id=e.hospital_id WHERE e.id=$1 AND e.status='active'`, [emergency_id]
    );
    if (!emergency) throw createError('Active emergency not found', 404);

    // Surge traffic on 5 random junctions
    const junctions = await query<any>('SELECT id FROM junctions ORDER BY RANDOM() LIMIT 5');
    for (const j of junctions) {
      await query(`UPDATE junctions SET traffic_level='critical' WHERE id=$1`, [j.id]);
      await query(`INSERT INTO traffic_data (junction_id, traffic_level, vehicle_count, average_speed, congestion_pct) VALUES ($1,'critical',580,10,92)`, [j.id]);
    }

    broadcastEvent('TRAFFIC_UPDATED', { type: 'surge', affectedJunctions: junctions.map((j: any) => j.id) });

    // AI recommends route change
    const reason = 'Traffic congestion increased by 38% on current route. Alternative Route B predicted to reduce travel time by approximately 4 minutes. Route change recommended.';
    broadcastEvent('ROUTE_CHANGED', { emergencyId: emergency_id, reason, timeSaved: 4 });

    // Recalculate route
    if (emergency.current_latitude && emergency.current_longitude) {
      const distKm = haversine(emergency.current_latitude, emergency.current_longitude, emergency.h_lat, emergency.h_lng);
      const newTime = (distKm / 42) * 60; // faster alternate
      await query(`UPDATE routes SET is_active=FALSE WHERE emergency_id=$1`, [emergency_id]);
      await query(`
        INSERT INTO routes (emergency_id, route_type, waypoints, distance_km, estimated_time, ai_score, ai_reasoning, is_active)
        VALUES ($1,'recalculated','[]',$2,$3,92,$4,TRUE)
      `, [emergency_id, distKm, newTime, reason]);
      await query(`UPDATE emergencies SET eta_minutes=$1 WHERE id=$2`, [newTime, emergency_id]);
      broadcastEvent('ETA_UPDATED', { emergencyId: emergency_id, etaMinutes: newTime });
    }

    return success(res, { reason }, 'Congestion triggered and route recalculated');
  } catch (err) { next(err); }
});

// POST /api/simulation/complete
router.post('/complete', async (req, res: Response, next: NextFunction) => {
  try {
    const { emergency_id } = req.body;
    const emergency = await queryOne<any>(
      'SELECT * FROM emergencies WHERE id=$1 AND status=\'active\'', [emergency_id]
    );
    if (!emergency) throw createError('Active emergency not found', 404);

    const actualMin = emergency.start_time
      ? (Date.now() - new Date(emergency.start_time).getTime()) / 60000
      : 15;
    const normalEta = 27;
    const timeSaved = Math.max(0, normalEta - actualMin);

    await query(`UPDATE emergencies SET status='completed', end_time=NOW() WHERE id=$1`, [emergency_id]);
    await query(`UPDATE ambulances SET status='available' WHERE id=$1`, [emergency.ambulance_id]);

    const cleared = await query<any>(
      `SELECT COUNT(*) AS cnt FROM alerts WHERE emergency_id=$1 AND status IN ('cleared','passed')`,
      [emergency_id]
    );
    const alerted = await query<any>(`SELECT COUNT(*) AS cnt FROM alerts WHERE emergency_id=$1`, [emergency_id]);

    await query(`
      INSERT INTO emergency_trip_analytics
        (emergency_id, normal_eta, optimized_eta, actual_duration, time_saved, junctions_alerted, junctions_cleared, route_changes, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,1,NOW())
      ON CONFLICT (emergency_id) DO NOTHING
    `, [emergency_id, normalEta, emergency.eta_minutes, actualMin, timeSaved,
        parseInt(alerted[0]?.cnt || '0'), parseInt(cleared[0]?.cnt || '0')]);

    delete SIM_ROUTES[emergency_id];

    broadcastEvent('EMERGENCY_COMPLETED', {
      emergencyId: emergency_id,
      timeSaved: timeSaved.toFixed(1),
      junctionsCoordinated: parseInt(alerted[0]?.cnt || '0'),
      message: `Emergency Completed — Estimated Time Saved: ${timeSaved.toFixed(1)} minutes`,
    });

    return success(res, { timeSaved, actualDuration: actualMin, junctionsAlerted: alerted[0]?.cnt }, 'Emergency completed');
  } catch (err) { next(err); }
});

export default router;
