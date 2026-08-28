import React from 'react'
import { Ambulance, Clock, Navigation, Zap, AlertTriangle, MapPin } from 'lucide-react'
import { Emergency } from '../../store/emergencyStore'
import clsx from 'clsx'

function priorityColor(p: string) {
  return { critical: '#ff3b3b', high: '#fb923c', medium: '#eab308', low: '#22c55e' }[p] || '#8888b0'
}

export function StatsCards({ stats }: {
  stats: { active: number; enRoute: number; highPriJunctions: number; hospitals: number; avgEta: number; timeSaved: number }
}) {
  const cards = [
    { label: 'Active Emergencies',      value: stats.active,           color: '#ff3b3b', icon: <AlertTriangle size={20} /> },
    { label: 'Ambulances En Route',     value: stats.enRoute,          color: '#fb923c', icon: <Ambulance size={20} /> },
    { label: 'High Priority Junctions', value: stats.highPriJunctions, color: '#ffb800', icon: <Zap size={20} /> },
    { label: 'Hospitals Receiving',     value: stats.hospitals,        color: '#22c55e', icon: <MapPin size={20} /> },
    { label: 'Avg ETA (min)',           value: stats.avgEta.toFixed(1),color: '#00d4ff', icon: <Clock size={20} /> },
    { label: 'Est. Time Saved (min)',   value: stats.timeSaved.toFixed(1), color: '#818cf8', icon: <Navigation size={20} /> },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="stat-card glass-card-hover">
          <div className="flex items-center gap-2 mb-2" style={{ color: c.color }}>
            {c.icon}
          </div>
          <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
          <div className="stat-label">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

export function ActiveEmergencyPanel({ emergency }: { emergency: Emergency }) {
  const pColor = priorityColor(emergency.priority)
  return (
    <div className="glass-card p-4 glass-card-hover" style={{ borderLeft: `3px solid ${pColor}` }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-mono text-sm font-bold" style={{ color: 'var(--accent-cyan)' }}>{emergency.emergency_code}</div>
          <div className="font-semibold mt-0.5">{emergency.ambulance_number}</div>
        </div>
        <span className={`status-badge status-${emergency.priority}`}>{emergency.priority}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <InfoRow icon={<MapPin size={12} />} label="Hospital" value={emergency.hospital_name || '—'} />
        <InfoRow icon={<Clock size={12} />}  label="ETA"      value={`${emergency.eta_minutes?.toFixed(1) || '—'} min`} />
        <InfoRow icon={<Navigation size={12} />} label="Distance" value={`${emergency.distance_remaining?.toFixed(1) || '—'} km`} />
        <InfoRow icon={<Zap size={12} />}   label="Speed"    value={`${emergency.current_speed?.toFixed(0) || 0} km/h`} />
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--text-secondary)' }}>
        {icon}<span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  )
}

export function JunctionAlertTable({ alerts }: { alerts: any[] }) {
  if (alerts.length === 0) return (
    <div className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>
      No active junction alerts
    </div>
  )

  const statusLabel: Record<string, string> = {
    pending:      'Pending',
    sent:         'Alerted',
    acknowledged: 'Acknowledged',
    clearing:     'Clearing',
    passed:       'Passed',
    cleared:      'Cleared',
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Junction</th>
            <th>Ambulance ETA</th>
            <th>Traffic</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Officer</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              <td className="font-medium">{a.junction_name}</td>
              <td className="font-mono">{a.eta_minutes ? `${a.eta_minutes.toFixed(1)} min` : '—'}</td>
              <td><span className={`traffic-${a.traffic_level || 'medium'}`}>{a.traffic_level || '—'}</span></td>
              <td><span className={`status-badge status-${a.priority}`}>{a.priority}</span></td>
              <td>
                <span className={clsx('status-badge', {
                  'status-active':    a.status === 'sent',
                  'status-medium':    a.status === 'acknowledged',
                  'status-high':      a.status === 'clearing',
                  'status-completed': a.status === 'passed' || a.status === 'cleared',
                })}>
                  {statusLabel[a.status] || a.status}
                </span>
              </td>
              <td style={{ color: 'var(--text-secondary)' }}>{a.officer_name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
