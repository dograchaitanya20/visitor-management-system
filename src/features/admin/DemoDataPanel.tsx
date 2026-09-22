import { useState } from 'react'
import * as repo from '../../api/repo'
import { useVisitsStore } from '../../store/visits'
import { addToast } from '../../store/toast'

export function DemoDataPanel() {
  const [loading10k, setLoading10k] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [loadTiming, setLoadTiming] = useState<number | null>(null)
  const totalVisits = useVisitsStore((s) => s.items.length)
  const fetchVisits = useVisitsStore((s) => s.fetchVisits)

  const handleLoad10k = async () => {
    setLoading10k(true)
    try {
      const t0 = performance.now()
      repo.seedLargeData(10_000)
      const duration = Math.round(performance.now() - t0)
      setLoadTiming(duration)

      await fetchVisits()
      addToast(`Loaded 10,000 demo visits in ${duration}ms`, 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to seed large dataset'
      addToast(msg, 'error')
    } finally {
      setLoading10k(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      repo.resetRepo()
      setLoadTiming(null)
      await fetchVisits()
      addToast('Reset to default seed data (300 visits)', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset repository'
      addToast(msg, 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
      <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Demo Dataset Management
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Benchmark virtualized tables and stress-test performance with large datasets.
        </p>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg text-xs">
        <span className="text-gray-600 dark:text-gray-400">Current Visits in Repository:</span>
        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
          {totalVisits.toLocaleString()} visits
        </span>
      </div>

      {loadTiming !== null && (
        <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-800 dark:text-green-200 flex items-center justify-between">
          <span>⚡ Last Benchmark:</span>
          <span className="font-mono font-bold">10,000 records generated in {loadTiming}ms</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleLoad10k}
          disabled={loading10k || resetting}
          className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading10k && (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {loading10k ? 'Generating 10,000 Visits…' : '🚀 Load 10,000 Demo Visits'}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={loading10k || resetting}
          className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-lg transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {resetting && (
            <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
          )}
          {resetting ? 'Resetting Repository…' : '🔄 Reset to Default Data'}
        </button>
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed">
        <strong>Note:</strong> 10,000 demo visits run in-memory and will not persist across browser
        refreshes to protect storage quotas. Clicking <em>"Reset to default data"</em> restores
        standard persistent seed data (300 visits across 25 employees).
      </p>
    </div>
  )
}
