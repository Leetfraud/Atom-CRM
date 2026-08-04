import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, role } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!role) return
    navigate(role === 'exec' ? '/analytics' : '/sales')
  }, [role, navigate])

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
