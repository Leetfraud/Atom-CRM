import { useAuth } from '../../context/AuthContext'

export default function Topbar({ title, actions }) {
  const { user, role } = useAuth()

  return (
    <header className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-6 fixed top-0 left-56 right-0 z-10">
      <h1 className="text-white font-semibold text-sm">{title}</h1>
      <div className="flex items-center gap-4">
        {actions}
        <div className="flex items-center gap-2 ml-2">
          <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 text-xs font-bold">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <span className="text-zinc-500 text-xs capitalize">{role}</span>
        </div>
      </div>
    </header>
  )
}