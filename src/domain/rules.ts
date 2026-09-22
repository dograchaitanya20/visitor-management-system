import { format } from 'date-fns'
import type { EffectiveStatus, Visit } from './types'

const MS_MIN = 60_000
export const EARLY_GRACE_MIN = 15 // pass works up to 15 min before the window opens

export const dayKey = (d: Date | string) => format(new Date(d), 'yyyy-MM-dd')

/** Derived status, computed lazily at read time: no background job, correct after refresh. O(1). */
export function effectiveStatus(v: Visit, now: Date): EffectiveStatus {
  if (now.getTime() <= new Date(v.windowEnd).getTime()) return v.status
  if (v.status === 'CHECKED_IN') return 'OVERSTAY'
  if (v.status === 'PENDING' || v.status === 'APPROVED' || v.status === 'PRE_APPROVED') return 'EXPIRED'
  return v.status
}

/** Reference O(n) count of invites for a host on a day. The repo will keep an O(1) counter feeding canPreApprove. */
export const preApprovalsUsed = (visits: Visit[], hostId: string, day: string) =>
  visits.filter((v) => v.kind === 'INVITE' && v.hostId === hostId && dayKey(v.windowStart) === day).length

export const canPreApprove = (used: number, adding: number, limit: number) => used + adding <= limit

/** Returns an error message, or null if the window is valid. */
export function validateWindow(start: Date, end: Date, now: Date): string | null {
  if (end <= start) return 'End time must be after start time'
  if (end <= now) return 'Visit window must end in the future'
  return null
}

export type PassCheck = { ok: true } | { ok: false; reason: string }

/** Can this pass be used to check in right now? */
export function checkPass(v: Visit, now: Date): PassCheck {
  const s = effectiveStatus(v, now)
  if (s === 'EXPIRED') return { ok: false, reason: 'This pass has expired' }
  if (s !== 'PRE_APPROVED' && s !== 'APPROVED') return { ok: false, reason: `Pass cannot be used (visit is ${s})` }
  if (now.getTime() < new Date(v.windowStart).getTime() - EARLY_GRACE_MIN * MS_MIN)
    return { ok: false, reason: 'Too early: the visit window has not started' }
  return { ok: true }
}