import { z } from 'zod/v4'

export const guestSchema = z.object({
  name: z.string().min(1, 'Guest name is required').max(100),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .regex(/^\+?[\d\s\-()]{7,18}$/, 'Enter a valid phone number'),
  email: z
    .string()
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address'),
  company: z.string(),
})

export type GuestFormData = z.infer<typeof guestSchema>

export const inviteSchema = z
  .object({
    title: z.string().min(1, 'Event title is required').max(150),
    type: z.string().min(1, 'Visit type is required'),
    office: z.string().min(1, 'Office is required'),
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    note: z.string(),
    guests: z.array(guestSchema).min(1, 'At least one guest is required'),
  })
  .refine(
    (data) => {
      if (!data.date || !data.startTime || !data.endTime) return true
      const start = new Date(`${data.date}T${data.startTime}`)
      const end = new Date(`${data.date}T${data.endTime}`)
      return end > start
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    },
  )
  .refine(
    (data) => {
      if (!data.date || !data.endTime) return true
      const end = new Date(`${data.date}T${data.endTime}`)
      return end.getTime() > Date.now()
    },
    {
      message: 'Visit window must end in the future',
      path: ['endTime'],
    },
  )

export type InviteFormData = z.infer<typeof inviteSchema>
