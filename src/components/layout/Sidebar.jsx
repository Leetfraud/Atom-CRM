import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSidebar } from '../../context/SidebarContext'

const navItems = [
  { label: 'Prospects', path: '/sales',     icon: '👥', roles: ['sales', 'exec'] },
  { label: 'Analytics', path: '/analytics', icon: '📊', roles: ['exec'] },
  { label: 'Daily Log', path: '/daily-log', icon: '📋', roles: ['exec'] },
  { label: 'Import',    path: '/import',    icon: '📥', roles: ['exec'] },
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
    <aside className={`${collapsed ? 'w-14' : 'w-56'} min-h-screen bg-[#0d0d0d] border-r border-[#1f1f1f] flex flex-col px-3 py-6 fixed top-0 left-0 z-20 transition-all duration-300`}>
      
      {/* Logo + collapse button */}
      <div className="flex items-center justify-between px-1 mb-8">
        {!collapsed && (
          <div>
            <span className="text-orange-500 font-bold text-lg tracking-tight">EXODUS</span>
            <span className="text-zinc-600 text-xs block uppercase tracking-widest mt-0.5">CRM</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-zinc-500 hover:text-white transition p-1 rounded-lg hover:bg-[#1a1a1a] ml-auto"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems
          .filter(item => item.roles.includes(role))
          .map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
      </nav>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        title={collapsed ? 'Sign out' : undefined}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-[#1a1a1a] transition mt-4"
      >
        <span className="shrink-0">🚪</span>
        {!collapsed && 'Sign out'}
      </button>
    </aside>
  )
}