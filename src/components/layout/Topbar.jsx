import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import TeamChat from '../chat/TeamChat'

export default function Topbar({ title, actions }) {
  const { user, role } = useAuth()
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between gap-4 py-1 pb-5 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="font-display font-bold text-2xl tracking-tight text-paper">
            ATOM<span className="text-fog">.</span>
          </div>
          {title && (
            <>
              <span className="text-line text-xl select-none hidden sm:inline">/</span>
              <h1 className="font-display font-semibold text-paper text-base hidden sm:inline">{title}</h1>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setChatOpen(o => !o)}
            title="Team chat"
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition ${
              chatOpen
                ? 'bg-accent-dim border-accent/40 text-accent'
                : 'bg-card-2 border-line text-paper-dim hover:text-paper hover:border-paper-dim'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </button>
          {actions}
          <div className="flex items-center gap-2 ml-1">
            <div className="w-9 h-9 rounded-full p-[2px]" style={{ background: 'conic-gradient(from 180deg,#ff8a3d,#ff4d8d,#6d8dff,#ff8a3d)' }}>
              <div className="w-full h-full rounded-full flex items-center justify-center text-ink text-xs font-bold font-display border-2 border-ink" style={{ background: 'linear-gradient(135deg,#ff8a3d,#ff4d8d)' }}>
                {user?.email?.[0]?.toUpperCase()}
              </div>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wide text-fog hidden md:inline">{role}</span>
          </div>
        </div>
      </header>
      <TeamChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  )
}
