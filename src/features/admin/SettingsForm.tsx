import { useState, useEffect } from 'react'
import type { Settings } from '../../domain/types'
import { getSettings, saveSettings } from '../../api/repo'
import { addToast } from '../../store/toast'

export function SettingsForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maxPreApprovals, setMaxPreApprovals] = useState<number>(5)
  const [visitTypes, setVisitTypes] = useState<string[]>([])
  const [offices, setOffices] = useState<string[]>([])

  const [newVisitType, setNewVisitType] = useState('')
  const [newOffice, setNewOffice] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getSettings().then((s) => {
      if (!active) return
      setMaxPreApprovals(s.maxPreApprovalsPerDay)
      setVisitTypes(s.visitTypes)
      setOffices(s.offices)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const handleAddVisitType = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newVisitType.trim()
    if (!trimmed) return
    if (visitTypes.includes(trimmed)) {
      setErrorMsg(`"${trimmed}" is already in the visit types list`)
      return
    }
    setVisitTypes([...visitTypes, trimmed])
    setNewVisitType('')
    setErrorMsg(null)
  }

  const handleRemoveVisitType = (typeToRemove: string) => {
    if (visitTypes.length <= 1) {
      setErrorMsg('At least one visit type is required')
      return
    }
    setVisitTypes(visitTypes.filter((t) => t !== typeToRemove))
    setErrorMsg(null)
  }

  const handleAddOffice = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newOffice.trim()
    if (!trimmed) return
    if (offices.includes(trimmed)) {
      setErrorMsg(`"${trimmed}" is already in the office locations list`)
      return
    }
    setOffices([...offices, trimmed])
    setNewOffice('')
    setErrorMsg(null)
  }

  const handleRemoveOffice = (officeToRemove: string) => {
    if (offices.length <= 1) {
      setErrorMsg('At least one office location is required')
      return
    }
    setOffices(offices.filter((o) => o !== officeToRemove))
    setErrorMsg(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (maxPreApprovals < 1) {
      setErrorMsg('Daily pre-approval limit must be at least 1')
      return
    }
    if (visitTypes.length === 0) {
      setErrorMsg('At least one visit type is required')
      return
    }
    if (offices.length === 0) {
      setErrorMsg('At least one office location is required')
      return
    }

    setSaving(true)
    try {
      const updated: Settings = {
        maxPreApprovalsPerDay: maxPreApprovals,
        visitTypes,
        offices,
      }
      await saveSettings(updated)
      addToast('System settings saved successfully', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings'
      setErrorMsg(msg)
      addToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="h-6 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSave}
      className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6"
    >
      <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          System Configuration
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage system-wide limits, visitor categories, and office facilities.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
          <span>⚠️ {errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-600 text-sm leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Daily Pre-Approval Limit */}
      <div>
        <label
          htmlFor="maxPreApprovals"
          className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1"
        >
          Daily Pre-Approval Limit per Host
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Maximum number of invited visitor passes a single employee can issue per calendar day.
        </p>
        <input
          id="maxPreApprovals"
          type="number"
          min={1}
          max={500}
          value={maxPreApprovals}
          onChange={(e) => setMaxPreApprovals(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-36 px-3 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Visit Types Tag List */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Visit Types ({visitTypes.length})
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Categories available during walk-in registration and pre-approval invites.
        </p>

        {/* Existing Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {visitTypes.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 rounded-lg text-xs font-medium"
            >
              <span>{t}</span>
              <button
                type="button"
                onClick={() => handleRemoveVisitType(t)}
                className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 font-bold ml-1 leading-none"
                aria-label={`Remove visit type ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Add Tag Sub-Form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newVisitType}
            onChange={(e) => setNewVisitType(e.target.value)}
            placeholder="Add new visit type..."
            className="flex-1 max-w-xs px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="button"
            onClick={handleAddVisitType}
            disabled={!newVisitType.trim()}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors"
          >
            + Add Type
          </button>
        </div>
      </div>

      {/* Offices Tag List */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Office Locations ({offices.length})
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Physical facilities and campus locations registered in the system.
        </p>

        {/* Existing Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {offices.map((o) => (
            <span
              key={o}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs font-medium"
            >
              <span>🏢 {o}</span>
              <button
                type="button"
                onClick={() => handleRemoveOffice(o)}
                className="text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200 font-bold ml-1 leading-none"
                aria-label={`Remove office ${o}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Add Office Sub-Form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newOffice}
            onChange={(e) => setNewOffice(e.target.value)}
            placeholder="Add new office location..."
            className="flex-1 max-w-xs px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="button"
            onClick={handleAddOffice}
            disabled={!newOffice.trim()}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors"
          >
            + Add Office
          </button>
        </div>
      </div>

      {/* Save Action */}
      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {saving ? 'Saving Settings…' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
