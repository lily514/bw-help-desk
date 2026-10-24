import type { RequestStatus, StaffRole, ThreadRequest } from '../../../shared/types'
import { formatTime } from '../shared/format'

export type StepState = 'done' | 'current' | 'pending'

export const STEP_LABELS = ['Delivered', 'Seen', 'Replied'] as const

/** Delivered → Seen → Replied (PLAN.md 4.3). `new` shows as Delivered. */
export function trackerSteps(status: RequestStatus): [StepState, StepState, StepState] {
  switch (status) {
    case 'new':
      return ['done', 'current', 'pending']
    case 'seen':
    case 'forwarded':
      return ['done', 'done', 'current']
    case 'replied':
      return ['done', 'done', 'done']
  }
}

/** "Forwarded to {role}", phrased with the child's name where natural. */
export function roleLabel(role: StaffRole, childName: string): string {
  switch (role) {
    case 'Director':
      return 'Dana, Director'
    case 'Office':
      return 'the office'
    case 'Kitchen':
      return 'the kitchen'
    case 'Classroom teacher':
      return `${childName}'s teacher`
  }
}

export type CardVariant = 'looped_in' | 'handed_off' | 'urgent'

export interface StatusCardModel {
  variant: CardVariant
  title: string
  /** Extra line under the title (urgent only). */
  subtitle?: string
  /** Reply-time note and call link (handed off only). */
  showContact: boolean
}

export function statusCard(request: ThreadRequest, childName: string): StatusCardModel | null {
  if (request.route === 'answered') return null
  const variant = request.route

  let title: string
  if (request.forwardedTo) title = `Forwarded to ${roleLabel(request.forwardedTo, childName)}`
  else if (variant === 'urgent') title = `Staff alerted at ${formatTime(request.createdAt)}`
  else if (variant === 'handed_off') title = 'Sent to Dana, Director'
  else title = 'Shared with the front desk'

  return {
    variant,
    title,
    subtitle: variant === 'urgent' ? `Dana Whitfield and ${childName}'s teacher` : undefined,
    showContact: variant === 'handed_off',
  }
}
