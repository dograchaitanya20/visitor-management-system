import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Visit, Visitor } from '../../domain/types'
import * as repo from '../../api/repo'
import { useVisitsStore } from '../../store/visits'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'

interface ApprovalInboxProps {
  hostId: string
}

interface VisitWithVisitor extends Visit {
  visitor: Visitor | null
}

/** Lists PENDING walk-ins for this host with Approve/Reject actions. */
export function ApprovalInbox({ hostId }: ApprovalInboxProps) {
  const applyEvent = useVisitsStore((s) => s.applyEvent)
  const [visits, setVisits] = useState<VisitWithVisitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-visit action state: tracks which visit has an in-flight action
  const [busyId, setBusyId] = useState<string | null>(null)
  // QR pass display: visitId -> passCode
  const [approvedPass, setApprovedPass] = useState<Record<string, string>>({})
  // Reject confirm modal
  const [rejectTarget, setRejectTarget] = useState<VisitWithVisitor | null>(null)
  // Rejected banner
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await repo.listVisits({ hostId, status: 'PENDING' })
      // Enrich with visitor data for photo/name/company
      const enriched = await Promise.all(
        items.map(async (v): Promise<VisitWithVisitor> => {
          try {
            const visitor = await repo.getVisitor(v.visitorId)
            return { ...v, visitor }
          } catch {
            return { ...v, visitor: null }
          }
        }),
      )
      setVisits(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [hostId])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const items = await repo.listVisits({ hostId, status: 'PENDING' })
        const enriched = await Promise.all(
          items.map(async (v): Promise<VisitWithVisitor> => {
            try {
              const visitor = await repo.getVisitor(v.visitorId)
              return { ...v, visitor }
            } catch {
              return { ...v, visitor: null }
            }
          }),
        )
        if (active) {
          setVisits(enriched)
          setLoading(false)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load approvals')
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [hostId])

  const handleApprove = async (visit: VisitWithVisitor) => {
    setBusyId(visit.id)
    try {
      await applyEvent(visit.id, 'approve', hostId)
      // Fetch the updated visit to get the generated passCode
      const updated = await repo.getVisit(visit.id)
      if (updated.passCode) {
        setApprovedPass((prev) => ({ ...prev, [visit.id]: updated.passCode! }))
      }
      // Remove from pending list
      setVisits((prev) => prev.filter((v) => v.id !== visit.id))
    } catch {
      // applyEvent already toasts the error
    } finally {
      setBusyId(null)
    }
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    const id = rejectTarget.id
    setBusyId(id)
    setRejectTarget(null)
    try {
      await applyEvent(id, 'reject', hostId)
      setRejectedIds((prev) => new Set(prev).add(id))
      setVisits((prev) => prev.filter((v) => v.id !== id))
    } catch {
      // applyEvent already toasts the error
    } finally {
      setBusyId(null)
    }
  }

  // Render recently approved passes at the top
  const passEntries = Object.entries(approvedPass)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Loading approvals…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
        {error}
        <button onClick={fetchPending} className="ml-3 underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Rejected banner */}
      {rejectedIds.size > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2">
          <span className="text-red-600">🚫</span>
          <p className="text-sm text-red-700 dark:text-red-300">
            {rejectedIds.size} visitor{rejectedIds.size > 1 ? 's' : ''} rejected — security has been notified.
          </p>
          <button
            onClick={() => setRejectedIds(new Set())}
            className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none"
          >×</button>
        </div>
      )}

      {/* Recently approved passes */}
      {passEntries.map(([visitId, code]) => (
        <div key={visitId} className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-start gap-4">
            <QRCodeSVG value={code} size={80} />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">✓ Visitor approved</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-mono">{code}</p>
              <p className="text-xs text-green-500 mt-0.5">Show this QR code to the visitor for check-in</p>
            </div>
            <button
              onClick={() => setApprovedPass((prev) => {
                const next = { ...prev }
                delete next[visitId]
                return next
              })}
              className="ml-auto text-green-400 hover:text-green-600 text-lg leading-none"
            >×</button>
          </div>
        </div>
      ))}

      {/* Pending visits list */}
      {visits.length === 0 && passEntries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">No pending approvals</p>
          <p className="text-gray-300 text-xs mt-1">Walk-in visitors assigned to you will appear here</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {visits.map((visit) => {
            const isBusy = busyId === visit.id
            return (
              <li key={visit.id} className="bg-white dark:bg-gray-900 p-4 flex items-center gap-4">
                {/* Photo thumbnail */}
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                  {visit.visitor?.photo ? (
                    <img src={visit.visitor.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                      {visit.visitor?.name?.charAt(0) ?? '?'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {visit.visitor?.name ?? 'Unknown Visitor'}
                    </p>
                    <Badge status="PENDING" />
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {[visit.visitor?.company, visit.purpose].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Arrived {new Date(visit.createdAt).toLocaleTimeString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(visit)}
                    disabled={isBusy}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isBusy ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setRejectTarget(visit)}
                    disabled={isBusy}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Reject confirm modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject this visitor?"
        footer={
          <>
            <button
              onClick={() => setRejectTarget(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmReject}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reject & Notify Security
            </button>
          </>
        }
      >
        {rejectTarget && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>{rejectTarget.visitor?.name ?? 'This visitor'}</strong> will be rejected and security will be notified.
            This action cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  )
}
