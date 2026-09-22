import type { EffectiveStatus } from '../../domain/types'

const COLORS: Record<EffectiveStatus, string> = {
  CHECKED_IN:   'bg-green-100 text-green-800',
  APPROVED:     'bg-blue-100 text-blue-800',
  PRE_APPROVED: 'bg-blue-100 text-blue-800',
  PENDING:      'bg-gray-100 text-gray-800',
  REJECTED:     'bg-red-100 text-red-800',
  EXPIRED:      'bg-red-100 text-red-800',
  OVERSTAY:     'bg-orange-100 text-orange-800',
  CHECKED_OUT:  'bg-slate-100 text-slate-600',
}

const LABELS: Record<EffectiveStatus, string> = {
  CHECKED_IN:   'Checked In',
  APPROVED:     'Approved',
  PRE_APPROVED: 'Pre-Approved',
  PENDING:      'Pending',
  REJECTED:     'Rejected',
  EXPIRED:      'Expired',
  OVERSTAY:     'Overstay',
  CHECKED_OUT:  'Checked Out',
}

export function Badge({ status }: { status: EffectiveStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COLORS[status]}`}>
      {LABELS[status]}
    </span>
  )
}
