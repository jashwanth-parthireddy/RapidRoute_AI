import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'admin' | 'driver' | 'officer' | 'hospital' | 'control_room'
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:    null,
      token:   null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          const { user, accessToken } = data.data
          localStorage.setItem('rr_token', accessToken)
          set({ user, token: accessToken, loading: false })
        } catch (err) {
          set({ loading: false })
          throw err
        }
      },

      logout: () => {
        localStorage.removeItem('rr_token')
        localStorage.removeItem('rr_user')
        set({ user: null, token: null })
        window.location.href = '/login'
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'rr_user', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)
