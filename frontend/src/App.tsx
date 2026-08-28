import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Pages
import LoginPage           from './pages/Login'
import DriverHome          from './pages/driver/DriverHome'
import ControlRoomDashboard from './pages/controlroom/ControlRoomDashboard'
import OfficerPage         from './pages/officer/OfficerPage'
import HospitalPage        from './pages/hospital/HospitalPage'
import AdminDashboard      from './pages/admin/AdminDashboard'

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRedirect() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  const routes: Record<string, string> = {
    driver:       '/driver',
    control_room: '/control-room',
    officer:      '/officer',
    hospital:     '/hospital',
    admin:        '/admin',
  }
  return <Navigate to={routes[user.role] || '/login'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}><span className="spinner"></span></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RoleRedirect />} />

        <Route path="/driver" element={
          <RequireAuth roles={['driver']}>
            <DriverHome />
          </RequireAuth>
        } />

        <Route path="/control-room" element={
          <RequireAuth roles={['control_room', 'admin']}>
            <ControlRoomDashboard />
          </RequireAuth>
        } />

        <Route path="/officer" element={
          <RequireAuth roles={['officer']}>
            <OfficerPage />
          </RequireAuth>
        } />

        <Route path="/hospital" element={
          <RequireAuth roles={['hospital']}>
            <HospitalPage />
          </RequireAuth>
        } />

        <Route path="/admin" element={
          <RequireAuth roles={['admin']}>
            <AdminDashboard />
          </RequireAuth>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
