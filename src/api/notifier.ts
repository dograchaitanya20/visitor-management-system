export type NotificationChannel = 'email' | 'sms' | 'push'

export interface Notification {
  id: string
  to: string
  channel: NotificationChannel
  message: string
  at: string
  read: boolean
}

export interface NotifyInput {
  to: string
  channel: NotificationChannel
  message: string
}

let notifications: Notification[] = []

/** Appends a notification to the in-memory log without actual dispatch. */
export function notify(input: NotifyInput): Notification {
  const item: Notification = {
    id: `notif-${Math.random().toString(36).slice(2, 9)}`,
    to: input.to,
    channel: input.channel,
    message: input.message,
    at: new Date().toISOString(),
    read: false,
  }
  notifications.unshift(item)
  return item
}

/** Lists notifications, optionally filtered by recipient. */
export function listNotifications(to?: string): Notification[] {
  if (!to) return [...notifications]
  return notifications.filter((n) => n.to === to)
}

/** Marks a notification as read by id. */
export function markRead(id: string): boolean {
  const target = notifications.find((n) => n.id === id)
  if (target) {
    target.read = true
    return true
  }
  return false
}

/** Clears all notifications (primarily for test resets). */
export function clearNotifications(): void {
  notifications = []
}
