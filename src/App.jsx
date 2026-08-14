import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { SidebarProvider } from './context/SidebarContext'
import { EditModeProvider } from './context/EditModeContext'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const SalesDashboard = lazy(() => import('./pages/SalesDashboard'))
const Analytics = lazy(() => import('./pages/Analytics'))
const DailyLog = lazy(() => import('./pages/DailyLog'))
const Import = lazy(() => import('./pages/Import'))
const OAuthConsent = lazy(() => import('./pages/OAuthConsent'))

export default function App() {
  return (
    <BrowserRouter>
    <SidebarProvider>
      <EditModeProvider>
      <AuthProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Deliberately outside ProtectedRoute: this is the OAuth
                authorization endpoint an external client redirects to, and it
                handles its own sign-in bounce so the pending request survives
                the round trip through /login. */}
            <Route path="/oauth/authorize" element={<OAuthConsent />} />
            <Route path="/sales" element={
              <ProtectedRoute allowedRoles={['sales', 'exec']}>
                <SalesDashboard />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute allowedRoles={['exec']}>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/daily-log" element={
              <ProtectedRoute allowedRoles={['exec']}>
                <DailyLog />
              </ProtectedRoute>
            } />
            <Route path="/import" element={
              <ProtectedRoute allowedRoles={['exec']}>
                <Import />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
      </EditModeProvider>
      </SidebarProvider>
    </BrowserRouter>
  )
}