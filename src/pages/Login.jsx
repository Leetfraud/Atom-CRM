import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, role } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (role === 'exec') navigate('/exec')
    if (role === 'sales') navigate('/sales')
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
    <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
      <div className="bg-[#111111] p-8 rounded-xl w-full max-w-sm border border-[#1f1f1f]">
        <div className="mb-6">
          <span className="text-orange-500 font-bold text-xl tracking-tight">EXODUS</span>
          <span className="text-zinc-600 text-xs block uppercase tracking-widest mt-0.5">CRM</span>
        </div>
        <p className="text-zinc-400 text-sm mb-6">Sign in to your account</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 transition"
              placeholder="you@exodus.com"
            />
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 transition"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg py-2.5 text-sm transition disabled:opacity-50 mt-1"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}