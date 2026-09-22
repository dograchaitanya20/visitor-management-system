import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Employee } from '../domain/types'
import { listEmployees } from '../api/repo'
import { useSessionStore } from '../store/session'
import { ApprovalInbox } from '../features/approvals/ApprovalInbox'
import { NotificationFeed } from '../features/approvals/NotificationFeed'

export function HostPage() {
  const employeeId = useSessionStore((s) => s.employeeId)
  const setEmployee = useSessionStore((s) => s.setEmployee)
  const navigate = useNavigate()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmps, setLoadingEmps] = useState(true)

  // Load employee list once for the picker
  useEffect(() => {
    listEmployees().then((emps) => {
      setEmployees(emps)
      // Auto-select first employee if none selected yet
      if (!employeeId && emps.length > 0) {
        setEmployee(emps[0].id)
      }
      setLoadingEmps(false)
    })
  }, [employeeId, setEmployee])

  const selectedEmp = employees.find((e) => e.id === employeeId)

  return (
    <div className="p-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Host Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Approve or reject walk-in visitors assigned to you.</p>
        </div>
        <button
          onClick={() => navigate('/invite')}
          className="self-start px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Invite Visitors
        </button>
      </div>

      {/* Employee picker */}
      <div className="mb-6 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Acting as
        </label>
        {loadingEmps ? (
          <div className="w-48 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ) : (
          <select
            value={employeeId ?? ''}
            onChange={(e) => setEmployee(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} — {emp.dept}
              </option>
            ))}
          </select>
        )}
        {selectedEmp && (
          <p className="text-xs text-gray-400 mt-1">
            {selectedEmp.email} · {selectedEmp.phone}
          </p>
        )}
      </div>

      {/* Main content: Inbox + Notifications */}
      {!employeeId ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Select an employee above to view pending approvals.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inbox: main area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Pending Approvals
              </h2>
              <ApprovalInbox hostId={employeeId} />
            </div>
          </div>

          {/* Notifications sidebar */}
          <div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Notifications
              </h2>
              <NotificationFeed hostEmail={selectedEmp?.email} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
