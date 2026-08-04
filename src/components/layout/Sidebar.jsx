import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSidebar } from '../../context/SidebarContext'

const icons = {
  prospects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  ),
  dailyLog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  import: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  collapseLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
  collapseRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
}

const navItems = [
  { label: 'Prospects', path: '/sales', icon: icons.prospects, roles: ['sales', 'exec'] },
  { label: 'Analytics', path: '/analytics', icon: icons.analytics, roles: ['exec'] },
  { label: 'Daily Log', path: '/daily-log', icon: icons.dailyLog, roles: ['exec'] },
  { label: 'Import', path: '/import', icon: icons.import, roles: ['exec'] },
]

export default function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar()
  const { role, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-56'} shrink-0 sticky top-5 self-start bg-card border border-line rounded-[26px] flex flex-col gap-1 px-3 py-5 transition-all duration-300`}
      style={{ minHeight: 'calc(100vh - 40px)' }}
    >
      {/* Collapse button */}
      <div className="flex items-center justify-end px-1 mb-6">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-fog hover:text-paper transition p-1.5 rounded-full hover:bg-card-2"
        >
          <span className="w-4 h-4 block">{collapsed ? icons.collapseRight : icons.collapseLeft}</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems
          .filter(item => role === 'admin' || item.roles.includes(role))
          .map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-2xl font-display text-[13px] font-semibold uppercase tracking-wide transition ${
                  isActive ? 'text-accent bg-card-2' : 'text-paper-dim hover:text-paper hover:bg-card-2'
                }`
              }
            >
              <span className="w-[18px] h-[18px] shrink-0">{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
      </nav>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        title={collapsed ? 'Sign out' : undefined}
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl font-display text-[12.5px] font-semibold uppercase tracking-wide text-fog hover:text-paper hover:bg-card-2 transition mt-2"
      >
        <span className="w-[18px] h-[18px] shrink-0">{icons.logout}</span>
        {!collapsed && 'Sign out'}
      </button>
    </aside>
  )
}
