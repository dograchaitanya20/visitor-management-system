import { useState } from 'react'
import type { GuestFormData } from './InviteSchema'

interface GuestPickerProps {
  guests: GuestFormData[]
  onChange: (guests: GuestFormData[]) => void
  error?: string
}

export function GuestPicker({ guests, onChange, error }: GuestPickerProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault()
    setInputError(null)

    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    const trimmedEmail = email.trim()
    const trimmedCompany = company.trim()

    if (!trimmedName) {
      setInputError('Guest name is required')
      return
    }

    if (!trimmedPhone) {
      setInputError('Guest phone number is required')
      return
    }

    if (!/^\+?[\d\s\-()]{7,18}$/.test(trimmedPhone)) {
      setInputError('Please enter a valid phone number')
      return
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setInputError('Please enter a valid email address')
      return
    }

    // Check duplicate phone/email in current list
    const isDuplicate = guests.some(
      (g) => g.phone === trimmedPhone || (trimmedEmail && g.email === trimmedEmail),
    )
    if (isDuplicate) {
      setInputError('A guest with this phone or email has already been added')
      return
    }

    const newGuest: GuestFormData = {
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      company: trimmedCompany,
    }

    onChange([...guests, newGuest])
    setName('')
    setPhone('')
    setEmail('')
    setCompany('')
  }

  const handleRemoveGuest = (index: number) => {
    const next = guests.filter((_, i) => i !== index)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {/* Add guest input sub-form */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Add Guest
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Guest Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98200 12345"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="priya@example.com"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company (optional)
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {inputError && <p className="mt-2 text-xs text-red-500">{inputError}</p>}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleAddGuest}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add to List
          </button>
        </div>
      </div>

      {/* Added Guests list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Added Guests ({guests.length}) <span className="text-red-500">*</span>
          </label>
          {guests.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {guests.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-400">No guests added yet</p>
            <p className="text-xs text-gray-400 mt-1">Use the form above to add guests to this invite</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
            {guests.map((guest, idx) => (
              <li
                key={`${guest.phone}-${idx}`}
                className="p-3 flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {guest.name}
                    </span>
                    {guest.company && (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded truncate">
                        {guest.company}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {guest.phone}
                    {guest.email ? ` · ${guest.email}` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveGuest(idx)}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none p-1 shrink-0"
                  aria-label={`Remove ${guest.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}
