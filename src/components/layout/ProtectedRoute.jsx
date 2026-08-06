import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Where each known role lands when it hits a page it isn't allowed on.
// Doubles as the set of roles the app understands.
export const HOME_FOR_ROLE = {
  sales: '/sales',
  exec: '/analytics',
  admin: '/sales',
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, roleError, loading, signOut } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-ink text-paper text-sm font-mono">
      Loading...
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // The profile lookup failed, or the row holds a role this app doesn't know.
  // Both leave us with no valid destination — redirecting would bounce between
  // routes forever, so stop here and explain instead.
  if (roleError || !HOME_FOR_ROLE[role]) {
    return (
      <div className="flex items-center justify-center h-screen bg-ink px-4">
        <div className="bg-card border border-line rounded-[26px] p-8 max-w-sm w-full text-center">
          <p className="font-display font-bold text-paper text-lg">Can't load your profile</p>
          <p className="text-paper-dim text-sm mt-2">
            {roleError
              ? `Your account role couldn't be read: ${roleError}`
              : `Your account has an unrecognised role${role ? ` ("${role}")` : ''}. Ask an admin to set it to sales, exec, or admin.`}
          </p>
          <button
            onClick={signOut}
            className="mt-6 font-mono text-accent hover:text-paper text-[11px] uppercase tracking-wide transition"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (allowedRoles && role !== 'admin' && !allowedRoles.includes(role)) {
    return <Navigate to={HOME_FOR_ROLE[role]} replace />
  }

  return children
}
