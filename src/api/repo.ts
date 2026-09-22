import type {
  Employee,
  Visitor,
  Visit,
  AuditEvent,
  Settings,
  Status,
  VisitEvent,
} from '../domain/types'
import { transition, IllegalTransitionError } from '../domain/stateMachine'
import { validateWindow, canPreApprove, checkPass, dayKey } from '../domain/rules'
import { AppError } from './errors'
import { notify } from './notifier'
import { seedDefault, seedLarge, DEFAULT_SETTINGS, type SeedData } from './seed'

const STORAGE_KEY = 'vms_storage_v1'

// --- In-Memory Stores ---
const visits = new Map<string, Visit>()
const visitors = new Map<string, Visitor>()
const employees = new Map<string, Employee>()
let auditEvents: AuditEvent[] = []
let currentSettings: Settings = { ...DEFAULT_SETTINGS }

// --- In-Memory O(1) Secondary Indexes ---
// passCode -> visitId for fast lookup in checkInByPass
const passCodeMap = new Map<string, string>()
// `${hostId}|${day}` -> count of INVITE visits for O(1) pre-approval quota checks
const preApprovalCounter = new Map<string, number>()

// --- Configurable Controls ---
let simulatedDelayMs: number | null = 200 // default 150-300ms simulated
let clockFn: () => Date = () => new Date()
let debounceMs = 100
let isLargeData = false
let storageFailedReported = false
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let initialized = false

/** Sets simulated latency: pass 0 for synchronous/fast testing, null for random 150-300ms. */
export function setSimulatedDelay(ms: number | null): void {
  simulatedDelayMs = ms
}

/** Injects a custom clock for testing. */
export function setClock(fn: () => Date): void {
  clockFn = fn
}

/** Resets to system clock. */
export function resetClock(): void {
  clockFn = () => new Date()
}

/** Gets the current time using the active clock function. */
export function getNow(): Date {
  return clockFn()
}

/** Sets debounce interval for localStorage writes (set to 0 for instant synchronous saves in tests). */
export function setDebounceMs(ms: number): void {
  debounceMs = ms
}

/** Helper delay function simulating realistic API latency. */
async function delay(): Promise<void> {
  if (simulatedDelayMs === 0) return
  const ms = simulatedDelayMs ?? Math.floor(150 + Math.random() * 150)
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** Rebuilds secondary indexes across all current visits. */
function rebuildIndexes(): void {
  passCodeMap.clear()
  preApprovalCounter.clear()
  for (const v of visits.values()) {
    if (v.passCode) {
      passCodeMap.set(v.passCode, v.id)
    }
    if (v.kind === 'INVITE') {
      const key = `${v.hostId}|${dayKey(v.windowStart)}`
      preApprovalCounter.set(key, (preApprovalCounter.get(key) ?? 0) + 1)
    }
  }
}

/** Generates a collision-free 6-character alphanumeric pass code. */
function generateUniquePassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempts = 0; attempts < 10000; attempts++) {
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    if (!passCodeMap.has(code)) {
      return code
    }
  }
  throw new Error('Failed to generate unique pass code after multiple attempts')
}

/** Synchronous attempt to write to localStorage, tracking QuotaExceededError. */
function trySaveToStorage(): void {
  if (isLargeData) return
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    const payload = {
      visits: Array.from(visits.values()),
      visitors: Array.from(visitors.values()),
      employees: Array.from(employees.values()),
      auditEvents,
      settings: currentSettings,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (err: unknown) {
    const isQuota =
      (err instanceof DOMException &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err.code === 22 ||
          err.code === 1014)) ||
      (err as { name?: string })?.name === 'QuotaExceededError'

    if (isQuota) {
      if (!storageFailedReported) {
        storageFailedReported = true
        throw new AppError('STORAGE_FAILED', 'Storage quota exceeded; continuing in memory only')
      }
    } else {
      console.error('Failed to save to localStorage:', err)
    }
  }
}

/** Schedules or immediately triggers persistence. */
function persist(): void {
  if (isLargeData) return
  if (debounceMs === 0) {
    trySaveToStorage()
    return
  }
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveTimeout = null
    try {
      trySaveToStorage()
    } catch {
      // Background debounced failure already sets storageFailedReported
    }
  }, debounceMs)
}

