import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ToastContainer from '@/components/ui/ToastNotification'
import ScanlineOverlay from '@/components/ui/ScanlineOverlay'
import ArabesqueDefs from '@/components/ui/ArabesqueDefs'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useRealtime } from '@/hooks/useRealtime'

export default function AppShell() {
  const location = useLocation()
  const token = useAuthStore(s => s.token)

  useRealtime()

  useEffect(() => {
    if (!token) return
    const id = setInterval(() => { api.get('/auth/me').catch(() => {}) }, 10_000)
    return () => clearInterval(id)
  }, [token])

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <ArabesqueDefs />
      <ScanlineOverlay />
      <div className="top-line" />
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
