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
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="bg-[#111111] p-8 rounded-xl w-full max-w-sm border border-[#1f1f1f] text-center">
          <span className="text-orange-500 font-bold text-xl tracking-tight">ATOM</span>
          <p className="text-white text-sm mt-4">Check your email to confirm your account, then sign in.</p>
          <Link to="/login" className="text-orange-400 hover:text-orange-300 text-sm mt-6 inline-block transition">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
      <div className="bg-[#111111] p-8 rounded-xl w-full max-w-sm border border-[#1f1f1f]">
        <div className="mb-6">
          <span className="text-orange-500 font-bold text-xl tracking-tight">ATOM</span>
          <span className="text-zinc-600 text-xs block uppercase tracking-widest mt-0.5">CRM</span>
        </div>
        <p className="text-zinc-400 text-sm mb-6">Create your account</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 transition"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 transition"
              placeholder="you@atom.com"
            />
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5 block">Role</label>
            <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1 gap-1">
              {['sales', 'exec'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition ${
                    role === r
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg py-2.5 text-sm transition disabled:opacity-50 mt-1"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          <p className="text-zinc-500 text-xs text-center mt-1">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
