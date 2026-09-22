import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useSessionStore, type Role } from './store/session'
import { useNotificationsStore } from './store/notifications'
import { Toaster } from './components/ui/Toaster'
import { DeskPage } from './pages/DeskPage'
import { HostPage } from './pages/HostPage'
import { InvitePage } from './pages/InvitePage'
import { AdminPage } from './pages/AdminPage'
import { useEffect, useState } from 'react'
import { Drawer } from './components/ui/Drawer'
import { NotificationFeed } from './features/approvals/NotificationFeed'

const ROLES: { key: Role; label: string; path: string }[] = [
  { key: 'FRONT_DESK', label: 'Front Desk', path: '/desk' },
  { key: 'HOST', label: 'Host', path: '/host' },
  { key: 'ADMIN', label: 'Admin', path: '/admin' },
]

function Header() {
  const role = useSessionStore((s) => s.role)
  const setRole = useSessionStore((s) => s.setRole)
  const navigate = useNavigate()
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const refresh = useNotificationsStore((s) => s.refresh)
  const [bellOpen, setBellOpen] = useState(false)

  // Refresh notifications periodically
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  const switchRole = (r: typeof ROLES[number]) => {
    setRole(r.key)
    navigate(r.path)
  }

  return (
    <>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* App title */}
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
              🏢 VMS
            </h1>

            {/* Right side: role switcher + bell */}
            <div className="flex items-center gap-3">
              {/* Role switcher */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => switchRole(r)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      role === r.key
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Notification bell */}
              <button
                type="button"
                onClick={() => {
                  refresh()
                  setBellOpen(true)
                }}
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Drawer */}
      <Drawer open={bellOpen} onClose={() => setBellOpen(false)} title="Notifications">
        <NotificationFeed />
      </Drawer>
    </>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="max-w-7xl mx-auto">
        <Routes>
          <Route path="/desk" element={<DeskPage />} />
          <Route path="/host" element={<HostPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/desk" replace />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
