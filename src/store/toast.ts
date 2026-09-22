import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastState {
  toasts: Toast[]
  add: (toast: Toast) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  add: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Convenience function callable from non-React code (stores, api layer). */
export function addToast(message: string, type: ToastType = 'info'): void {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  useToastStore.getState().add({ id, message, type })
  // Auto-dismiss after 4 seconds
  setTimeout(() => useToastStore.getState().remove(id), 4000)
}
