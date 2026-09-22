import { useState, useEffect, useCallback } from 'react'
import type { Visit, Visitor, Employee, AuditEvent } from '../../domain/types'
import { effectiveStatus, checkPass } from '../../domain/rules'
import * as repo from '../../api/repo'
import { Drawer } from '../../components/ui/Drawer'
import { Badge } from '../../components/ui/Badge'
import { useVisitsStore } from '../../store/visits'
import { addToast } from '../../store/toast'

interface GuestDetailsDrawerProps {
  visit: Visit | null
  open: boolean
  onClose: () => void
  onVisitUpdated?: (updated: Visit) => void
}

export function GuestDetailsDrawer({
  visit,
  open,
  onClose,
  onVisitUpdated,
}: GuestDetailsDrawerProps) {
  const [currentVisit, setCurrentVisit] = useState<Visit | null>(visit)
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [host, setHost] = useState<Employee | null>(null)
  const [audits, setAudits] = useState<AuditEvent[]>([])
  const [actionBusy, setActionBusy] = useState(false)
  const applyEvent = useVisitsStore((s) => s.applyEvent)

  const loadDetails = useCallback(async (v: Visit) => {
    try {
      const [vtr, emps, auditList, freshVisit] = await Promise.all([
        repo.getVisitor(v.visitorId).catch(() => null),
        repo.listEmployees().catch(() => []),
        repo.listAudit(v.id).catch(() => []),
        repo.getVisit(v.id).catch(() => v),
      ])
      setVisitor(vtr)
      setHost(emps.find((e) => e.id === v.hostId) ?? null)
      setAudits(auditList)
      setCurrentVisit(freshVisit)
    } catch {
      // safe fallback
    }
  }, [])

  useEffect(() => {
    if (!visit || !open) return
    let active = true
    Promise.all([
      repo.getVisitor(visit.visitorId).catch(() => null),
      repo.listEmployees().catch(() => []),
      repo.listAudit(visit.id).catch(() => []),
      repo.getVisit(visit.id).catch(() => visit),
    ]).then(([vtr, emps, auditList, freshVisit]) => {
      if (active) {
        setVisitor(vtr)
        setHost(emps.find((e) => e.id === visit.hostId) ?? null)
        setAudits(auditList)
        setCurrentVisit(freshVisit)
      }
    })
    return () => {
      active = false
    }
  }, [visit, open])

  const activeVisit = currentVisit && visit && currentVisit.id === visit.id ? currentVisit : visit
  if (!activeVisit) return null

  const now = new Date()
  const currentEffective = effectiveStatus(activeVisit, now)
  const passCheckResult = checkPass(activeVisit, now)

  const handleCheckIn = async () => {
    if (!activeVisit) return
    setActionBusy(true)
    try {
      if (activeVisit.passCode) {
        const updated = await repo.checkInByPass(activeVisit.passCode, 'front-desk')
        addToast(`Checked in ${visitor?.name || 'visitor'} successfully`, 'success')
        setCurrentVisit(updated)
        onVisitUpdated?.(updated)
        await loadDetails(updated)
        await useVisitsStore.getState().fetchVisits()
      } else {
        await applyEvent(activeVisit.id, 'checkIn', 'front-desk')
        const updated = await repo.getVisit(activeVisit.id)
        setCurrentVisit(updated)
        onVisitUpdated?.(updated)
        await loadDetails(updated)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Check-in failed'
      addToast(msg, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const handleCheckOut = async () => {
    if (!activeVisit) return
    setActionBusy(true)
    try {
      await applyEvent(activeVisit.id, 'checkOut', 'front-desk')
      const updated = await repo.getVisit(activeVisit.id)
      setCurrentVisit(updated)
      onVisitUpdated?.(updated)
      await loadDetails(updated)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Check-out failed'
      addToast(msg, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Visitor Pass Details">
      <div className="space-y-6 pb-4">
        {/* Visitor Card Header */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 rounded-xl bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center border border-gray-300 dark:border-gray-600">
            {visitor?.photo ? (
              <img src={visitor.photo} alt={visitor.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-gray-400">
                {visitor?.name?.charAt(0) ?? '?'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                {visitor?.name ?? 'Visitor'}
              </h3>
              <Badge status={currentEffective} />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {visitor?.company ? `${visitor.company} · ` : ''}
              {visitor?.phone}
            </p>

            {visitor?.email && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{visitor.email}</p>
            )}

            {activeVisit.passCode && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded font-mono text-xs font-semibold">
                <span>Pass:</span>
                <span>{activeVisit.passCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Section */}
        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Front Desk Actions
          </h4>

          {/* Check-In allowed */}
          {(currentEffective === 'APPROVED' || currentEffective === 'PRE_APPROVED') && (
            <div>
              {passCheckResult.ok ? (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={actionBusy}
                  className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionBusy ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    '✓ Check In Visitor'
                  )}
                </button>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Cannot check in right now: </span>
                  {passCheckResult.reason}
                </div>
              )}
            </div>
          )}

          {/* Check-Out allowed */}
          {(currentEffective === 'CHECKED_IN' || currentEffective === 'OVERSTAY') && (
            <button
              type="button"
              onClick={handleCheckOut}
              disabled={actionBusy}
              className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionBusy ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                '← Check Out Visitor'
              )}
            </button>
          )}

          {/* Non-actionable status messages */}
          {currentEffective === 'PENDING' && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">
              ⏳ <strong>Awaiting host approval.</strong> The host has been notified to approve or reject this walk-in.
            </div>
          )}

          {currentEffective === 'REJECTED' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-700 dark:text-red-300">
              🚫 <strong>Visit Rejected.</strong> The host declined this visit. Entry is not permitted.
            </div>
          )}

          {currentEffective === 'EXPIRED' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-700 dark:text-red-300">
              ⌛ <strong>Visit Expired.</strong> The scheduled visit window has ended.
            </div>
          )}

          {currentEffective === 'CHECKED_OUT' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400">
              ✓ <strong>Visit Completed.</strong> The visitor has already checked out.
            </div>
          )}
        </div>

        {/* Visit Information Grid */}
        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Visit Information
          </h4>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <dt className="text-gray-400">Host</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                {host ? `${host.name} (${host.dept})` : activeVisit.hostId}
              </dd>
            </div>

            <div>
              <dt className="text-gray-400">Entry Type</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                  activeVisit.kind === 'WALK_IN'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                }`}>
                  {activeVisit.kind === 'WALK_IN' ? 'Walk-In' : 'Pre-Approved Invite'}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-gray-400">Visit Category</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                {activeVisit.type}
              </dd>
            </div>

            <div>
              <dt className="text-gray-400">Office Location</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                {activeVisit.office}
              </dd>
            </div>

            <div className="col-span-2">
              <dt className="text-gray-400">Purpose</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                {activeVisit.purpose}
              </dd>
            </div>

            {activeVisit.title && (
              <div className="col-span-2">
                <dt className="text-gray-400">Event Title</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                  {activeVisit.title}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-gray-400">Window Start</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                {new Date(activeVisit.windowStart).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>

            <div>
              <dt className="text-gray-400">Window End</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                {new Date(activeVisit.windowEnd).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>

            {activeVisit.note && (
              <div className="col-span-2">
                <dt className="text-gray-400">Host Note</dt>
                <dd className="font-normal text-gray-700 dark:text-gray-300 mt-0.5 italic">
                  "{activeVisit.note}"
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Audit Trail Timeline */}
        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Activity Timeline
          </h4>

          {audits.length === 0 ? (
            <p className="text-xs text-gray-400">No activity recorded yet</p>
          ) : (
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-4">
              {audits.map((event) => (
                <li key={event.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white dark:border-gray-900" />
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                      {event.event}
                    </p>
                    <time className="text-[11px] text-gray-400">
                      {new Date(event.at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </time>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    by <span className="font-medium">{event.by}</span> ·{' '}
                    {new Date(event.at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Drawer>
  )
}
