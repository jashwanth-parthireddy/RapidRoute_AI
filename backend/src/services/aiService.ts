import fetch from 'node-fetch';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export async function callAIService(path: string, body: object): Promise<any> {
  const url = `${config.ai.serviceUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ai.timeout);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal as any,
    });
    if (!res.ok) {
      logger.warn('AI service error', { path, status: res.status });
      return null;
    }
    return await res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.warn('AI service timeout', { path });
    } else {
      logger.warn('AI service unreachable', { path, error: err.message });
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAIRouteRecommendation(params: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  emergency_id: string;
}): Promise<any> {
  return callAIService('/route/recommend', params);
}

export async function getAIEtaPrediction(params: {
  distance_km: number;
  current_speed: number;
  junction_count: number;
  traffic_levels: string[];
}): Promise<any> {
  return callAIService('/eta/predict', params);
}

export async function getAIJunctionPriorities(params: {
  ambulance_eta: number;
  junctions: any[];
}): Promise<any> {
  return callAIService('/junctions/prioritize', params);
}