/** Flushes any pending debounced writes immediately. */
export async function flushStorage(): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  trySaveToStorage()
}

/** Populates repo state with a given seed dataset. */
export function loadSeedData(seed: SeedData, isLarge = false): void {
  isLargeData = isLarge
  visits.clear()
  visitors.clear()
  employees.clear()
  auditEvents = []
  currentSettings = { ...seed.settings }

  for (const emp of seed.employees) employees.set(emp.id, emp)
  for (const vtr of seed.visitors) visitors.set(vtr.id, vtr)
  for (const vis of seed.visits) visits.set(vis.id, vis)

  rebuildIndexes()
  if (!isLarge) {
    persist()
  }
}

/** Seeds large number of visits fast in memory without saving to localStorage. */
export function seedLargeData(n: number): void {
  loadSeedData(seedLarge(n, getNow()), true)
}

/** Initializes the repository from storage or seed defaults. */
export function initRepo(forceReset = false): void {
  if (initialized && !forceReset) return

  storageFailedReported = false
  isLargeData = false

  if (typeof window !== 'undefined' && window.localStorage && !forceReset) {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        visits.clear()
        visitors.clear()
        employees.clear()
        auditEvents = parsed.auditEvents || []
        currentSettings = parsed.settings || { ...DEFAULT_SETTINGS }

        for (const e of parsed.employees || []) employees.set(e.id, e)
        for (const v of parsed.visitors || []) visitors.set(v.id, v)
        for (const vis of parsed.visits || []) visits.set(vis.id, vis)

        rebuildIndexes()
        initialized = true
        return
      } catch (err) {
        console.warn('Could not parse persisted data, re-seeding default:', err)
      }
    }
  }

  // Fallback to fresh seedDefault
  loadSeedData(seedDefault(getNow()), false)
  initialized = true
}

/** Resets repo completely for tests. */
export function resetRepo(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
  initialized = false
  storageFailedReported = false
  isLargeData = false
  initRepo(true)
}

function ensureInitialized(): void {
  if (!initialized) {
    initRepo()
  }
}

// --- Query Methods ---

export async function listVisits(filter?: {
  hostId?: string
  status?: Status
  visitorId?: string
  office?: string
}): Promise<Visit[]> {
  await delay()
  ensureInitialized()
  let result = Array.from(visits.values())

  if (filter) {
    if (filter.hostId) result = result.filter((v) => v.hostId === filter.hostId)
    if (filter.status) result = result.filter((v) => v.status === filter.status)
    if (filter.visitorId) result = result.filter((v) => v.visitorId === filter.visitorId)
    if (filter.office) result = result.filter((v) => v.office === filter.office)
  }

  // Return copies to prevent accidental external in-place mutation
  return result.map((v) => ({ ...v }))
}

export async function getVisit(id: string): Promise<Visit> {
  await delay()
  ensureInitialized()
  const v = visits.get(id)
  if (!v) throw new AppError('NOT_FOUND', `Visit '${id}' not found`)
  return { ...v }
}

export async function getVisitor(id: string): Promise<Visitor> {
  await delay()
  ensureInitialized()
  const v = visitors.get(id)
  if (!v) throw new AppError('NOT_FOUND', `Visitor '${id}' not found`)
  return { ...v }
}

export async function listEmployees(): Promise<Employee[]> {
  await delay()
  ensureInitialized()
  return Array.from(employees.values()).map((e) => ({ ...e }))
}

export async function searchEmployees(q: string): Promise<Employee[]> {
  await delay()
  ensureInitialized()
  const term = q.trim().toLowerCase()
  if (!term) return listEmployees()

  return Array.from(employees.values())
    .filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.dept.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        e.phone.toLowerCase().includes(term),
    )
    .map((e) => ({ ...e }))
}

// --- Mutation Inputs & Methods ---

export interface CreateWalkInInput {
  name: string
  phone: string
  email?: string
  company?: string
  photo?: string
  hostId: string
  purpose: string
  type: string
  office: string
  title?: string
  note?: string
  windowStart?: string
  windowEnd?: string
}

