import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format } from 'date-fns'
import type { Visit, Visitor, Employee, EffectiveStatus } from '../../domain/types'
import { dayKey } from '../../domain/rules'
import * as repo from '../../api/repo'
import { useVisitsStore, selectVisitsWithEffectiveStatus } from '../../store/visits'
import { Badge } from '../../components/ui/Badge'
import { GuestDetailsDrawer } from './GuestDetailsDrawer'

const visitorCache = new Map<string, Visitor>()

interface VisitorTableProps {
  onSelectVisit?: (v: Visit) => void
}

export function VisitorTable({ onSelectVisit }: VisitorTableProps = {}) {
  const visits = useVisitsStore((s) => s.items)
  const loading = useVisitsStore((s) => s.loading)
  const fetchVisits = useVisitsStore((s) => s.fetchVisits)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  const [filterAllDates, setFilterAllDates] = useState(false)

  // Visitor & Employee lookups
  const [employeesMap, setEmployeesMap] = useState<Map<string, Employee>>(new Map())
  const [visitorsMap, setVisitorsMap] = useState<Map<string, Visitor>>(() => new Map(visitorCache))

  // Selected visit for drawer
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Load initial visits and employees
  useEffect(() => {
    void fetchVisits()
    repo.listEmployees().then((emps) => {
      const map = new Map<string, Employee>()
      emps.forEach((e) => map.set(e.id, e))
      setEmployeesMap(map)
    })
  }, [fetchVisits])

  // Cache/fetch visitors for current visits
  useEffect(() => {
    let active = true
    const unmapped = visits.filter((v) => !visitorsMap.has(v.visitorId))
    if (unmapped.length === 0) return

    const ready = new Map<string, Visitor>()
    const toFetch: Visit[] = []
    for (const v of unmapped) {
      if (visitorCache.has(v.visitorId)) {
        ready.set(v.visitorId, visitorCache.get(v.visitorId)!)
      } else {
        toFetch.push(v)
      }
    }

    if (ready.size > 0) {
      setVisitorsMap((prev) => {
        const next = new Map(prev)
        ready.forEach((vtr, id) => next.set(id, vtr))
        return next
      })
    }

    if (toFetch.length === 0) return

    Promise.all(
      toFetch.map(async (v) => {
        try {
          const vtr = await repo.getVisitor(v.visitorId)
          visitorCache.set(vtr.id, vtr)
          return vtr
        } catch {
          return null
        }
      }),
    ).then((vtrs) => {
      if (!active) return
      setVisitorsMap((prev) => {
        const next = new Map(prev)
        vtrs.forEach((vtr) => {
          if (vtr) next.set(vtr.id, vtr)
        })
        return next
      })
    })

    return () => {
      active = false
    }
  }, [visits, visitorsMap])

  // Derive effective status with current clock
  const visitsWithEffective = useMemo(() => {
    return selectVisitsWithEffectiveStatus(visits, new Date())
  }, [visits])

  // Filter visits
  const filteredVisits = useMemo(() => {
    const term = searchQuery.trim().toLowerCase()

    return visitsWithEffective.filter((v) => {
      // 1. Date filter
      if (!filterAllDates) {
        const vDay = dayKey(v.windowStart)
        if (vDay !== dateFilter) return false
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && v.effectiveStatus !== statusFilter) {
        return false
      }

      // 3. Search filter
      if (term) {
        const vtr = visitorsMap.get(v.visitorId)
        const host = employeesMap.get(v.hostId)
        const matchName = vtr?.name.toLowerCase().includes(term) ?? false
        const matchPhone = vtr?.phone.toLowerCase().includes(term) ?? false
        const matchEmail = vtr?.email?.toLowerCase().includes(term) ?? false
        const matchCompany = vtr?.company?.toLowerCase().includes(term) ?? false
        const matchHost = host?.name.toLowerCase().includes(term) ?? false
        const matchPass = v.passCode?.toLowerCase().includes(term) ?? false
        const matchPurpose = v.purpose.toLowerCase().includes(term)

        if (
          !matchName &&
          !matchPhone &&
          !matchEmail &&
          !matchCompany &&
          !matchHost &&
          !matchPass &&
          !matchPurpose
        ) {
          return false
        }
      }

      return true
    })
  }, [
    visitsWithEffective,
    searchQuery,
    statusFilter,
    dateFilter,
    filterAllDates,
    visitorsMap,
    employeesMap,
  ])

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: filteredVisits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
    initialRect: { width: 800, height: 600 },
  })

  const virtualItems =
    rowVirtualizer.getVirtualItems().length > 0
      ? rowVirtualizer.getVirtualItems()
      : filteredVisits.map((_, i) => ({
          index: i,
          key: filteredVisits[i].id,
          size: 56,
          start: i * 56,
        }))

  const handleRowClick = useCallback(
    (v: Visit) => {
      if (onSelectVisit) {
        onSelectVisit(v)
      } else {
        setSelectedVisit(v)
        setDrawerOpen(true)
      }
    },
    [onSelectVisit],
  )

  const handleVisitUpdated = useCallback(
    (updated: Visit) => {
      setSelectedVisit(updated)
      void fetchVisits()
    },
    [fetchVisits],
  )

  const ALL_STATUSES: EffectiveStatus[] = [
    'PENDING',
    'APPROVED',
    'PRE_APPROVED',
    'CHECKED_IN',
    'OVERSTAY',
    'CHECKED_OUT',
    'REJECTED',
    'EXPIRED',
  ]

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Status Filter, Date Range */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search visitor, phone, host, pass..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="sm:col-span-3">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker */}
          <div className="sm:col-span-4 flex items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              disabled={filterAllDates}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-40"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterAllDates}
                onChange={(e) => setFilterAllDates(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              All Days
            </label>
          </div>
        </div>

        {/* Status Count Summary Badge Row */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{filteredVisits.length}</strong>{' '}
            of {visits.length} visit(s)
          </span>
          {(searchQuery || statusFilter !== 'ALL' || filterAllDates) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('ALL')
                setFilterAllDates(false)
                setDateFilter(format(new Date(), 'yyyy-MM-dd'))
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Virtualized Table Container */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
          <div className="col-span-4">Visitor</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Host</div>
          <div className="col-span-2">Time Window</div>
          <div className="col-span-2 text-right pr-2">Status</div>
        </div>

        {/* Loading Skeleton */}
        {loading && visits.length === 0 ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredVisits.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No visitors match your filters
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your search query, status, or date range.
            </p>
          </div>
        ) : (
          /* Virtualized Body */
          <div
            ref={parentRef}
            className="overflow-y-auto max-h-[520px] divide-y divide-gray-100 dark:divide-gray-800"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems.map((virtualRow) => {
                const visit = filteredVisits[virtualRow.index]
                const visitor = visitorsMap.get(visit.visitorId)
                const host = employeesMap.get(visit.hostId)
                const startStr = new Date(visit.windowStart).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const endStr = new Date(visit.windowEnd).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div
                    key={visit.id}
                    onClick={() => handleRowClick(visit)}
                    className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-indigo-50/50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors items-center text-xs text-gray-700 dark:text-gray-300"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {/* Visitor Name & Contact */}
                    <div className="col-span-4 min-w-0 pr-2">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                        <span className="truncate">{visitor?.name || 'Visitor'}</span>
                        {visit.passCode && (
                          <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 px-1 rounded shrink-0">
                            {visit.passCode}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {visitor?.company ? `${visitor.company} · ` : ''}
                        {visitor?.phone || visit.visitorId}
                      </p>
                    </div>

                    {/* Entry Type / Kind */}
                    <div className="col-span-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          visit.kind === 'WALK_IN'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'
                        }`}
                      >
                        {visit.kind === 'WALK_IN' ? '🚶 Walk-In' : '✉️ Invite'}
                      </span>
                    </div>

                    {/* Host Name */}
                    <div className="col-span-2 min-w-0 pr-2">
                      <p className="font-medium truncate text-gray-800 dark:text-gray-200">
                        {host?.name || visit.hostId}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{host?.dept}</p>
                    </div>

                    {/* Time Window */}
                    <div className="col-span-2 text-gray-500 font-mono text-[11px]">
                      {startStr} - {endStr}
                    </div>

                    {/* Effective Status Badge */}
                    <div className="col-span-2 text-right pr-2">
                      <Badge status={visit.effectiveStatus} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Guest Details Drawer (if not controlled externally) */}
      {!onSelectVisit && (
        <GuestDetailsDrawer
          visit={selectedVisit}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onVisitUpdated={handleVisitUpdated}
        />
      )}
    </div>
  )
}
