import React, { useEffect, useState } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { LogOut, MapPin, Clock, CheckCircle, AlertTriangle, Truck } from 'lucide-react'

export default function OfficerPage() {
  const { user, logout } = useAuthStore()
  const [alerts,  setAlerts]  = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useWebSocket()

  useEffect(() => {
    api.get('/alerts').then(r => setAlerts(r.data.data)).catch(() => {})
  }, [])

  async function updateStatus(alertId: string, action: 'acknowledge' | 'clearing' | 'clear') {
    setLoading(p => ({ ...p, [alertId]: true }))
    try {
      await api.post(`/alerts/${alertId}/${action}`)
      setAlerts(prev => prev.map(a =>
        a.id === alertId
          ? { ...a, status: action === 'acknowledge' ? 'acknowledged' : action === 'clearing' ? 'clearing' : 'passed' }
          : a
      ))
      const msgs: Record<string, string> = { acknowledge: 'Alert acknowledged', clearing: 'Route being cleared', clear: 'Ambulance passed — junction clear' }
      toast.success(msgs[action])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed')
    } finally {
      setLoading(p => ({ ...p, [alertId]: false }))
    }
  }

  const activeAlerts = alerts.filter(a => !['passed','cleared'].includes(a.status))
  const pastAlerts   = alerts.filter(a => ['passed','cleared'].includes(a.status))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span>👮</span>
          <span className="font-bold">Traffic Officer</span>
          {user && <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>{user.name}</span>}
        </div>
        <button onClick={logout} className="btn btn-secondary btn-sm"><LogOut size={12} /></button>
      </header>

      <div className="p-5 space-y-5">
        {/* Active alerts */}
        {activeAlerts.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-3">🟢</div>
            <p className="font-semibold">No active alerts</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Your junction is clear. Stay ready.</p>
          </div>
        ) : (
          activeAlerts.map(alert => (
            <div key={alert.id} className="emergency-alert animate-slide-in">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-red-400" />
                <span className="font-black text-red-400 text-lg">🚨 EMERGENCY AMBULANCE</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <AlertField label="Ambulance" value={alert.ambulance_number || '—'} icon={<Truck size={14} />} />
                <AlertField label="Your Junction" value={alert.junction_name || '—'} icon={<MapPin size={14} />} />
                <AlertField label="ETA" value={alert.eta_minutes ? `${Math.ceil(alert.eta_minutes)} min` : '—'} icon={<Clock size={14} />} large />
                <AlertField label="Priority" value={alert.priority?.toUpperCase()} icon={<AlertTriangle size={14} />}
                  valueStyle={{ color: alert.priority === 'critical' ? '#ff3b3b' : '#fb923c', fontWeight: 'bold' }} />
              </div>

              <div className="p-3 rounded-lg text-center text-sm font-bold mb-4" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ff6b6b' }}>
                STATUS: {statusLabel(alert.status)}
              </div>

              <div className="grid gap-2">
                {alert.status === 'sent' && (
                  <button className="btn btn-primary" onClick={() => updateStatus(alert.id, 'acknowledge')} disabled={loading[alert.id]}>
                    {loading[alert.id] ? <span className="spinner"></span> : <CheckCircle size={14} />} Acknowledge
                  </button>
                )}
                {['sent','acknowledged'].includes(alert.status) && (
                  <button className="btn btn-secondary" onClick={() => updateStatus(alert.id, 'clearing')} disabled={loading[alert.id]}>
                    🚧 Route Being Cleared
                  </button>
                )}
                {['acknowledged','clearing'].includes(alert.status) && (
                  <button className="btn btn-success" onClick={() => updateStatus(alert.id, 'clear')} disabled={loading[alert.id]}>
                    ✅ Ambulance Passed
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Past alerts */}
        {pastAlerts.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Completed ({pastAlerts.length})</h3>
            {pastAlerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="glass-card p-3 mb-2 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{alert.junction_name}</span>
                  <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{alert.ambulance_number}</span>
                </div>
                <span className="status-badge status-completed">Cleared</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    sent: 'ROUTE CLEARANCE REQUIRED',
    acknowledged: 'ACKNOWLEDGED — PREPARE TO CLEAR',
    clearing: 'ROUTE BEING CLEARED',
    passed: 'AMBULANCE PASSED',
    cleared: 'JUNCTION CLEAR',
  }
  return m[s] || s.toUpperCase()
}

function AlertField({ label, value, icon, large, valueStyle }: { label: string; value: string; icon: React.ReactNode; large?: boolean; valueStyle?: React.CSSProperties }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{icon} {label}</div>
      <div className={large ? 'text-3xl font-black' : 'text-base font-bold'} style={valueStyle || { color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
