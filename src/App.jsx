import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/Login'
import SalesDashboard from './pages/SalesDashboard'
import ExecDashboard from './pages/ExecDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sales" element={
            <ProtectedRoute allowedRoles={['sales', 'exec']}>
              <SalesDashboard />
            </ProtectedRoute>
          } />
          <Route path="/exec" element={
            <ProtectedRoute allowedRoles={['exec']}>
              <ExecDashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}