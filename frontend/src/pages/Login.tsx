import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { Ambulance, Shield, Activity } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { role: 'Driver',        email: 'driver1@rapidroute.ai',   password: 'Password123!' },
  { role: 'Control Room',  email: 'control@rapidroute.ai',   password: 'Password123!' },
  { role: 'Officer',       email: 'officer1@rapidroute.ai',  password: 'Password123!' },
  { role: 'Hospital',      email: 'hospital1@rapidroute.ai', password: 'Password123!' },
  { role: 'Admin',         email: 'admin@rapidroute.ai',     password: 'Password123!' },
]

export default function LoginPage() {
  const { user, login, loading } = useAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  if (user) return <Navigate to={getHomeByRole(user.role)} replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed'
      setError(msg)
      toast.error(msg)
    }
  }

  function quickLogin(acc: typeof DEMO_ACCOUNTS[0]) {
    setEmail(acc.email)
    setPassword(acc.password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(124,58,237,0.06) 0%, transparent 60%), var(--bg-primary)' }}>
      <div className="w-full max-w-[420px] px-4 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 8px 32px rgba(239,68,68,0.4)' }}>
            <Ambulance size={30} color="#fff" />
          </div>
          <h1 className="text-3xl font-black gradient-text-red">RapidRoute AI</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Emergency Route Clearance System</p>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ff6b6b' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            SIMULATION MODE
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-950/40 px-3 py-2 rounded-lg border border-red-900/40">{error}</p>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg mt-2">
              {loading ? <><span className="spinner"></span> Signing In…</> : 'Sign In'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6">
            <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Demo Accounts</p>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => quickLogin(acc)}
                  className="btn btn-secondary text-left justify-start text-xs py-2"
                >
                  <span className="font-semibold" style={{ color: 'var(--accent-cyan)', minWidth: 90 }}>{acc.role}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs mt-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          ⚠️ This prototype simulates emergency coordination. It does not control real traffic signals or government infrastructure.
        </p>
      </div>
    </div>
  )
}

function getHomeByRole(role: string): string {
  const map: Record<string, string> = {
    driver:       '/driver',
    control_room: '/control-room',
    officer:      '/officer',
    hospital:     '/hospital',
    admin:        '/admin',
  }
  return map[role] || '/login'
}
