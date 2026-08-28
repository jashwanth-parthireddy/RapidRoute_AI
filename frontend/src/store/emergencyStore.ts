import { create } from 'zustand'

export interface Emergency {
  id: string
  emergency_code: string
  ambulance_id: string
  hospital_id: string
  status: string
  priority: string
  eta_minutes: number
  distance_remaining: number
  current_latitude: number
  current_longitude: number
  current_speed: number
  start_time: string
  ambulance_number?: string
  hospital_name?: string
  driver_name?: string
  hospital_lat?: number
  hospital_lng?: number
}

export interface Alert {
  id: string
  emergency_id: string
  junction_id: string
  junction_name?: string
  officer_name?: string
  priority: string
  status: string
  eta_minutes?: number
  ambulance_number?: string
  emergency_code?: string
}

interface EmergencyState {
  activeEmergencies:  Emergency[]
  activeAlerts:       Alert[]
  currentEmergency:   Emergency | null
  setActiveEmergencies: (e: Emergency[]) => void
  updateEmergency:    (id: string, patch: Partial<Emergency>) => void
  addEmergency:       (e: Emergency) => void
  removeEmergency:    (id: string) => void
  setCurrentEmergency:(e: Emergency | null) => void
  setActiveAlerts:    (a: Alert[]) => void
  updateAlert:        (id: string, patch: Partial<Alert>) => void
  addAlert:           (a: Alert) => void
}

export const useEmergencyStore = create<EmergencyState>((set) => ({
  activeEmergencies: [],
  activeAlerts:      [],
  currentEmergency:  null,

  setActiveEmergencies: (e) => set({ activeEmergencies: e }),
  updateEmergency: (id, patch) =>
    set((s) => ({ activeEmergencies: s.activeEmergencies.map((e) => e.id === id ? { ...e, ...patch } : e) })),
  addEmergency: (e) =>
    set((s) => ({ activeEmergencies: [e, ...s.activeEmergencies.filter((x) => x.id !== e.id)] })),
  removeEmergency: (id) =>
    set((s) => ({ activeEmergencies: s.activeEmergencies.filter((e) => e.id !== id) })),
  setCurrentEmergency: (e) => set({ currentEmergency: e }),
  setActiveAlerts:     (a) => set({ activeAlerts: a }),
  updateAlert: (id, patch) =>
    set((s) => ({ activeAlerts: s.activeAlerts.map((a) => a.id === id ? { ...a, ...patch } : a) })),
  addAlert: (a) =>
    set((s) => ({ activeAlerts: [a, ...s.activeAlerts.filter((x) => x.id !== a.id)] })),
}))
