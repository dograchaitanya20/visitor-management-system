import { describe, it, expect } from 'vitest'
import { transition, canTransition, IllegalTransitionError } from '../domain/stateMachine'
import { effectiveStatus, canPreApprove, preApprovalsUsed, validateWindow, checkPass, dayKey } from '../domain/rules'
import type { Status, Visit, VisitEvent } from '../domain/types'

const at = (h: number, m = 0, d = 23) => new Date(2026, 8, d, h, m)
const mk = (o: Partial<Visit> = {}): Visit => ({
  id: 'v1', visitorId: 'p1', hostId: 'h1', kind: 'INVITE', purpose: 'Meeting',
  type: 'Business Guests', office: 'Mumbai Goregaon',
  windowStart: at(10).toISOString(), windowEnd: at(12).toISOString(),
  status: 'PRE_APPROVED', createdAt: at(9).toISOString(), ...o,
})

const LEGAL: [Status, VisitEvent, Status][] = [
  ['PENDING', 'approve', 'APPROVED'], ['PENDING', 'reject', 'REJECTED'], ['PENDING', 'expire', 'EXPIRED'],
  ['APPROVED', 'checkIn', 'CHECKED_IN'], ['APPROVED', 'expire', 'EXPIRED'],
  ['PRE_APPROVED', 'checkIn', 'CHECKED_IN'], ['PRE_APPROVED', 'expire', 'EXPIRED'],
  ['CHECKED_IN', 'checkOut', 'CHECKED_OUT'],
]
const ILLEGAL: [Status, VisitEvent][] = [
  ['PENDING', 'checkOut'], ['PENDING', 'checkIn'], ['REJECTED', 'approve'],
  ['CHECKED_OUT', 'checkIn'], ['CHECKED_IN', 'approve'], ['EXPIRED', 'checkIn'],
]

describe('state machine', () => {
  it.each(LEGAL)('%s + %s -> %s', (from, ev, to) => expect(transition(from, ev)).toBe(to))
  it.each(ILLEGAL)('%s cannot %s', (from, ev) => {
    expect(() => transition(from, ev)).toThrow(IllegalTransitionError)
    expect(canTransition(from, ev)).toBe(false)
  })
})

describe('effectiveStatus', () => {
  it('keeps stored status inside the window', () => expect(effectiveStatus(mk(), at(11))).toBe('PRE_APPROVED'))
  it('is not expired exactly at window end', () => expect(effectiveStatus(mk(), at(12))).toBe('PRE_APPROVED'))
  it('expires unused passes after the window', () => expect(effectiveStatus(mk(), at(12, 1))).toBe('EXPIRED'))
  it('flags overstay for checked-in visitors', () =>
    expect(effectiveStatus(mk({ status: 'CHECKED_IN' }), at(12, 1))).toBe('OVERSTAY'))
  it('leaves checked-out visits alone', () =>
    expect(effectiveStatus(mk({ status: 'CHECKED_OUT' }), at(15))).toBe('CHECKED_OUT'))
})

describe('pre-approval limit', () => {
  it('counts only this host, invites, and this day', () => {
    const visits = [
      mk({ id: 'a' }), mk({ id: 'b' }), mk({ id: 'c', hostId: 'h2' }),
      mk({ id: 'd', kind: 'WALK_IN' }), mk({ id: 'e', windowStart: at(10, 0, 24).toISOString() }),
    ]
    expect(preApprovalsUsed(visits, 'h1', dayKey(at(10)))).toBe(2)
  })
  it('allows up to the limit and blocks beyond it', () => {
    expect(canPreApprove(4, 1, 5)).toBe(true)
    expect(canPreApprove(0, 5, 5)).toBe(true)
    expect(canPreApprove(5, 1, 5)).toBe(false)
    expect(canPreApprove(4, 2, 5)).toBe(false)
  })
})

describe('validateWindow', () => {
  const now = at(9)
  it('rejects end before start', () => expect(validateWindow(at(10), at(9, 30), now)).toMatch(/after start/))
  it('rejects windows that already ended', () => expect(validateWindow(at(7), at(8), now)).toMatch(/future/))
  it('accepts a valid window', () => expect(validateWindow(at(10), at(12), now)).toBeNull())
})

describe('checkPass', () => {
  it('accepts inside the window', () => expect(checkPass(mk(), at(10, 30))).toEqual({ ok: true }))
  it('accepts exactly 15 min early, rejects earlier', () => {
    expect(checkPass(mk(), at(9, 45))).toEqual({ ok: true })
    expect(checkPass(mk(), at(9, 44))).toMatchObject({ ok: false, reason: expect.stringMatching(/early/) })
  })
  it('rejects expired passes', () =>
    expect(checkPass(mk(), at(12, 1))).toMatchObject({ ok: false, reason: expect.stringMatching(/expired/) }))
  it('rejects a pass that was already used', () =>
    expect(checkPass(mk({ status: 'CHECKED_IN' }), at(10, 30))).toMatchObject({ ok: false }))
})