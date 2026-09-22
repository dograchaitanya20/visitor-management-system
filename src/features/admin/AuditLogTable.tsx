import { useState, useEffect, useMemo, useCallback } from 'react'
import type { AuditEvent } from '../../domain/types'
import { listAudit } from '../../api/repo'

const PAGE_SIZE = 50

const EVENT_COLORS: Record<string, string> = {
  create: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
  approve: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
  reject: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
  checkIn: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300',
  checkOut: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  expire: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
}

export function AuditLogTable() {
  const [audits, setAudits] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const loadAudits = useCallback(async () => {
    setLoading(true)
    try {
      const items = await listAudit()
      setAudits([...items].reverse())
    } catch {
      // safe fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    listAudit()
      .then((items) => {
        if (active) {
          setAudits([...items].reverse())
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return audits
    return audits.filter(
      (a) =>
        a.visitId.toLowerCase().includes(term) ||
        a.by.toLowerCase().includes(term) ||
        a.event.toLowerCase().includes(term),
    )
  }, [audits, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            System Audit Log
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Immutable log of all visit state transitions and front desk actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by visit ID, actor, event..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={loadAudits}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
          <div className="col-span-3">Timestamp</div>
          <div className="col-span-2">Event</div>
          <div className="col-span-4">Visit ID</div>
          <div className="col-span-3 text-right">Performed By</div>
        </div>

        {loading ? (
          <div className="p-8 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            {search ? 'No audit events match your search query.' : 'No audit events recorded yet.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[480px] overflow-y-auto">
            {paginated.map((a) => {
              const badgeClass =
                EVENT_COLORS[a.event] ||
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-xs hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="col-span-3 text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                    {new Date(a.at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>

                  <div className="col-span-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                    >
                      {a.event}
                    </span>
                  </div>

                  <div className="col-span-4 font-mono text-[11px] text-gray-700 dark:text-gray-300 truncate">
                    {a.visitId}
                  </div>

                  <div className="col-span-3 text-right font-medium text-gray-800 dark:text-gray-200 truncate">
                    {a.by}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1} -{' '}
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
