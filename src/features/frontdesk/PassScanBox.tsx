import { useState } from 'react'
import * as repo from '../../api/repo'
import { AppError } from '../../api/errors'
import { addToast } from '../../store/toast'
import { useVisitsStore } from '../../store/visits'
import type { Visit } from '../../domain/types'

interface PassScanBoxProps {
  onCheckInSuccess: (visit: Visit) => void
}

export function PassScanBox({ onCheckInSuccess }: PassScanBoxProps) {
  const [passCode, setPassCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fetchVisits = useVisitsStore((s) => s.fetchVisits)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const code = passCode.trim().toUpperCase()
    if (!code) return

    setLoading(true)
    try {
      const visit = await repo.checkInByPass(code, 'front-desk')
      addToast(`Checked in visitor successfully (Pass: ${code})`, 'success')
      setPassCode('')
      await fetchVisits()
      onCheckInSuccess(visit)
    } catch (err: unknown) {
      if (err instanceof AppError && err.code === 'PASS_INVALID') {
        setErrorMsg(err.message)
      } else if (err instanceof Error) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg('Invalid or expired pass code')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-2">
        <label
          htmlFor="passCodeInput"
          className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
        >
          Quick Pass Check-In
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">
              🎫
            </span>
            <input
              id="passCodeInput"
              type="text"
              value={passCode}
              onChange={(e) => {
                setPassCode(e.target.value.toUpperCase())
                if (errorMsg) setErrorMsg(null)
              }}
              placeholder="Scan or enter pass code (e.g. P00001)"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !passCode.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Check In'
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <span>⚠️</span>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
      </form>
    </div>
  )
}
