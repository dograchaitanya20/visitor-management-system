import { create } from 'zustand'

export type Role = 'FRONT_DESK' | 'HOST' | 'ADMIN'

interface SessionState {
  role: Role
  employeeId: string | null
  setRole: (role: Role) => void
  setEmployee: (id: string) => void
}

const SK = 'vms_session'

function loadSession(): { role: Role; employeeId: string | null } {
  try {
    const raw = sessionStorage.getItem(SK)
    if (raw) {
      const parsed = JSON.parse(raw) as { role?: string; employeeId?: string }
      const role = (['FRONT_DESK', 'HOST', 'ADMIN'] as Role[]).includes(parsed.role as Role)
        ? (parsed.role as Role)
        : 'FRONT_DESK'
      return { role, employeeId: parsed.employeeId ?? null }
    }
  } catch { /* ignore corrupt data */ }
  return { role: 'FRONT_DESK', employeeId: null }
}

function saveSession(role: Role, employeeId: string | null): void {
  try {
    sessionStorage.setItem(SK, JSON.stringify({ role, employeeId }))
  } catch { /* quota or SSR — safe to ignore */ }
}

export const useSessionStore = create<SessionState>()((set) => {
  const initial = loadSession()
  return {
    ...initial,
    setRole: (role) =>
      set((s) => {
        saveSession(role, s.employeeId)
        return { role }
      }),
    setEmployee: (employeeId) =>
      set((s) => {
        saveSession(s.role, employeeId)
        return { employeeId }
      }),
  }
})
