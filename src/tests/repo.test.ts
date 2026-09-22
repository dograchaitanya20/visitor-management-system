import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetRepo,
  setSimulatedDelay,
  setClock,
  setDebounceMs,
  createWalkIn,
  createInvites,
  applyEvent,
  checkInByPass,
  getVisit,
  getVisitor,
  listVisits,
  listEmployees,
  searchEmployees,
  listAudit,
  getSettings,
  saveSettings,
  seedLargeData,
  _getIndexes,
} from '../api/repo'
import { AppError } from '../api/errors'
import { listNotifications, clearNotifications } from '../api/notifier'
import { preApprovalsUsed, dayKey } from '../domain/rules'

const at = (h: number, m = 0, d = 23) => new Date(2026, 8, d, h, m)

describe('mock api repo layer', () => {
  beforeEach(() => {
    // Zero simulated delay and instant persistence for fast, deterministic unit tests
    setSimulatedDelay(0)
    setDebounceMs(0)
    setClock(() => at(10, 0))
    clearNotifications()
    resetRepo()
  })

  describe('1. Full Lifecycle Walk-in', () => {
    it('walk-in -> approve -> check in -> check out', async () => {
      const fixedNow = at(10, 0)
      setClock(() => fixedNow)

      // 1. Create walk-in
      const walkIn = await createWalkIn({
        name: 'Aaditya Kapoor',
        phone: '+91 98200 99999',
        email: 'aaditya.kapoor@example.com',
        hostId: 'emp-01',
        purpose: 'Vendor Assessment',
        type: 'Vendor',
        office: 'Mumbai Goregaon',
        windowStart: at(10, 0).toISOString(),
        windowEnd: at(12, 0).toISOString(),
      })

      expect(walkIn.kind).toBe('WALK_IN')
      expect(walkIn.status).toBe('PENDING')
      expect(walkIn.passCode).toBeUndefined()

      // Host was notified
      const notifs = listNotifications()
      expect(notifs.some((n) => n.to === 'aarav.sharma@acme.corp' || n.to === 'emp-01')).toBe(true)

      // 2. Approve: generates passCode and indexes it immediately
      const approved = await applyEvent(walkIn.id, 'approve', 'emp-01')
      expect(approved.status).toBe('APPROVED')
      expect(approved.passCode).toBeDefined()
      const code = approved.passCode!

      // Verify passCodeMap was updated immediately in applyEvent
      const { passCodeMap } = _getIndexes()
      expect(passCodeMap.get(code)).toBe(walkIn.id)

      // 3. Check in via pass code (O(1) lookup)
      const checkedIn = await checkInByPass(code, 'guard-gate-1')
      expect(checkedIn.status).toBe('CHECKED_IN')
      expect(checkedIn.checkIn).toBe(fixedNow.toISOString())

      // 4. Check out
      const later = at(11, 30)
      setClock(() => later)
      const checkedOut = await applyEvent(walkIn.id, 'checkOut', 'guard-gate-1')
      expect(checkedOut.status).toBe('CHECKED_OUT')
      expect(checkedOut.checkOut).toBe(later.toISOString())

      // Audit trail contains all steps
      const audit = await listAudit(walkIn.id)
      const events = audit.map((a) => a.event)
      expect(events).toEqual(['create', 'approve', 'checkIn', 'checkOut'])
    })
  })

  describe('2. Illegal Transitions', () => {
    it('throws ILLEGAL_TRANSITION when attempting invalid lifecycle moves', async () => {
      const walkIn = await createWalkIn({
        name: 'Test Visitor',
        phone: '+91 98200 00000',
        hostId: 'emp-01',
        purpose: 'Interview',
        type: 'Interview',
        office: 'Mumbai Goregaon',
        windowStart: at(10, 0).toISOString(),
        windowEnd: at(12, 0).toISOString(),
      })

      // PENDING cannot checkIn
      await expect(applyEvent(walkIn.id, 'checkIn', 'guard')).rejects.toThrow(AppError)
      await expect(applyEvent(walkIn.id, 'checkIn', 'guard')).rejects.toMatchObject({
        code: 'ILLEGAL_TRANSITION',
      })

      // PENDING cannot checkOut
      await expect(applyEvent(walkIn.id, 'checkOut', 'guard')).rejects.toMatchObject({
        code: 'ILLEGAL_TRANSITION',
      })

      // Approve it
      await applyEvent(walkIn.id, 'approve', 'emp-01')

      // APPROVED cannot approve again
      await expect(applyEvent(walkIn.id, 'approve', 'emp-01')).rejects.toMatchObject({
        code: 'ILLEGAL_TRANSITION',
      })
    })

    it('throws NOT_FOUND when visit does not exist', async () => {
      await expect(applyEvent('non-existent-id', 'approve', 'emp-01')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
      await expect(getVisit('non-existent-id')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })
  })

  describe('3. Pre-Approval Limit & All-or-Nothing', () => {
    it('the 6th invite for the same host and day throws LIMIT_EXCEEDED and creates nothing', async () => {
      setClock(() => at(9, 0, 24))
      const windowStart = at(10, 0, 24).toISOString()
      const windowEnd = at(12, 0, 24).toISOString()

      // Create 5 invites (reaching default limit of 5)
      const firstBatch = await createInvites({
        hostId: 'emp-03',
        title: 'Project Kickoff',
        type: 'Business Guests',
        office: 'Bengaluru Whitefield',
        windowStart,
        windowEnd,
        guests: [
          { name: 'Guest 1', phone: '+91 90000 00001' },
          { name: 'Guest 2', phone: '+91 90000 00002' },
          { name: 'Guest 3', phone: '+91 90000 00003' },
          { name: 'Guest 4', phone: '+91 90000 00004' },
          { name: 'Guest 5', phone: '+91 90000 00005' },
        ],
      })
      expect(firstBatch).toHaveLength(5)

      const visitsBefore = (await listVisits()).length
      const { preApprovalCounter } = _getIndexes()
      const counterKey = `emp-03|${dayKey(windowStart)}`
      expect(preApprovalCounter.get(counterKey)).toBe(5)

      // Attempt 6th invite: must fail and create NOTHING
      await expect(
        createInvites({
          hostId: 'emp-03',
          title: 'Extra Guest',
          type: 'Business Guests',
          office: 'Bengaluru Whitefield',
          windowStart,
          windowEnd,
          guests: [{ name: 'Guest 6', phone: '+91 90000 00006' }],
        }),
      ).rejects.toMatchObject({
        code: 'LIMIT_EXCEEDED',
      })

      // Verify all-or-nothing: no new visits were created, counter unchanged
      const visitsAfter = (await listVisits()).length
      expect(visitsAfter).toBe(visitsBefore)
      expect(preApprovalCounter.get(counterKey)).toBe(5)

      // A different host can still create invites for the same day
      const otherHostBatch = await createInvites({
        hostId: 'emp-04',
        type: 'Business Guests',
        office: 'Bengaluru Whitefield',
        windowStart,
        windowEnd,
        guests: [{ name: 'Guest A', phone: '+91 90000 00010' }],
      })
      expect(otherHostBatch).toHaveLength(1)
    })

    it('rejects invalid window before creating any records', async () => {
      setClock(() => at(10, 0))
      const visitsBefore = (await listVisits()).length

      // End before start
      await expect(
        createInvites({
          hostId: 'emp-01',
          type: 'Vendor',
          office: 'Mumbai Goregaon',
          windowStart: at(12, 0).toISOString(),
          windowEnd: at(11, 0).toISOString(),
          guests: [{ name: 'Invalid Guest', phone: '+91 99999 00000' }],
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_WINDOW',
      })

      // End in the past
      await expect(
        createInvites({
          hostId: 'emp-01',
          type: 'Vendor',
          office: 'Mumbai Goregaon',
          windowStart: at(7, 0).toISOString(),
          windowEnd: at(8, 0).toISOString(),
          guests: [{ name: 'Past Guest', phone: '+91 99999 00000' }],
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_WINDOW',
      })

      expect((await listVisits()).length).toBe(visitsBefore)
    })
  })

  describe('4. Pass Validation & Expiry', () => {
    it('rejects an expired pass code', async () => {
      setClock(() => at(10, 0))
      const [invite] = await createInvites({
        hostId: 'emp-05',
        type: 'Interview',
        office: 'Pune Hinjewadi',
        windowStart: at(10, 0).toISOString(),
        windowEnd: at(11, 0).toISOString(),
        guests: [{ name: 'Interviewee', phone: '+91 91111 22222' }],
      })

      const passCode = invite.passCode!

      // Fast forward past windowEnd (11:01)
      setClock(() => at(11, 1))

      await expect(checkInByPass(passCode, 'guard')).rejects.toMatchObject({
        code: 'PASS_INVALID',
        message: expect.stringMatching(/expired/i),
      })
    })

    it('rejects early arrival outside the 15-minute grace period', async () => {
      setClock(() => at(9, 0)) // 10:00 start, grace period starts at 09:45
      const [invite] = await createInvites({
        hostId: 'emp-05',
        type: 'Interview',
        office: 'Pune Hinjewadi',
        windowStart: at(10, 0).toISOString(),
        windowEnd: at(11, 0).toISOString(),
        guests: [{ name: 'Early Bird', phone: '+91 91111 33333' }],
      })

      await expect(checkInByPass(invite.passCode!, 'guard')).rejects.toMatchObject({
        code: 'PASS_INVALID',
        message: expect.stringMatching(/too early/i),
      })

      // Within 15-min grace window (09:46)
      setClock(() => at(9, 46))
      const checkedIn = await checkInByPass(invite.passCode!, 'guard')
      expect(checkedIn.status).toBe('CHECKED_IN')
    })

    it('rejects unknown pass code with PASS_INVALID', async () => {
      await expect(checkInByPass('INVALID123', 'guard')).rejects.toMatchObject({
        code: 'PASS_INVALID',
      })
    })
  })

  describe('5. Index Consistency', () => {
    it('keeps passCodeMap and preApprovalCounter in sync across all operations', async () => {
      const allVisits = await listVisits()
      const { visits, passCodeMap, preApprovalCounter } = _getIndexes()

      // 1. Check all loaded visits have consistent passCodeMap entries
      let visitsWithPass = 0
      for (const v of visits.values()) {
        if (v.passCode) {
          visitsWithPass++
          expect(passCodeMap.get(v.passCode)).toBe(v.id)
        }
      }
      expect(passCodeMap.size).toBe(visitsWithPass)

      // 2. Check preApprovalCounter against reference calculation
      for (const emp of await listEmployees()) {
        const todayStr = dayKey(at(10, 0))
        const expectedCount = preApprovalsUsed(allVisits, emp.id, todayStr)
        const cachedCount = preApprovalCounter.get(`${emp.id}|${todayStr}`) ?? 0
        expect(cachedCount).toBe(expectedCount)
      }

      // 3. Add walk-in and approve: verify passCodeMap index is immediately added
      const walkIn = await createWalkIn({
        name: 'Sync Visitor',
        phone: '+91 90000 90000',
        hostId: 'emp-01',
        purpose: 'Discussion',
        type: 'Business Guests',
        office: 'Delhi CyberCity',
        windowStart: at(10, 0).toISOString(),
        windowEnd: at(12, 0).toISOString(),
      })

      const approved = await applyEvent(walkIn.id, 'approve', 'emp-01')
      expect(passCodeMap.get(approved.passCode!)).toBe(walkIn.id)
      expect(passCodeMap.size).toBe(visitsWithPass + 1)
    })
  })

  describe('6. Persistence, Large Seed & Quota Handling', () => {
    it('throws STORAGE_FAILED once on QuotaExceededError and continues in-memory', async () => {
      let calls = 0
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        calls++
        const err = new DOMException('The quota has been exceeded', 'QuotaExceededError')
        throw err
      })

      // First mutating write throws STORAGE_FAILED
      await expect(
        createWalkIn({
          name: 'Quota Visitor',
          phone: '+91 98765 43210',
          hostId: 'emp-01',
          purpose: 'Meeting',
          type: 'Vendor',
          office: 'Mumbai Goregaon',
          windowStart: at(10, 0).toISOString(),
          windowEnd: at(12, 0).toISOString(),
        }),
      ).rejects.toMatchObject({
        code: 'STORAGE_FAILED',
      })

      // Second write keeps working in memory and does NOT throw again
      const second = await createWalkIn({
        name: 'Second Visitor',
        phone: '+91 98765 43211',
        hostId: 'emp-01',
        purpose: 'Meeting 2',
        type: 'Vendor',
        office: 'Mumbai Goregaon',
        windowStart: at(10, 0).toISOString(),
        windowEnd: at(12, 0).toISOString(),
      })
      expect(second.status).toBe('PENDING')
      expect(calls).toBeGreaterThanOrEqual(1)

      spy.mockRestore()
    })

    it('never persists seedLarge data to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      setItemSpy.mockClear()

      seedLargeData(500)
      const { visits } = _getIndexes()
      expect(visits.size).toBe(500)
      expect(setItemSpy).not.toHaveBeenCalled()
      setItemSpy.mockRestore()
    })
  })

  describe('7. Employees, Search, Settings & Notifier', () => {
    it('searches employees by name, department, email, phone', async () => {
      const engEmployees = await searchEmployees('Engineering')
      expect(engEmployees.length).toBe(6)

      const aarav = await searchEmployees('aarav')
      expect(aarav.length).toBe(1)
      expect(aarav[0].name).toBe('Aarav Sharma')

      const phoneSearch = await searchEmployees('11005')
      expect(phoneSearch.length).toBe(1)
      expect(phoneSearch[0].id).toBe('emp-05')
    })

    it('gets and updates settings', async () => {
      const settings = await getSettings()
      expect(settings.maxPreApprovalsPerDay).toBe(5)

      const updated = await saveSettings({ maxPreApprovalsPerDay: 10 })
      expect(updated.maxPreApprovalsPerDay).toBe(10)

      const fresh = await getSettings()
      expect(fresh.maxPreApprovalsPerDay).toBe(10)
    })

    it('tracks visitor lookups and rejection security alerts', async () => {
      const walkIn = await createWalkIn({
        name: 'Reject Me',
        phone: '+91 90000 88888',
        hostId: 'emp-02',
        purpose: 'Check',
        type: 'Others',
        office: 'Hyderabad Hitec',
        windowStart: at(10, 0).toISOString(),
        windowEnd: at(12, 0).toISOString(),
      })

      // Visitor lookup
      const visitor = await getVisitor(walkIn.visitorId)
      expect(visitor.name).toBe('Reject Me')

      // Reject triggers security notification
      const rejected = await applyEvent(walkIn.id, 'reject', 'emp-02')
      expect(rejected.status).toBe('REJECTED')

      const securityNotifs = listNotifications('security')
      expect(securityNotifs.length).toBeGreaterThanOrEqual(1)
      expect(securityNotifs[0].channel).toBe('push')
    })
  })
})
