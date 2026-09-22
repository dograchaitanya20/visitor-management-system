import { useState, useRef, useCallback, useEffect } from 'react'
import type { Employee } from '../../domain/types'
import { searchEmployees } from '../../api/repo'

interface HostSearchProps {
  value: string
  onChange: (employeeId: string) => void
  error?: string
}

/** Debounced employee search dropdown. Selecting an item sets the host field value. */
export function HostSearch({ value, onChange, error }: HostSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedName, setSelectedName] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Resolve initial value to a display name on mount / when value changes externally
  useEffect(() => {
    if (!value) return
    let active = true
    searchEmployees(value).then((emps) => {
      if (active) {
        const match = emps.find((e) => e.id === value)
        if (match) setSelectedName(`${match.name} — ${match.dept}`)
      }
    })
    return () => {
      active = false
    }
  }, [value])

  const doSearch = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.trim().length === 0) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const emps = await searchEmployees(q)
        setResults(emps)
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [])

  const handleInput = (q: string) => {
    setQuery(q)
    // If user edits after selection, clear the selection
    if (value) {
      onChange('')
      setSelectedName('')
    }
    doSearch(q)
  }

  const select = (emp: Employee) => {
    onChange(emp.id)
    setSelectedName(`${emp.name} — ${emp.dept}`)
    setQuery('')
    setOpen(false)
  }

  const clear = () => {
    onChange('')
    setSelectedName('')
    setQuery('')
    setResults([])
  }

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Host Employee <span className="text-red-500">*</span>
      </label>

      {value && selectedName ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
          <span className="flex-1 text-gray-900 dark:text-gray-100">{selectedName}</span>
          <button
            type="button"
            onClick={clear}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => { if (results.length > 0) setOpen(true) }}
            placeholder="Search by name, department..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && !selectedName && (
        <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">No matches found</li>
          ) : (
            results.map((emp) => (
              <li key={emp.id}>
                <button
                  type="button"
                  onClick={() => select(emp)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">{emp.name}</span>
                  <span className="ml-2 text-gray-400">{emp.dept}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
