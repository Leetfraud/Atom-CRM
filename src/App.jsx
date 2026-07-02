import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/Login'
import SalesDashboard from './pages/SalesDashboard'
import Analytics from './pages/Analytics'
import DailyLog from './pages/DailyLog'
import Import from './pages/Import'
import { SidebarProvider } from './context/SidebarContext'

export default function App() {
  return (
    <BrowserRouter>
    <SidebarProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
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
      </AuthProvider>
      </SidebarProvider>
    </BrowserRouter>
  )
}