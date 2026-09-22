import { useState } from 'react'
import { RegistrationForm } from '../features/registration/RegistrationForm'
import { VisitorTable } from '../features/frontdesk/VisitorTable'
import { PassScanBox } from '../features/frontdesk/PassScanBox'
import { GuestDetailsDrawer } from '../features/frontdesk/GuestDetailsDrawer'
import type { Visit } from '../domain/types'
import { useVisitsStore } from '../store/visits'

export function DeskPage() {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const fetchVisits = useVisitsStore((s) => s.fetchVisits)

  const handleOpenDrawer = (v: Visit) => {
    setSelectedVisit(v)
    setDrawerOpen(true)
  }

  const handleVisitUpdated = (updated: Visit) => {
    setSelectedVisit(updated)
    void fetchVisits()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Front Desk</h1>
        <p className="mt-1 text-sm text-gray-500">
          Register walk-in visitors, scan pass codes, and manage real-time check-ins.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Walk-In Registration form (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Walk-In Registration
          </h2>
          <RegistrationForm />
        </div>

        {/* Right Column: Pass Scan Box + Visitor Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <PassScanBox onCheckInSuccess={handleOpenDrawer} />
          <VisitorTable onSelectVisit={handleOpenDrawer} />
        </div>
      </div>

      {/* Shared Guest Details Drawer */}
      <GuestDetailsDrawer
        visit={selectedVisit}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onVisitUpdated={handleVisitUpdated}
      />
    </div>
  )
}
