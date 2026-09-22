import type { Status, VisitEvent } from './types'

/** Single source of truth for legal visit lifecycle moves. */
const TABLE: Partial<Record<Status, Partial<Record<VisitEvent, Status>>>> = {
  PENDING: { approve: 'APPROVED', reject: 'REJECTED', expire: 'EXPIRED' },
  APPROVED: { checkIn: 'CHECKED_IN', expire: 'EXPIRED' },
  PRE_APPROVED: { checkIn: 'CHECKED_IN', expire: 'EXPIRED' },
  CHECKED_IN: { checkOut: 'CHECKED_OUT' },
}

export class IllegalTransitionError extends Error {
  constructor(status: Status, event: VisitEvent) {
    super(`Cannot ${event} a visit that is ${status}`)
    this.name = 'IllegalTransitionError'
  }
}

export const canTransition = (s: Status, e: VisitEvent) => Boolean(TABLE[s]?.[e])

export function transition(s: Status, e: VisitEvent): Status {
  const next = TABLE[s]?.[e]
  if (!next) throw new IllegalTransitionError(s, e)
  return next
}