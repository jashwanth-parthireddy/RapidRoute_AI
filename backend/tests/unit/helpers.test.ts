/**
 * Unit Tests — Route Scoring, ETA, Haversine, Emergency Code, Helpers
 * These tests run without a DB connection.
 */

import { haversine, generateEmergencyCode, junctionsNearRoute } from '../../src/utils/helpers'

// ─── Haversine ───────────────────────────────────────────
describe('haversine()', () => {
  test('returns 0 for identical coordinates', () => {
    expect(haversine(17.44, 78.50, 17.44, 78.50)).toBeCloseTo(0, 3)
  })

  test('calculates correct distance between Hyderabad junctions (~5 km)', () => {
    // Ameerpet → Koti ≈ 5 km
    const d = haversine(17.4373, 78.4483, 17.3858, 78.4849)
    expect(d).toBeGreaterThan(4)
    expect(d).toBeLessThan(8)
  })

  test('distance is symmetric', () => {
    const d1 = haversine(17.44, 78.45, 17.42, 78.47)
    const d2 = haversine(17.42, 78.47, 17.44, 78.45)
    expect(d1).toBeCloseTo(d2, 6)
  })
})

// ─── Emergency Code ──────────────────────────────────────
describe('generateEmergencyCode()', () => {
  test('starts with EM', () => {
    expect(generateEmergencyCode().startsWith('EM')).toBe(true)
  })

  test('has expected length (EM + 6 date digits + 4 rand)', () => {
    const code = generateEmergencyCode()
    expect(code.length).toBe(12)
  })

  test('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateEmergencyCode()))
    expect(codes.size).toBeGreaterThan(90)
  })
})

// ─── Junctions Near Route ────────────────────────────────
describe('junctionsNearRoute()', () => {
  const junctions = [
    { id: 'j1', latitude: 17.44, longitude: 78.45 },
    { id: 'j2', latitude: 17.40, longitude: 78.50 },
    { id: 'j3', latitude: 17.50, longitude: 78.40 }, // far
  ]

  test('finds junctions within radius', () => {
    const route = [{ lat: 17.44, lng: 78.45 }]
    const result = junctionsNearRoute(route, junctions, 0.1)
    expect(result).toContain('j1')
    expect(result).not.toContain('j3')
  })

  test('returns empty when no junctions in radius', () => {
    // Route point far from all junctions (different city)
    const route = [{ lat: 17.00, lng: 78.00 }]
    const result = junctionsNearRoute(route, junctions, 0.1)
    expect(result.length).toBe(0)
  })

  test('finds multiple junctions along route', () => {
    const route = [
      { lat: 17.44, lng: 78.45 },
      { lat: 17.40, lng: 78.50 },
    ]
    const result = junctionsNearRoute(route, junctions, 0.1)
    expect(result).toContain('j1')
    expect(result).toContain('j2')
  })
})

// ─── ETA Calculation ─────────────────────────────────────
describe('ETA calculation', () => {
  function calcEta(distKm: number, speedKmh: number) {
    return (distKm / speedKmh) * 60
  }

  test('5 km at 30 km/h = 10 min', () => {
    expect(calcEta(5, 30)).toBeCloseTo(10, 1)
  })

  test('10 km at 40 km/h = 15 min', () => {
    expect(calcEta(10, 40)).toBeCloseTo(15, 1)
  })

  test('ETA decreases with higher speed', () => {
    expect(calcEta(8, 60)).toBeLessThan(calcEta(8, 30))
  })
})

// ─── Priority Logic ──────────────────────────────────────
describe('Junction priority assignment', () => {
  function getPriority(etaMin: number): string {
    if (etaMin <= 3)  return 'critical'
    if (etaMin <= 7)  return 'high'
    if (etaMin <= 12) return 'medium'
    return 'low'
  }

  test('ETA ≤ 3 min → critical', () => expect(getPriority(2)).toBe('critical'))
  test('ETA ≤ 7 min → high',     () => expect(getPriority(5)).toBe('high'))
  test('ETA ≤ 12 min → medium',  () => expect(getPriority(10)).toBe('medium'))
  test('ETA > 12 min → low',     () => expect(getPriority(15)).toBe('low'))
})
