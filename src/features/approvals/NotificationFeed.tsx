import { useEffect } from 'react'
import { useNotificationsStore } from '../../store/notifications'

interface NotificationFeedProps {
  /** Filter notifications to this recipient (host email). Omit to show all. */
  hostEmail?: string
}

const CHANNEL_ICON: Record<string, string> = {
  email: '✉️',
  sms: '💬',
  push: '🔔',
}

/** Relative time label like "2m ago", "1h ago" */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/** List of notifications for the current host, with read/unread state. */
export function NotificationFeed({ hostEmail }: NotificationFeedProps) {
  const items = useNotificationsStore((s) => s.items)
  const refresh = useNotificationsStore((s) => s.refresh)
  const markRead = useNotificationsStore((s) => s.markRead)

  useEffect(() => { refresh() }, [refresh])

  // Filter to this host if provided
  const filtered = hostEmail
    ? items.filter((n) => n.to === hostEmail)
    : items

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">No notifications yet.</p>
    )
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {filtered.slice(0, 30).map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => { if (!n.read) markRead(n.id) }}
            className={`w-full text-left px-3 py-3 flex items-start gap-3 transition-colors ${
              n.read
                ? 'text-gray-400'
                : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            {/* Unread dot */}
            <div className="mt-1.5 shrink-0">
              {!n.read ? (
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
              ) : (
                <div className="w-2 h-2" />
              )}
            </div>

            {/* Channel icon */}
            <span className="text-base shrink-0">{CHANNEL_ICON[n.channel] ?? '📨'}</span>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${!n.read ? 'font-medium' : ''}`}>{n.message}</p>
              <p className="text-xs text-gray-400 mt-0.5">{relativeTime(n.at)}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
