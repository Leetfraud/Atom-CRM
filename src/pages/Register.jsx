import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('sales')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmationNeeded, setConfirmationNeeded] = useState(false)

  async function handleRegister() {
    setError(null)

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const { error, needsEmailConfirmation } = await signUp(email, password, fullName.trim(), role)
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (needsEmailConfirmation) {
      setConfirmationNeeded(true)
    } else {
      navigate(role === 'exec' ? '/analytics' : '/sales')
    }
  }

  if (confirmationNeeded) {
    return (
      <div className="flex items-center justify-center h-screen bg-ink">
        <div className="bg-card p-8 rounded-[26px] w-full max-w-sm border border-line text-center">
          <span className="font-display font-bold text-2xl tracking-tight text-paper">ATOM<span className="text-fog">.</span></span>
          <p className="text-paper text-sm mt-4">Check your email to confirm your account, then sign in.</p>
          <Link to="/login" className="text-accent hover:text-paper text-sm mt-6 inline-block transition">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-ink">
      <div className="bg-card p-8 rounded-[26px] w-full max-w-sm border border-line">
        <div className="mb-6 font-display font-bold text-2xl tracking-tight text-paper">
          ATOM<span className="text-fog">.</span>
        </div>
        <p className="text-paper-dim text-sm mb-6">Create your account</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-fog mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-card-2 text-paper rounded-xl px-4 py-2.5 text-sm border border-line focus:outline-none focus:border-accent/50 placeholder-fog transition"
              placeholder="Jane Doe"
            />
          </div>
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
              className="w-full bg-card-2 text-paper rounded-xl px-4 py-2.5 text-sm border border-line focus:outline-none focus:border-accent/50 placeholder-fog transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-fog mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              className="w-full bg-card-2 text-paper rounded-xl px-4 py-2.5 text-sm border border-line focus:outline-none focus:border-accent/50 placeholder-fog transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-fog mb-1.5 block">Role</label>
            <div className="flex items-center bg-card-2 border border-line rounded-full p-1 gap-1">
              {['sales', 'exec'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-wide capitalize transition ${
                    role === r ? 'bg-paper text-ink' : 'text-fog hover:text-paper'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-down text-xs">{error}</p>}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-paper hover:bg-paper/90 text-ink font-display font-bold rounded-full py-2.5 text-sm transition disabled:opacity-50 mt-1"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          <p className="text-fog text-xs text-center mt-1">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-paper transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
