import { create } from 'zustand'
import type { Visit, Status } from '../domain/types'
import { effectiveStatus } from '../domain/rules'
import type { EffectiveStatus } from '../domain/types'
import * as repo from '../api/repo'
import { addToast } from './toast'

export interface VisitFilters {
  status: Status | 'ALL'
  search: string
  dateFrom: string
  dateTo: string
}

interface VisitsState {
  items: Visit[]
  loading: boolean
  error: string | null
  filters: VisitFilters
  setFilter: <K extends keyof VisitFilters>(key: K, value: VisitFilters[K]) => void
  resetFilters: () => void
  fetchVisits: () => Promise<void>
  applyEvent: (visitId: string, event: import('../domain/types').VisitEvent, by: string) => Promise<void>
}

const DEFAULT_FILTERS: VisitFilters = {
  status: 'ALL',
  search: '',
  dateFrom: '',
  dateTo: '',
}

export const useVisitsStore = create<VisitsState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  fetchVisits: async () => {
    set({ loading: true, error: null })
    try {
      const filter = get().filters
      const apiFilter: Parameters<typeof repo.listVisits>[0] = {}
      if (filter.status !== 'ALL') apiFilter.status = filter.status
      const items = await repo.listVisits(apiFilter)
      set({ items, loading: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load visits'
      set({ error: msg, loading: false })
      addToast(msg, 'error')
    }
  },

  applyEvent: async (visitId, event, by) => {
    try {
      await repo.applyEvent(visitId, event, by)
      addToast(`Visit ${event} successful`, 'success')
      await get().fetchVisits()
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to ${event}`
      addToast(msg, 'error')
    }
  },
}))

/** Derives effective status for each visit using the domain rule. Components use this, never raw status. */
export function selectVisitsWithEffectiveStatus(
  items: Visit[],
  now: Date = new Date(),
): Array<Visit & { effectiveStatus: EffectiveStatus }> {
  return items.map((v) => ({
    ...v,
    effectiveStatus: effectiveStatus(v, now),
  }))
}
