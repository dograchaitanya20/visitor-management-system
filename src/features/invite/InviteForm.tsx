import { useState, useEffect } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import { inviteSchema, type InviteFormData } from './InviteSchema'
import { GuestPicker } from './GuestPicker'
import { useVisitsStore } from '../../store/visits'
import { addToast } from '../../store/toast'
import { getSettings } from '../../api/repo'
import { AppError } from '../../api/errors'
import type { Visit } from '../../domain/types'

interface InviteFormProps {
  hostId: string
  hostName?: string
}

interface SuccessResult {
  title: string
  office: string
  windowStart: string
  windowEnd: string
  visits: Visit[]
  guests: InviteFormData['guests']
}

export function InviteForm({ hostId, hostName }: InviteFormProps) {
  const sendInvites = useVisitsStore((s) => s.sendInvites)
  const [submitting, setSubmitting] = useState(false)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<SuccessResult | null>(null)
  const [visitTypes, setVisitTypes] = useState<string[]>([])
  const [offices, setOffices] = useState<string[]>([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const [todayStr] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [defaultDateStr] = useState(() => format(new Date(Date.now() + 86_400_000), 'yyyy-MM-dd'))

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      title: '',
      type: '',
      office: '',
      date: defaultDateStr,
      startTime: '10:00',
      endTime: '12:00',
      note: '',
      guests: [],
    },
  })

  // Pre-populate settings and select defaults
  useEffect(() => {
    getSettings().then((s) => {
      setVisitTypes(s.visitTypes)
      setOffices(s.offices)
      if (s.visitTypes.length > 0) setValue('type', s.visitTypes[0])
      if (s.offices.length > 0) setValue('office', s.offices[0])
      setSettingsLoaded(true)
    })
  }, [setValue])

  const guests = useWatch({ control, name: 'guests', defaultValue: [] })

  const onSubmit = async (data: InviteFormData) => {
    setSubmitting(true)
    setLimitError(null)

    try {
      const windowStart = new Date(`${data.date}T${data.startTime}`).toISOString()
      const windowEnd = new Date(`${data.date}T${data.endTime}`).toISOString()

      const createdVisits = await sendInvites({
        hostId,
        title: data.title,
        type: data.type,
        office: data.office,
        windowStart,
        windowEnd,
        note: data.note || undefined,
        guests: data.guests.map((g) => ({
          name: g.name,
          phone: g.phone,
          email: g.email || undefined,
          company: g.company || undefined,
        })),
      })

      setSuccessData({
        title: data.title,
        office: data.office,
        windowStart,
        windowEnd,
        visits: createdVisits,
        guests: data.guests,
      })

      reset({
        title: '',
        type: visitTypes[0] || '',
        office: offices[0] || '',
        date: defaultDateStr,
        startTime: '10:00',
        endTime: '12:00',
        note: '',
        guests: [],
      })
    } catch (err: unknown) {
      if (err instanceof AppError && err.code === 'LIMIT_EXCEEDED') {
        setLimitError(err.message)
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to send invites'
        addToast(msg, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // --- Success View with Pass QR Codes ---
  if (successData) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-green-800 dark:text-green-200">
                🎉 Pre-Approval Invites Sent!
              </h2>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {successData.visits.length} invite pass(es) created for{' '}
                <strong>{successData.title}</strong> at {successData.office}.
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                Window: {new Date(successData.windowStart).toLocaleString()} -{' '}
                {new Date(successData.windowEnd).toLocaleTimeString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessData(null)}
              className="px-4 py-2 text-xs font-semibold bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
            >
              + Create Another Invite
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Visitor Pass Codes & QR Passes
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {successData.visits.map((v, i) => {
              const guest = successData.guests[i]
              const code = v.passCode || 'N/A'
              return (
                <div
                  key={v.id}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center gap-4"
                >
                  <div className="p-2 bg-white rounded-lg border border-gray-100 dark:border-gray-700 shrink-0">
                    <QRCodeSVG value={code} size={88} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                      Pre-Approved
                    </span>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1 truncate">
                      {guest?.name || 'Guest'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {guest?.phone} {guest?.company ? `· ${guest.company}` : ''}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 font-medium">Pass:</span>
                      <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded">
                        {code}
                      </code>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Specific LIMIT_EXCEEDED Alert Banner */}
      {limitError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-800 dark:text-red-200">
                Pre-Approval Limit Exceeded
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {limitError}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Host pre-approval limits are configured per employee per day. Try choosing a different date or reducing the guest count.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLimitError(null)}
              className="text-red-400 hover:text-red-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Event & Window Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4 bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Visit Details
            </h2>
            {hostName && (
              <p className="text-xs text-gray-500 mt-0.5">
                Hosting as <span className="font-medium text-gray-700 dark:text-gray-300">{hostName}</span>
              </p>
            )}
          </div>

          {/* Event Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              {...register('title')}
              placeholder="e.g. Q4 Strategy Review / Vendor Demo"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Visit Type + Office Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visit Type <span className="text-red-500">*</span>
              </label>
              {!settingsLoaded ? (
                <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-400 animate-pulse">
                  Loading...
                </div>
              ) : (
                <select
                  id="type"
                  {...register('type')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {visitTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
              {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>}
            </div>

            <div>
              <label htmlFor="office" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Office Location <span className="text-red-500">*</span>
              </label>
              {!settingsLoaded ? (
                <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-400 animate-pulse">
                  Loading...
                </div>
              ) : (
                <select
                  id="office"
                  {...register('office')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {offices.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}
              {errors.office && <p className="mt-1 text-xs text-red-500">{errors.office.message}</p>}
            </div>
          </div>

          {/* Date and Time Window */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="date"
                type="date"
                min={todayStr}
                {...register('date')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
            </div>

            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                id="startTime"
                type="time"
                {...register('startTime')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-red-500">{errors.startTime.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                id="endTime"
                type="time"
                {...register('endTime')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {errors.endTime && (
                <p className="mt-1 text-xs text-red-500">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Personal Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Personal Note / Instructions (optional)
            </label>
            <textarea
              rows={3}
              {...register('note')}
              placeholder="e.g. Please bring government-issued photo ID. Coffee & lunch provided on 4th floor."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Right Column: Guest Picker (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Guest List
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Each guest will receive a unique digital pass code.
            </p>
          </div>

          <Controller
            name="guests"
            control={control}
            render={({ field }) => (
              <GuestPicker
                guests={field.value}
                onChange={field.onChange}
                error={errors.guests?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          {guests.length === 0
            ? 'Add at least one guest to send invites'
            : `Ready to issue ${guests.length} pre-approved invite${guests.length > 1 ? 's' : ''}`}
        </p>

        <button
          type="submit"
          disabled={submitting || guests.length === 0}
          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {submitting && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {submitting ? 'Creating Invites…' : `Confirm & Send Invites (${guests.length})`}
        </button>
      </div>
    </form>
  )
}
