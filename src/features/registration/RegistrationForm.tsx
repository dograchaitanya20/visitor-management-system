import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registrationSchema, type RegistrationFormData } from './RegistrationSchema'
import { HostSearch } from './HostSearch'
import { PhotoCapture } from './PhotoCapture'
import { useVisitsStore } from '../../store/visits'
import { addToast } from '../../store/toast'
import { getSettings } from '../../api/repo'

/** Walk-in visitor registration form wired to react-hook-form + zod + the visits store. */
export function RegistrationForm() {
  const registerWalkIn = useVisitsStore((s) => s.registerWalkIn)
  const [submitting, setSubmitting] = useState(false)
  const [successInfo, setSuccessInfo] = useState<{ name: string; visitId: string } | null>(null)
  const [visitTypes, setVisitTypes] = useState<string[]>([])
  const [offices, setOffices] = useState<string[]>([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      purpose: '',
      hostId: '',
      company: '',
      visitType: '',
      office: '',
      photo: '',
    },
  })

  // Load visit types and offices from settings, then default to first option
  useEffect(() => {
    getSettings().then((s) => {
      setVisitTypes(s.visitTypes)
      setOffices(s.offices)
      if (s.visitTypes.length > 0) setValue('visitType', s.visitTypes[0])
      if (s.offices.length > 0) setValue('office', s.offices[0])
      setSettingsLoaded(true)
    })
  }, [setValue])

  const onSubmit = async (data: RegistrationFormData) => {
    setSubmitting(true)
    setSuccessInfo(null)
    try {
      const visit = await registerWalkIn({
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        company: data.company || undefined,
        photo: data.photo,
        hostId: data.hostId,
        purpose: data.purpose,
        type: data.visitType,
        office: data.office,
      })
      setSuccessInfo({ name: data.name, visitId: visit.id })
      reset()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      addToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Success confirmation panel */}
      {successInfo && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-green-600 text-xl">✓</span>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Visitor registered — host notified
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
                {successInfo.name} is checked in as pending. Visit ID: {successInfo.visitId}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessInfo(null)}
              className="ml-auto text-green-400 hover:text-green-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Visitor Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            placeholder="Full name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Phone + Email row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              {...register('phone')}
              placeholder="+91 98200 12345"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              {...register('email')}
              placeholder="visitor@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Company
          </label>
          <input
            {...register('company')}
            placeholder="Organization name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Purpose of Visit <span className="text-red-500">*</span>
          </label>
          <input
            {...register('purpose')}
            placeholder="Meeting, delivery, interview..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          {errors.purpose && <p className="mt-1 text-xs text-red-500">{errors.purpose.message}</p>}
        </div>

        {/* Visit Type + Office row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Visit Type <span className="text-red-500">*</span>
            </label>
            {!settingsLoaded ? (
              <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-400 animate-pulse">
                Loading…
              </div>
            ) : (
              <select
                {...register('visitType')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {visitTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
            {errors.visitType && <p className="mt-1 text-xs text-red-500">{errors.visitType.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Office <span className="text-red-500">*</span>
            </label>
            {!settingsLoaded ? (
              <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-400 animate-pulse">
                Loading…
              </div>
            ) : (
              <select
                {...register('office')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {offices.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            )}
            {errors.office && <p className="mt-1 text-xs text-red-500">{errors.office.message}</p>}
          </div>
        </div>

        {/* Host employee search */}
        <Controller
          name="hostId"
          control={control}
          render={({ field }) => (
            <HostSearch
              value={field.value}
              onChange={field.onChange}
              error={errors.hostId?.message}
            />
          )}
        />

        {/* Photo capture */}
        <Controller
          name="photo"
          control={control}
          render={({ field }) => (
            <PhotoCapture
              value={field.value}
              onChange={field.onChange}
              error={errors.photo?.message}
            />
          )}
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {submitting ? 'Registering…' : 'Register Walk-In Visitor'}
        </button>
      </form>
    </div>
  )
}
