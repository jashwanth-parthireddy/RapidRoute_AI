import React, { useEffect, useState } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useEmergencyStore } from '../../store/emergencyStore'
import { useAuthStore } from '../../store/authStore'
import { StatsCards, ActiveEmergencyPanel, JunctionAlertTable } from '../../components/dashboard/DashboardWidgets'
import EmergencyMap from '../../components/map/EmergencyMap'
import SimulationControls from '../../components/simulation/SimulationControls'
import AIInsightsPanel from '../../components/ai/AIInsightsPanel'
import api from '../../services/api'
import { LogOut, Radio, Activity, Cpu, Map as MapIcon, AlertTriangle } from 'lucide-react'

type Tab = 'map' | 'alerts' | 'ai' | 'simulation'

export default function ControlRoomDashboard() {
  const { user, logout }     = useAuthStore()
  const { activeEmergencies, activeAlerts } = useEmergencyStore()
  const [tab, setTab]        = useState<Tab>('map')
  const [junctions, setJunctions] = useState<any[]>([])
  const [hospitals,  setHospitals] = useState<any[]>([])
  const [stats,      setStats]     = useState({ active: 0, enRoute: 0, highPriJunctions: 0, hospitals: 0, avgEta: 0, timeSaved: 0 })
  const [loading,    setLoading]   = useState(true)

  useWebSocket() // connect and listen for events

  useEffect(() => {
    async function load() {
      try {
        const [emergRes, alertRes, juncRes, hospRes, sumRes] = await Promise.allSettled([
          api.get('/emergencies/active'),
          api.get('/alerts'),
          api.get('/junctions'),
          api.get('/hospitals'),
          api.get('/analytics/summary'),
        ])
        if (emergRes.status === 'fulfilled') useEmergencyStore.getState().setActiveEmergencies(emergRes.value.data.data)
        if (alertRes.status  === 'fulfilled') useEmergencyStore.getState().setActiveAlerts(alertRes.value.data.data)
        if (juncRes.status   === 'fulfilled') setJunctions(juncRes.value.data.data)
        if (hospRes.status   === 'fulfilled') setHospitals(hospRes.value.data.data)
        if (sumRes.status    === 'fulfilled') {
          const s = sumRes.value.data.data.stats
          setStats({
            active:          parseInt(s.active_emergencies)   || 0,
            enRoute:         parseInt(s.active_emergencies)   || 0,
            highPriJunctions: junctions.filter(j => j.traffic_level === 'critical' || j.traffic_level === 'high').length,
            hospitals:       parseInt(s.total_hospitals) || 0,
            avgEta:          activeEmergencies.reduce((a, e) => a + (e.eta_minutes || 0), 0) / Math.max(1, activeEmergencies.length),
            timeSaved:       parseFloat(s.avg_time_saved) || 0,
          })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Update stats when store changes
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      active:  activeEmergencies.length,
      enRoute: activeEmergencies.length,
      avgEta:  activeEmergencies.reduce((a, e) => a + (e.eta_minutes || 0), 0) / Math.max(1, activeEmergencies.length),
    }))
  }, [activeEmergencies])

  const mapAmbulances = activeEmergencies.map(e => ({
    id: e.ambulance_id,
    latitude:  e.current_latitude  || 17.437,
    longitude: e.current_longitude || 78.448,
    label: e.ambulance_number || 'AMB',
    speed: e.current_speed,
  }))

  const mapHospitals = hospitals.map(h => ({
    id: h.id, latitude: h.latitude, longitude: h.longitude, name: h.name,
  }))

  const highPriAlerts = activeAlerts.filter(a => a.priority === 'high' || a.priority === 'critical')

  const tabs: Array<{id: Tab; label: string; icon: React.ReactNode; badge?: number}> = [
    { id: 'map',        label: 'Live Map',      icon: <MapIcon size={15} /> },
    { id: 'alerts',     label: 'Alerts',        icon: <AlertTriangle size={15} />, badge: highPriAlerts.length || undefined },
    { id: 'ai',         label: 'AI Insights',   icon: <Cpu size={15} /> },
    { id: 'simulation', label: 'Simulation',    icon: <Activity size={15} /> },
  ]

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 shrink-0" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>🚑</div>
            <div>
              <span className="font-black text-lg gradient-text-red">RapidRoute AI</span>
              <span className="ml-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Control Room</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--accent-cyan)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            LIVE
          </div>
          {activeEmergencies.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs status-active">
              <Radio size={10} className="animate-pulse" />
              {activeEmergencies.length} ACTIVE EMERGENCY
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.name}</span>
          <button onClick={logout} className="btn btn-secondary btn-sm"><LogOut size={13} /> Logout</button>
        </div>
      </header>

      {/* ─── Stats Bar ──────────────────────────────────────── */}
      <div className="px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <StatsCards stats={stats} />
      </div>

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 px-6 pt-3 shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`btn btn-sm relative ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t.icon} {t.label}
            {t.badge && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: '#ef4444', color: '#fff' }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Main Content ───────────────────────────────────── */}
      <div className="flex flex-1 gap-4 p-6 overflow-hidden">
        {/* Left panel */}
        <div className="flex-1 overflow-hidden rounded-xl">
          {tab === 'map' && (
            <EmergencyMap
              ambulances={mapAmbulances}
              hospitals={mapHospitals}
              junctions={junctions.map(j => ({ id: j.id, latitude: j.latitude, longitude: j.longitude, name: j.name, traffic_level: j.traffic_level }))}
              height="100%"
            />
          )}
          {tab === 'alerts' && (
            <div className="h-full overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Junction Alert Panel</h3>
              <JunctionAlertTable alerts={activeAlerts} />
            </div>
          )}
          {tab === 'ai' && <AIInsightsPanel />}
          {tab === 'simulation' && <SimulationControls />}
        </div>

        {/* Right sidebar — active emergencies */}
        <div className="w-72 xl:w-80 flex flex-col gap-3 overflow-y-auto shrink-0">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Active Emergencies</h3>
          {loading && <div className="text-center py-8"><span className="spinner"></span></div>}
          {!loading && activeEmergencies.length === 0 && (
            <div className="glass-card p-6 text-center" style={{ color: 'var(--text-secondary)' }}>
              <p className="text-3xl mb-2">🟢</p>
              <p className="text-sm">No active emergencies</p>
              <p className="text-xs mt-1">Use Simulation tab to start a demo</p>
            </div>
          )}
          {activeEmergencies.map(e => <ActiveEmergencyPanel key={e.id} emergency={e} />)}
        </div>
      </div>
    </div>
  )
}
