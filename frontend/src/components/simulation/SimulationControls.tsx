import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { useEmergencyStore } from '../../store/emergencyStore'
import toast from 'react-hot-toast'
import { Play, Pause, Zap, RotateCcw, CheckCircle, AlertTriangle, Activity } from 'lucide-react'

export default function SimulationControls() {
  const [simState,     setSimState]     = useState<'idle' | 'running' | 'paused'>('idle')
  const [emergency,    setEmergency]    = useState<any>(null)
  const [tickInterval, setTickInterval] = useState<ReturnType<typeof setInterval>>()
  const [tickCount,    setTickCount]    = useState(0)
  const [log,          setLog]          = useState<string[]>([])

  function addLog(msg: string) {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)])
  }

  async function startSimulation() {
    try {
      const { data } = await api.post('/simulation/start')
      const e = data.data
      setEmergency(e.emergency)
      setSimState('running')
      setTickCount(0)
      addLog(`🚑 Emergency started: ${e.emergency.emergency_code}`)
      addLog(`🏥 Destination: ${e.hospital.name}`)
      addLog(`📍 Route calculated. ETA: ${e.etaMinutes?.toFixed(1)} min`)
      addLog('🚨 Control room notified. Officers alerted.')
      toast.success('Simulation started!')

      // Start tick timer
      const iv = setInterval(() => tick(e.emergency.id), 1500)
      setTickInterval(iv)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start simulation')
    }
  }

  async function tick(emergencyId: string) {
    try {
      const { data } = await api.post('/simulation/tick', { emergency_id: emergencyId })
      const r = data.data
      setTickCount(c => c + 1)
      if (r.completed) {
        clearInterval(tickInterval)
        setSimState('idle')
        addLog('✅ Ambulance reached hospital!')
      }
    } catch {
      // ignore tick errors
    }
  }

  async function triggerCongestion() {
    if (!emergency) return
    try {
      await api.post('/simulation/congestion', { emergency_id: emergency.id })
      addLog('⚠️ Traffic congestion surge triggered!')
      addLog('🤖 AI: Route B recommended — 4 min faster via alternate path')
      addLog('🔄 Route recalculated by Emergency Coordinator Agent')
      toast('🔄 Route changed due to congestion', { icon: '⚠️' })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed')
    }
  }

  async function completeSimulation() {
    if (!emergency) return
    clearInterval(tickInterval)
    try {
      const { data } = await api.post('/simulation/complete', { emergency_id: emergency.id })
      const r = data.data
      addLog(`🏁 Emergency completed!`)
      addLog(`⏱️ Time saved: ${parseFloat(r.timeSaved).toFixed(1)} min`)
      addLog(`🛣️ Junctions coordinated: ${r.junctionsAlerted}`)
      setSimState('idle')
      setEmergency(null)
      toast.success(`Emergency completed! ${r.timeSaved} min saved`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed')
    }
  }

  function pauseResume() {
    if (simState === 'running') {
      clearInterval(tickInterval)
      setSimState('paused')
      addLog('⏸️ Simulation paused')
    } else if (simState === 'paused' && emergency) {
      const iv = setInterval(() => tick(emergency.id), 1500)
      setTickInterval(iv)
      setSimState('running')
      addLog('▶️ Simulation resumed')
    }
  }

  useEffect(() => () => clearInterval(tickInterval), [tickInterval])

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold mb-1">🎮 Demo Simulation Mode</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Simulate a complete emergency from activation to completion — no real GPS or infrastructure needed.
        </p>
      </div>

      {/* Status */}
      {emergency && (
        <div className="emergency-alert">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-red-400 animate-pulse" />
            <span className="font-bold text-red-400">SIMULATION ACTIVE</span>
          </div>
          <div className="text-sm space-y-1">
            <div>Emergency: <span className="font-mono text-cyan-400">{emergency.emergency_code}</span></div>
            <div>Progress: <span className="text-green-400">{tickCount} steps</span></div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        {simState === 'idle' && (
          <button className="btn btn-primary col-span-2 btn-lg" onClick={startSimulation}>
            <Play size={16} /> Start Emergency Simulation
          </button>
        )}
        {simState !== 'idle' && (
          <button className="btn btn-secondary" onClick={pauseResume}>
            {simState === 'running' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
          </button>
        )}
        <button
          className="btn btn-danger"
          onClick={triggerCongestion}
          disabled={!emergency || simState === 'idle'}
        >
          <Zap size={14} /> Trigger Congestion
        </button>
        <button
          className="btn btn-success col-span-2"
          onClick={completeSimulation}
          disabled={!emergency}
        >
          <CheckCircle size={14} /> Complete Emergency
        </button>
      </div>

      {/* Simulation Steps Reference */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Demo Script</h4>
        <ol className="text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
          {[
            'Click "Start Emergency Simulation"',
            'Control room sees 🚨 new emergency alert',
            'AI calculates optimal route',
            'Officers receive junction alerts',
            'Ambulance moves on live map',
            'Click "Trigger Congestion"',
            'AI recommends alternate route — 4 min saved',
            'Route auto-recalculates',
            'Hospital receives updated ETA',
            'Click "Complete Emergency" → analytics shown',
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono font-bold" style={{ color: 'var(--accent-cyan)', minWidth: 20 }}>{i+1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Event Log */}
      {log.length > 0 && (
        <div className="glass-card p-4 flex-1">
          <h4 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Event Log</h4>
          <div className="space-y-1 font-mono text-xs overflow-y-auto" style={{ maxHeight: 200 }}>
            {log.map((l, i) => (
              <div key={i} className="animate-fade-in" style={{ color: i === 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
