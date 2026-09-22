import { useToastStore } from '../../store/toast'

const BG: Record<string, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
}

/** Global toast renderer — mount once in App. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${BG[t.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 text-sm animate-in`}
        >
          <span>{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="shrink-0 text-white/80 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
