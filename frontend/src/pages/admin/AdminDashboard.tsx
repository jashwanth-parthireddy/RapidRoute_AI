import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { LogOut, Users, Truck, Activity, MapPin, BarChart3, Eye } from 'lucide-react'

type AdminTab = 'overview' | 'users' | 'ambulances' | 'analytics'

export default function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const [tab,   setTab]  = useState<AdminTab>('overview')
  const [stats, setStats] = useState<any>({})
  const [users, setUsers] = useState<any[]>([])
  const [ambs,  setAmbs]  = useState<any[]>([])
  const [recentEmergencies, setRecent] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [sRes, uRes, aRes, sumRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/ambulances'),
        api.get('/analytics/summary'),
      ])
      if (sRes.status === 'fulfilled') setStats(sRes.value.data.data)
      if (uRes.status === 'fulfilled') setUsers(uRes.value.data.data)
      if (aRes.status === 'fulfilled') setAmbs(aRes.value.data.data)
      if (sumRes.status === 'fulfilled') setRecent(sumRes.value.data.data.recentEmergencies || [])
    }
    load()
  }, [])

  async function toggleUserStatus(userId: string, current: string) {
    const next = current === 'active' ? 'suspended' : 'active'
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: next })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: next } : u))
      toast.success(`User ${next}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed')
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14}/> },
    { id: 'users',    label: 'Users',    icon: <Users size={14}/> },
    { id: 'ambulances',label: 'Ambulances', icon: <Truck size={14}/> },
    { id: 'analytics', label: 'Analytics',  icon: <Activity size={14}/> },
  ] as const

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="flex items-center justify-between px-6 py-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <span className="font-black gradient-text">Admin Panel</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>RapidRoute AI</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.name}</span>
          <button onClick={logout} className="btn btn-secondary btn-sm"><LogOut size={12}/></button>
        </div>
      </header>

      <div className="flex gap-1 px-6 pt-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as AdminTab)}
            className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users',         value: stats.total_users,        color: '#00d4ff', icon: '👥' },
                { label: 'Ambulances',           value: stats.total_ambulances,   color: '#22c55e', icon: '🚑' },
                { label: 'Hospitals',            value: stats.total_hospitals,    color: '#7c3aed', icon: '🏥' },
                { label: 'Active Emergencies',   value: stats.active_emergencies, color: '#ef4444', icon: '🚨' },
                { label: 'Completed Trips',      value: stats.completed_emergencies, color: '#818cf8', icon: '✅' },
                { label: 'Traffic Officers',     value: stats.total_officers,     color: '#fb923c', icon: '👮' },
                { label: 'Junctions',            value: stats.total_junctions,    color: '#ffb800', icon: '🚦' },
              ].map(c => (
                <div key={c.label} className="stat-card">
                  <div className="text-2xl mb-1">{c.icon}</div>
                  <div className="stat-value" style={{ color: c.color }}>{c.value ?? '—'}</div>
                  <div className="stat-label">{c.label}</div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3">Recent Emergencies</h3>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Code</th><th>Ambulance</th><th>Hospital</th><th>Status</th><th>Time Saved</th></tr></thead>
                  <tbody>
                    {recentEmergencies.map((e: any) => (
                      <tr key={e.emergency_code}>
                        <td className="font-mono text-xs" style={{ color: 'var(--accent-cyan)' }}>{e.emergency_code}</td>
                        <td>{e.ambulance_number}</td>
                        <td>{e.hospital_name}</td>
                        <td><span className={`status-badge status-${e.status}`}>{e.status}</span></td>
                        <td style={{ color: '#22c55e' }}>{e.time_saved ? `${parseFloat(e.time_saved).toFixed(1)} min` : '—'}</td>
                      </tr>
                    ))}
                    {recentEmergencies.length === 0 && <tr><td colSpan={5} className="text-center py-6" style={{ color: 'var(--text-secondary)' }}>No emergencies yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-bold mb-4">User Management ({users.length})</h3>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)' }}>{u.role}</span></td>
                      <td><span className={`status-badge ${u.status === 'active' ? 'status-low' : 'status-active'}`}>{u.status}</span></td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleUserStatus(u.id, u.status)}
                        >{u.status === 'active' ? 'Suspend' : 'Activate'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'ambulances' && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-bold mb-4">Ambulance Fleet ({ambs.length})</h3>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Vehicle #</th><th>Type</th><th>Driver</th><th>Status</th><th>Last Location</th></tr></thead>
                <tbody>
                  {ambs.map(a => (
                    <tr key={a.id}>
                      <td className="font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>{a.ambulance_number}</td>
                      <td>{a.vehicle_type}</td>
                      <td>{a.driver_name || '—'}</td>
                      <td><span className={`status-badge ${a.status === 'emergency' ? 'status-active' : a.status === 'available' ? 'status-low' : 'status-medium'}`}>{a.status}</span></td>
                      <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {a.current_latitude ? `${a.current_latitude.toFixed(4)}, ${a.current_longitude.toFixed(4)}` : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="animate-fade-in space-y-4">
            <h3 className="text-lg font-bold">System Analytics</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Run a simulation from the Control Room → Simulation tab to generate analytics data.</p>
            <div className="glass-card p-6 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="font-semibold">Analytics Dashboard</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Time-saved charts, junction delay heatmaps, and route efficiency metrics appear here after emergencies are completed.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
