import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icons for Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom ambulance icon (pulsing red)
const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative">
    <div style="width:18px;height:18px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(239,68,68,0.8)"></div>
    <div style="position:absolute;top:0;left:0;width:18px;height:18px;background:rgba(239,68,68,0.4);border-radius:50%;animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite"></div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

// Hospital icon
const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:#0f0f1a;border:2px solid #22c55e;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 12px rgba(34,197,94,0.5)">🏥</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

// Junction icon
function junctionIcon(priority: string) {
  const colors: Record<string, string> = { critical: '#ff3b3b', high: '#fb923c', medium: '#eab308', low: '#22c55e' }
  const c = colors[priority] || '#8888b0'
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;background:${c};border:2px solid rgba(255,255,255,0.6);border-radius:50%;box-shadow:0 0 6px ${c}80"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

function FitEmergencyRoute({
  route,
  ambulances,
  hospitals,
}: {
  route: Array<{ lat: number; lng: number }>
  ambulances: Array<{ latitude: number; longitude: number }>
  hospitals: Array<{ latitude: number; longitude: number }>
}) {
  const map = useMap()

  useEffect(() => {
    const points: [number, number][] = []

    route.forEach((p) => {
      if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
        points.push([p.lat, p.lng])
      }
    })

    ambulances.forEach((a) => {
      if (
        Number.isFinite(a.latitude) &&
        Number.isFinite(a.longitude)
      ) {
        points.push([a.latitude, a.longitude])
      }
    })

    hospitals.forEach((h) => {
      if (
        Number.isFinite(h.latitude) &&
        Number.isFinite(h.longitude)
      ) {
        points.push([h.latitude, h.longitude])
      }
    })

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points)

      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 14,
        animate: true,
      })
    }
  }, [route, ambulances, hospitals, map])

  return null
}
export interface MapProps {
  ambulances?: Array<{ id: string; latitude: number; longitude: number; label: string; speed?: number }>
  hospitals?: Array<{ id: string; latitude: number; longitude: number; name: string }>
  junctions?: Array<{ id: string; latitude: number; longitude: number; name: string; priority?: string; traffic_level?: string }>
  route?: Array<{ lat: number; lng: number }>
  altRoute?: Array<{ lat: number; lng: number }>
  centerLat?: number
  centerLng?: number
  height?: string
}

export default function EmergencyMap({
  ambulances = [],
  hospitals = [],
  junctions = [],
  route = [],
  altRoute = [],
  centerLat = 17.42,
  centerLng = 78.45,
  height = '100%',
}: MapProps) {
  const routePoints = route.map(p => [p.lat, p.lng] as [number, number])
  const altRoutePoints = altRoute.map(p => [p.lat, p.lng] as [number, number])


  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={13}
      style={{ height, width: '100%', borderRadius: '10px', minHeight: 300 }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />

      {/* Active route — cyan */}
      {routePoints.length > 1 && (
        <Polyline positions={routePoints} color="#00d4ff" weight={4} opacity={0.85}
          dashArray="" className="" />
      )}

      {/* Alt route — amber dashed */}
      {altRoutePoints.length > 1 && (
        <Polyline positions={altRoutePoints} color="#ffb800" weight={3} opacity={0.6} dashArray="10 6" />
      )}

      {/* Ambulances */}
      {ambulances.map((a) => (
        <Marker key={a.id} position={[a.latitude, a.longitude]} icon={ambulanceIcon}>
          <Popup>
            <div style={{ minWidth: 160 }}>
              <strong style={{ color: '#ef4444' }}>🚑 {a.label}</strong>
              {a.speed !== undefined && <div style={{ fontSize: 12, marginTop: 4, color: '#8888b0' }}>Speed: {a.speed.toFixed(0)} km/h</div>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Hospitals */}
      {hospitals.map((h) => (
        <Marker key={h.id} position={[h.latitude, h.longitude]} icon={hospitalIcon}>
          <Popup>
            <strong style={{ color: '#22c55e' }}>🏥 {h.name}</strong>
          </Popup>
        </Marker>
      ))}

      {/* Junctions */}
      {junctions.map((j) => (
        <Marker key={j.id} position={[j.latitude, j.longitude]}
          icon={junctionIcon(j.priority || j.traffic_level || 'low')}>
          <Popup>
            <div style={{ minWidth: 150 }}>
              <strong>{j.name}</strong>
              <div style={{ fontSize: 12, marginTop: 4, color: '#8888b0' }}>
                Traffic: <span style={{ color: j.priority === 'critical' ? '#ff3b3b' : '#eab308' }}>{j.traffic_level || j.priority}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Auto-fit ambulance, route and hospital */}
      <FitEmergencyRoute
        route={route}
        ambulances={ambulances}
        hospitals={hospitals}
      />
    </MapContainer>
  )
}
