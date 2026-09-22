export type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PRE_APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'EXPIRED'
export type EffectiveStatus = Status | 'OVERSTAY'
export type VisitEvent = 'approve' | 'reject' | 'checkIn' | 'checkOut' | 'expire'
export type VisitKind = 'WALK_IN' | 'INVITE'

export interface Employee { id: string; name: string; dept: string; email: string; phone: string }
export interface Visitor { id: string; name: string; phone: string; email?: string; company?: string; photo?: string }

export interface Visit {
  id: string; visitorId: string; hostId: string
  kind: VisitKind; purpose: string; type: string; office: string
  title?: string; note?: string
  windowStart: string; windowEnd: string
  status: Status; passCode?: string
  checkIn?: string; checkOut?: string; createdAt: string
}

export interface AuditEvent { id: string; visitId: string; event: VisitEvent | 'create'; by: string; at: string }
export interface Settings { maxPreApprovalsPerDay: number; visitTypes: string[]; offices: string[] }