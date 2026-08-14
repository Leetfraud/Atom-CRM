import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HOME_FOR_ROLE } from '../components/layout/ProtectedRoute'

// Only same-origin paths are honoured as a post-login destination. Anything
// absolute or protocol-relative ("//evil.com") would turn the login page into
// an open redirect, so those fall through to the role's normal home.
function safeNext(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

export default function Login() {
  const { signIn, role } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // The OAuth consent screen bounces unauthenticated users here with ?next=,
  // so they land back on the pending authorization instead of the dashboard.
  const next = safeNext(searchParams.get('next'))

  useEffect(() => {
    if (!role) return
    navigate(next ?? HOME_FOR_ROLE[role] ?? '/sales')
  }, [role, navigate, next])

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-ink">
      <div className="bg-card p-8 rounded-[26px] w-full max-w-sm border border-line">
        <div className="mb-6 font-display font-bold text-2xl tracking-tight text-paper">
          ATOM<span className="text-fog">.</span>
        </div>
        <p className="text-paper-dim text-sm mb-6">Sign in to your account</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-fog mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-card-2 text-paper rounded-xl px-4 py-2.5 text-sm border border-line focus:outline-none focus:border-accent/50 placeholder-fog transition"
              placeholder="you@atom.com"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-fog mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-card-2 text-paper rounded-xl px-4 py-2.5 text-sm border border-line focus:outline-none focus:border-accent/50 placeholder-fog transition"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-down text-xs">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-paper hover:bg-paper/90 text-ink font-display font-bold rounded-full py-2.5 text-sm transition disabled:opacity-50 mt-1"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-fog text-xs text-center mt-1">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:text-paper transition">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
