import { RegistrationForm } from '../features/registration/RegistrationForm'

export function DeskPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Front Desk</h1>
      <p className="mt-1 text-sm text-gray-500">Register walk-in visitors and manage check-ins.</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Registration form */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Walk-In Registration
          </h2>
          <RegistrationForm />
        </div>

        {/* Right: Visitor table placeholder (to be built in a later step) */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Today's Visitors
          </h2>
          <div className="flex-1 flex items-center justify-center min-h-[300px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-400">
              Visitor table will be added here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
