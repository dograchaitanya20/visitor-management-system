import { create } from 'zustand'
import type { Notification } from '../api/notifier'
import {
  listNotifications as apiList,
  markRead as apiMarkRead,
} from '../api/notifier'

interface NotificationsState {
  items: Notification[]
  unreadCount: number
  refresh: () => void
  markRead: (id: string) => void
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  items: [],
  unreadCount: 0,

  refresh: () => {
    const items = apiList()
    set({ items, unreadCount: items.filter((n) => !n.read).length })
  },

  markRead: (id) => {
    apiMarkRead(id)
    set((s) => {
      const items = s.items.map((n) => (n.id === id ? { ...n, read: true } : n))
      return { items, unreadCount: items.filter((n) => !n.read).length }
    })
  },
}))
