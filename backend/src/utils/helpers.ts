import { Response } from 'express';

export function success<T>(res: Response, data: T, message = 'Success', statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, message, data });
}

export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
): Response {
  return res.status(200).json({
    success: true,
    data,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

export function generateEmergencyCode(): string {
  const prefix = 'EM';
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${date}${rand}`;
}

/**
 * Haversine formula — distance between two lat/lng points in km
 */
export function haversine(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Find junctions within `radiusKm` of a given coordinate
 */
export function junctionsNearRoute(
  routePoints: Array<{ lat: number; lng: number }>,
  junctions: Array<{ id: string; latitude: number; longitude: number }>,
  radiusKm = 0.5
): string[] {
  const found = new Set<string>();
  for (const point of routePoints) {
    for (const junc of junctions) {
      if (haversine(point.lat, point.lng, junc.latitude, junc.longitude) <= radiusKm) {
        found.add(junc.id);
      }
    }
  }
  return Array.from(found);
}

/**
 * Create a typed HTTP error that the error handler middleware can read
 */
export function createError(message: string, statusCode = 400): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k    = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i    = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Sleep for ms milliseconds (async)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