/** Creates a Visitor and a Walk-In Visit in PENDING status, notifying the host. */
export async function createWalkIn(input: CreateWalkInInput): Promise<Visit> {
  await delay()
  ensureInitialized()

  const now = getNow()
  const start = input.windowStart ? new Date(input.windowStart) : now
  const end = input.windowEnd ? new Date(input.windowEnd) : new Date(now.getTime() + 2 * 3600_000)

  const winErr = validateWindow(start, end, now)
  if (winErr) {
    throw new AppError('INVALID_WINDOW', winErr)
  }

  const visitorId = `vtr-${Math.random().toString(36).slice(2, 9)}`
  const visitor: Visitor = {
    id: visitorId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    company: input.company,
    photo: input.photo,
  }
  visitors.set(visitor.id, visitor)

  const visitId = `vis-${Math.random().toString(36).slice(2, 9)}`
  const visit: Visit = {
    id: visitId,
    visitorId: visitor.id,
    hostId: input.hostId,
    kind: 'WALK_IN',
    purpose: input.purpose,
    type: input.type,
    office: input.office,
    title: input.title,
    note: input.note,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    status: 'PENDING',
    createdAt: now.toISOString(),
  }

  visits.set(visit.id, visit)

  auditEvents.push({
    id: `audit-${Math.random().toString(36).slice(2, 9)}`,
    visitId: visit.id,
    event: 'create',
    by: input.hostId,
    at: now.toISOString(),
  })

  // Notify host about the visitor arrival
  const host = employees.get(input.hostId)
  notify({
    to: host?.email || input.hostId,
    channel: 'email',
    message: `Walk-in visitor ${input.name} has arrived at ${input.office}. Please approve or reject.`,
  })

  persist()
  return { ...visit }
}

export interface GuestInput {
  name: string
  phone: string
  email?: string
  company?: string
}

export interface CreateInvitesInput {
  hostId: string
  title?: string
  purpose?: string
  type: string
  office: string
  windowStart: string
  windowEnd: string
  note?: string
  guests: GuestInput[]
}

/**
 * Creates invites for a group of guests.
 * ALL-OR-NOTHING: All validation (validateWindow and canPreApprove limit) is executed
 * BEFORE creating any records in memory.
 */
export async function createInvites(input: CreateInvitesInput): Promise<Visit[]> {
  await delay()
  ensureInitialized()

  const now = getNow()
  const start = new Date(input.windowStart)
  const end = new Date(input.windowEnd)

  // 1. Validate window BEFORE creating any records
  const winErr = validateWindow(start, end, now)
  if (winErr) {
    throw new AppError('INVALID_WINDOW', winErr)
  }

  // 2. Validate daily limit BEFORE creating any records
  const day = dayKey(input.windowStart)
  const counterKey = `${input.hostId}|${day}`
  const used = preApprovalCounter.get(counterKey) ?? 0

  if (!canPreApprove(used, input.guests.length, currentSettings.maxPreApprovalsPerDay)) {
    throw new AppError(
      'LIMIT_EXCEEDED',
      `Daily pre-approval limit of ${currentSettings.maxPreApprovalsPerDay} exceeded for host ${input.hostId} on ${day} (used: ${used}, adding: ${input.guests.length})`,
    )
  }

  // 3. Validation passed: create Visitor, Visit, and index entries
  const createdVisits: Visit[] = []

  for (const guest of input.guests) {
    const visitorId = `vtr-${Math.random().toString(36).slice(2, 9)}`
    const visitor: Visitor = {
      id: visitorId,
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      company: guest.company,
    }
    visitors.set(visitor.id, visitor)

    const passCode = generateUniquePassCode()
    const visitId = `vis-${Math.random().toString(36).slice(2, 9)}`
    const visit: Visit = {
      id: visitId,
      visitorId: visitor.id,
      hostId: input.hostId,
      kind: 'INVITE',
      purpose: input.purpose || input.title || 'Pre-approved Visit',
      type: input.type,
      office: input.office,
      title: input.title,
      note: input.note,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      status: 'PRE_APPROVED',
      passCode,
      createdAt: now.toISOString(),
    }

    // Keep indexes consistent
    visits.set(visit.id, visit)
    passCodeMap.set(passCode, visit.id)

    auditEvents.push({
      id: `audit-${Math.random().toString(36).slice(2, 9)}`,
      visitId: visit.id,
      event: 'create',
      by: input.hostId,
      at: now.toISOString(),
    })

    // Notify guest with their pass
    notify({
      to: guest.email || guest.phone,
      channel: guest.email ? 'email' : 'sms',
      message: `Your visit pass for ${input.office} is ${passCode}. Valid ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}.`,
    })

    createdVisits.push({ ...visit })
  }

  // Update counter index once for the entire batch
  preApprovalCounter.set(counterKey, used + input.guests.length)

  persist()
  return createdVisits
}

