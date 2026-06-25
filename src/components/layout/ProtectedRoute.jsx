import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-white text-sm">
      Loading...
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'exec' ? '/exec' : '/sales'} replace />
  }

  return children
}