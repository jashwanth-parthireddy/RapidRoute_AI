import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useEmergencyStore } from '../store/emergencyStore'
import toast from 'react-hot-toast'

const WS_URL = 'https://rapidroute-ai.onrender.com'.replace(/^http/, 'ws') + '/ws'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()
  const token = useAuthStore((s) => s.token)
  const { addEmergency, updateEmergency, removeEmergency, addAlert, updateAlert } = useEmergencyStore()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const url = token ? `${WS_URL}?token=${token}` : WS_URL
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => { console.log('[WS] Connected') }

    ws.onmessage = (ev) => {
      try {
        const { type, payload } = JSON.parse(ev.data)
        handleEvent(type, payload)
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected — reconnecting in 3s')
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = (e) => { console.warn('[WS] Error', e) }
  }, [token])

  function handleEvent(type: string, payload: any) {
    switch (type) {
      case 'AMBULANCE_EMERGENCY_STARTED':
        addEmergency({ ...payload.emergency, ...payload.ambulance, hospital_name: payload.hospital?.name, hospital_lat: payload.hospital?.latitude, hospital_lng: payload.hospital?.longitude })
        toast(`🚨 Emergency started: ${payload.ambulance?.ambulance_number}`, { duration: 6000, icon: '🚑', style: { borderLeft: '4px solid #ef4444' } })
        break
      case 'AMBULANCE_LOCATION_UPDATED':
        updateEmergency(payload.ambulanceId, { current_latitude: payload.latitude, current_longitude: payload.longitude, current_speed: payload.speed })
        break
      case 'ETA_UPDATED':
        updateEmergency(payload.emergencyId, { eta_minutes: payload.etaMinutes, distance_remaining: payload.distanceKm })
        break
      case 'JUNCTION_ALERT_CREATED':
        addAlert(payload.alert)
        break
      case 'JUNCTION_ALERT_ACKNOWLEDGED':
        updateAlert(payload.alertId, { status: 'acknowledged' })
        break
      case 'JUNCTION_CLEARING':
        updateAlert(payload.alertId, { status: 'clearing' })
        break
      case 'JUNCTION_CLEARED':
        updateAlert(payload.alertId, { status: 'passed' })
        break
      case 'EMERGENCY_COMPLETED':
        removeEmergency(payload.emergencyId)
        toast.success(`✅ Emergency completed! Time saved: ${payload.timeSaved} min`, { duration: 8000 })
        break
      case 'ROUTE_CHANGED':
        toast(`🔄 Route updated: ${payload.reason?.slice(0, 80)}…`, { duration: 7000, icon: '🗺️' })
        break
      case 'TRAFFIC_UPDATED':
        if (payload.type === 'surge') toast.error('⚠️ Traffic surge detected on route!', { duration: 5000 })
        break
      case 'HOSPITAL_NOTIFIED':
        toast('🏥 Hospital has been notified', { duration: 4000 })
        break
      case 'NOTIFICATION':
        toast(payload.message, { duration: 5000 })
        break
      default: break
    }
  }

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = (type: string, payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }

  return { send }
}
