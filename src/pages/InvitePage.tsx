import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/session'
import { listEmployees } from '../api/repo'
import type { Employee } from '../domain/types'
import { InviteForm } from '../features/invite/InviteForm'

export function InvitePage() {
  const navigate = useNavigate()
  const employeeId = useSessionStore((s) => s.employeeId)
  const setEmployee = useSessionStore((s) => s.setEmployee)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listEmployees().then((emps) => {
      setEmployees(emps)
      if (!employeeId && emps.length > 0) {
        setEmployee(emps[0].id)
      }
      setLoading(false)
    })
  }, [employeeId, setEmployee])

  const selectedEmp = employees.find((e) => e.id === employeeId)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with back link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate('/host')}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline mb-1 inline-flex items-center gap-1"
          >
            ← Back to Host Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Invite & Pre-Approve Visitors
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Issue digital pass codes to guests in advance for swift front desk check-in.
          </p>
        </div>

        {/* Host Identity Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg text-sm shrink-0">
          <span className="text-xs text-gray-400 font-medium">Host:</span>
          {loading ? (
            <span className="text-xs text-gray-400">Loading…</span>
          ) : (
            <select
              value={employeeId ?? ''}
              onChange={(e) => setEmployee(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none cursor-pointer"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.dept})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Invite Form */}
      {employeeId ? (
        <InviteForm
          hostId={employeeId}
          hostName={selectedEmp ? `${selectedEmp.name} (${selectedEmp.dept})` : undefined}
        />
      ) : (
        <div className="p-8 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-gray-500">Please select an employee host to create an invite.</p>
        </div>
      )}
    </div>
  )
}
