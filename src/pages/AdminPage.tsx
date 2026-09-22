import { SettingsForm } from '../features/admin/SettingsForm'
import { DemoDataPanel } from '../features/admin/DemoDataPanel'
import { AuditLogTable } from '../features/admin/AuditLogTable'

export function AdminPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure system settings, inspect audit event trails, and benchmark dataset loads.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings & Demo Data Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <SettingsForm />
          <DemoDataPanel />
        </div>

        {/* Right Column: System Audit Log Table (7 cols) */}
        <div className="lg:col-span-7">
          <AuditLogTable />
        </div>
      </div>
    </div>
  )
}
