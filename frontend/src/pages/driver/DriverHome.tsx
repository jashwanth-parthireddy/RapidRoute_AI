import React, { useEffect, useState } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Ambulance, MapPin, Clock, Zap, Play, StopCircle, LogOut, Navigation, ChevronRight } from 'lucide-react'
import EmergencyMap from '../../components/map/EmergencyMap'

type DriverView = 'home' | 'select-hospital' | 'active'

export default function DriverHome() {
  const { user, logout } = useAuthStore()
  const [view, setView] = useState<DriverView>('home')
  const [ambulance, setAmb] = useState<any>(null)
  const [hospitals, setHosps] = useState<any[]>([])
  const [selectedHosp, setSelHosp] = useState<any>(null)
  const [emergency, setEmerg] = useState<any>(null)
  const [route, setRoute] = useState<any>(null)
  const [loading, setLoad] = useState(false)
  const [endConfirm, setEndC] = useState(false)

  useWebSocket()

  useEffect(() => {
    api.get('/ambulances/my').then(r => setAmb(r.data.data)).catch(() => { })
    api.get('/hospitals').then(r => setHosps(r.data.data)).catch(() => { })
  }, [])

  async function createEmergency() {
    if (!ambulance || !selectedHosp) return
    setLoad(true)
    try {
      const { data } = await api.post('/emergencies', {
        ambulance_id: ambulance.id,
        hospital_id: selectedHosp.id,
        priority: 'high',
      })
      const created = data.data
      // Activate immediately
      const { data: actData } = await api.patch(`/emergencies/${created.id}/activate`)
      setEmerg(actData.data.emergency || actData.data)
      // Fetch route
      const { data: routeData } = await api.get(`/routes/recommended?emergency_id=${created.id}`)
      setRoute(routeData.data)
      setView('active')
      toast.success('🚨 Emergency activated! Control room notified.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to activate')
    } finally {
      setLoad(false)
    }
  }

  async function endEmergency() {
    if (!emergency) return
    setLoad(true)
    try {
      await api.patch(`/emergencies/${emergency.id}/end`)
      setEmerg(null)
      setRoute(null)
      setSelHosp(null)
      setView('home')
      setEndC(false)
      toast.success('Emergency ended. Safe journey!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed')
    } finally {
      setLoad(false)
    }
  }

  const routePoints: Array<{ lat: number; lng: number }> = (() => {
    if (!route?.waypoints) return []

    try {
      const waypoints =
        typeof route.waypoints === 'string'
          ? JSON.parse(route.waypoints)
          : route.waypoints

      if (!Array.isArray(waypoints)) return []

      return waypoints
        .filter((p: any) =>
          p &&
          typeof p.lat === 'number' &&
          typeof p.lng === 'number' &&
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng)
        )
        .map((p: any) => ({ lat: p.lat, lng: p.lng }))
    } catch {
      return []
    }
  })()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🚑</span>
          <div>
            <span className="font-black gradient-text-red">RapidRoute AI</span>
            <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Driver</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {ambulance && <span className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)' }}>{ambulance.ambulance_number}</span>}
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.name}</span>
          <button onClick={logout} className="btn btn-secondary btn-sm"><LogOut size={12} /></button>
        </div>
      </header>

      {/* HOME view */}
      {view === 'home' && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-8 animate-fade-in">
          <div className="text-center">
            <div className="text-6xl mb-4">🚑</div>
            <h1 className="text-2xl font-black mb-2">Driver Ready</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Press the button below to activate emergency mode</p>
            {ambulance && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {ambulance.ambulance_number} · Available
              </div>
            )}
          </div>
          <button className="btn btn-emergency w-full max-w-sm" onClick={() => setView('select-hospital')}>
            🚨 ACTIVATE EMERGENCY
          </button>
          <div className="glass-card w-full max-w-sm p-4 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Ambulance Info</h3>
            {ambulance ? (
              <div className="space-y-2 text-sm">
                <InfoRow label="Vehicle" value={ambulance.ambulance_number} />
                <InfoRow label="Type" value={ambulance.vehicle_type} />
                <InfoRow label="Status" value="Available" valueColor="#22c55e" />
              </div>
            ) : <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No ambulance assigned</p>}
          </div>
        </div>
      )}

      {/* SELECT HOSPITAL */}
      {view === 'select-hospital' && (
        <div className="flex flex-col gap-5 p-6 animate-fade-in">
          <div>
            <button onClick={() => setView('home')} className="btn btn-secondary btn-sm mb-4">← Back</button>
            <h2 className="text-xl font-bold">Select Destination Hospital</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Choose the hospital the patient needs to reach</p>
          </div>
          <div className="space-y-3">
            {hospitals.map(h => (
              <button
                key={h.id}
                onClick={() => setSelHosp(h)}
                className="w-full text-left p-4 rounded-xl transition-all glass-card"
                style={{
                  border: `1px solid ${selectedHosp?.id === h.id ? 'var(--accent-cyan)' : 'var(--border)'}`,
                  background: selectedHosp?.id === h.id ? 'rgba(0,212,255,0.06)' : 'var(--bg-glass)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      🏥 {h.name}
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{h.emergency_status}</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{h.address}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Available beds: {h.available_beds}</div>
                  </div>
                  {selectedHosp?.id === h.id && <ChevronRight size={18} style={{ color: 'var(--accent-cyan)' }} />}
                </div>
              </button>
            ))}
          </div>
          <button
            className="btn btn-emergency"
            disabled={!selectedHosp || loading}
            onClick={createEmergency}
          >
            {loading ? <><span className="spinner"></span> Activating…</> : '🚨 ACTIVATE EMERGENCY MODE'}
          </button>
        </div>
      )}

      {/* ACTIVE EMERGENCY */}
      {view === 'active' && emergency && (
        <div className="flex flex-col flex-1 animate-fade-in overflow-hidden">
          {/* Status banner */}
          <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping-slow"></div>
            <div className="flex-1">
              <span className="font-bold text-red-400 text-sm">EMERGENCY ACTIVE</span>
              <span className="ml-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{emergency.emergency_code}</span>
            </div>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)' }}>
              Traffic Control Room Notified ✓
            </span>
          </div>

          {/* Map */}
          <div className="flex-1" style={{ minHeight: 200 }}>
            <EmergencyMap
              ambulances={ambulance ? [{ id: ambulance.id, latitude: ambulance.current_latitude || 17.437, longitude: ambulance.current_longitude || 78.448, label: ambulance.ambulance_number, speed: ambulance.current_speed }] : []}
              hospitals={selectedHosp ? [{ id: selectedHosp.id, latitude: selectedHosp.latitude, longitude: selectedHosp.longitude, name: selectedHosp.name }] : []}
              route={routePoints}
              height="100%"
            />
          </div>

          {/* Info panel */}
          <div className="p-5 space-y-4" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
            <div className="grid grid-cols-3 gap-3">
              <Metric icon={<Clock size={16} />} label="ETA" value={`${emergency.eta_minutes?.toFixed(0) || '—'} min`} color="#00d4ff" />
              <Metric icon={<Navigation size={16} />} label="Distance" value={`${emergency.distance_remaining?.toFixed(1) || '—'} km`} color="#00ff88" />
              <Metric icon={<Zap size={16} />} label="Route" value={route ? 'AI Optimized' : 'Calculating…'} color="#ffb800" />
            </div>

            {route?.ai_reasoning && (
              <div className="p-3 rounded-lg text-xs italic" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', color: 'var(--text-secondary)' }}>
                🤖 "{route.ai_reasoning}"
              </div>
            )}

            <div className="text-center">
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Emergency Route Coordination Active ✓</p>
              {!endConfirm ? (
                <button className="btn btn-danger w-full" onClick={() => setEndC(true)}>
                  <StopCircle size={14} /> End Emergency
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-red-400 font-semibold">Confirm end emergency?</p>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary flex-1" onClick={() => setEndC(false)}>Cancel</button>
                    <button className="btn btn-danger flex-1" onClick={endEmergency} disabled={loading}>
                      {loading ? <span className="spinner"></span> : 'Confirm End'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="font-semibold" style={{ color: valueColor || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
      <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
      <div className="text-lg font-black" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  )
}
