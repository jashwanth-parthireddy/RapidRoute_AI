import React, { useEffect, useState } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { LogOut, Clock, Navigation, AlertTriangle, Ambulance } from 'lucide-react'

export default function HospitalPage() {
  const { user, logout }         = useAuthStore()
  const [incoming, setIncoming]  = useState<any[]>([])
  const [hospital, setHospital]  = useState<any>(null)

  useWebSocket()

  useEffect(() => {
    api.get('/hospitals/my/incoming')
      .then(r => setIncoming(r.data.data))
      .catch(() => {})
  }, [])

  // Refresh every 30s
  useEffect(() => {
    const iv = setInterval(() => {
      api.get('/hospitals/my/incoming').then(r => setIncoming(r.data.data)).catch(() => {})
    }, 30000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span>🏥</span>
          <span className="font-bold gradient-text">Hospital Dashboard</span>
          {user && <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>{user.name}</span>}
        </div>
        <button onClick={logout} className="btn btn-secondary btn-sm"><LogOut size={12} /></button>
      </header>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Incoming Emergencies</h2>
          {incoming.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm status-active">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {incoming.length} incoming
            </div>
          )}
        </div>

        {incoming.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <div className="text-5xl mb-3">🟢</div>
            <p className="font-semibold text-lg">No Incoming Emergencies</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Emergency room is available. All teams on standby.</p>
          </div>
        ) : (
          incoming.map(e => (
            <div key={e.id} className="emergency-alert animate-slide-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
                  <Ambulance size={20} className="text-red-400" />
                </div>
                <div>
                  <div className="font-black text-red-400">INCOMING EMERGENCY</div>
                  <div className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{e.emergency_code}</div>
                </div>
                <span className={`status-badge status-${e.priority} ml-auto`}>{e.priority}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <Metric label="Ambulance" value={e.ambulance_number} icon={<Ambulance size={14} />} />
                <Metric label="Driver"    value={e.driver_name}      icon={<span style={{fontSize:14}}>👤</span>} />
                <Metric label="ETA"       value={e.eta_minutes ? `${Math.ceil(e.eta_minutes)} min` : '—'} icon={<Clock size={14} />} large valueColor="#00d4ff" />
                <Metric label="Distance"  value={e.distance_remaining ? `${e.distance_remaining.toFixed(1)} km` : '—'} icon={<Navigation size={14} />} />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ff6b6b' }}>
                <AlertTriangle size={14} />
                PREPARE EMERGENCY TEAM — AMBULANCE EN ROUTE
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, icon, large, valueColor }: { label: string; value: string; icon: React.ReactNode; large?: boolean; valueColor?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{icon} {label}</div>
      <div className={large ? 'text-3xl font-black' : 'text-base font-semibold'} style={{ color: valueColor || 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