/**
 * Applies a lifecycle transition event to a visit.
 * Strictly uses domain transition(). Generates passCode and immediately updates passCodeMap on approve.
 */
export async function applyEvent(visitId: string, event: VisitEvent, by: string): Promise<Visit> {
  await delay()
  ensureInitialized()

  const visit = visits.get(visitId)
  if (!visit) {
    throw new AppError('NOT_FOUND', `Visit '${visitId}' not found`)
  }

  // Strict domain state machine validation
  let nextStatus: Status
  try {
    nextStatus = transition(visit.status, event)
  } catch (err) {
    if (err instanceof IllegalTransitionError) {
      throw new AppError('ILLEGAL_TRANSITION', err.message)
    }
    throw err
  }

  const now = getNow()
  visit.status = nextStatus

  // Generate passCode on 'approve' and sync passCodeMap immediately for O(1) lookups
  if (event === 'approve' && !visit.passCode) {
    const code = generateUniquePassCode()
    visit.passCode = code
    passCodeMap.set(code, visit.id)
  }

  // Set event timestamps
  if (event === 'checkIn') {
    visit.checkIn = now.toISOString()
  } else if (event === 'checkOut') {
    visit.checkOut = now.toISOString()
  } else if (event === 'reject') {
    // Notify security on rejection
    notify({
      to: 'security',
      channel: 'push',
      message: `Visit ${visit.id} for host ${visit.hostId} was rejected by ${by}.`,
    })
  }

  auditEvents.push({
    id: `audit-${Math.random().toString(36).slice(2, 9)}`,
    visitId: visit.id,
    event,
    by,
    at: now.toISOString(),
  })

  persist()
  return { ...visit }
}

/**
 * Checks in a visitor using their pass code.
 * O(1) lookup in passCodeMap, validates with domain checkPass, then transitions via applyEvent.
 */
export async function checkInByPass(passCode: string, by: string): Promise<Visit> {
  await delay()
  ensureInitialized()

  const visitId = passCodeMap.get(passCode)
  if (!visitId) {
    throw new AppError('PASS_INVALID', 'Invalid pass code')
  }

  const visit = visits.get(visitId)
  if (!visit) {
    throw new AppError('PASS_INVALID', 'Visit not found for this pass code')
  }

  // Validate with domain rule
  const check = checkPass(visit, getNow())
  if (!check.ok) {
    throw new AppError('PASS_INVALID', check.reason)
  }

  return applyEvent(visit.id, 'checkIn', by)
}

export async function listAudit(visitId?: string): Promise<AuditEvent[]> {
  await delay()
  ensureInitialized()
  if (visitId) {
    return auditEvents.filter((a) => a.visitId === visitId).map((a) => ({ ...a }))
  }
  return auditEvents.map((a) => ({ ...a }))
}

export async function getSettings(): Promise<Settings> {
  await delay()
  ensureInitialized()
  return { ...currentSettings }
}

export async function saveSettings(newSettings: Partial<Settings>): Promise<Settings> {
  await delay()
  ensureInitialized()
  currentSettings = { ...currentSettings, ...newSettings }
  persist()
  return { ...currentSettings }
}

/** Exposed for internal index consistency verification in tests. */
export function _getIndexes(): {
  visits: Map<string, Visit>
  passCodeMap: Map<string, string>
  preApprovalCounter: Map<string, number>
} {
  ensureInitialized()
  return {
    visits,
    passCodeMap,
    preApprovalCounter,
  }
}
