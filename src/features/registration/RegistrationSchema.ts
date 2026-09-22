import { z } from 'zod/v4'

/** Walk-in visitor registration form schema.
 *  All fields are strings. Optional fields (email, company) are validated only when non-empty. */
export const registrationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .regex(/^\+?[\d\s\-()]{7,18}$/, 'Enter a valid phone number'),
  email: z
    .string()
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address'),
  purpose: z.string().min(1, 'Purpose is required').max(200),
  hostId: z.string().min(1, 'Please select a host employee'),
  company: z.string(),
  photo: z.string().min(1, 'Photo is required'),
})

export type RegistrationFormData = z.infer<typeof registrationSchema>
