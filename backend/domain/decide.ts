import type { Route, RouteScores, SensitiveKind, StaffRole } from '../../shared/types'
import { suggestedRole } from './roles'

/** Routing thresholds (PLAN.md 3.3). Tuned in Phase 8; keep them all here. */
export const THRESHOLDS = {
  urgent: 0.5,
  sensitive: 0.6,
  answerable: 0.5,
  // Measured with Jev: #13 (tour) 0.43–0.53, #15 after the save ~0.11, plain questions < 0.05.
  staffAction: 0.35,
  childHealth: 0.5,
} as const

const SENSITIVE_REASONS: Record<SensitiveKind, string> = {
  custody: 'Possible custody issue',
  complaint: 'Possible complaint',
  behavior: "About a child's behavior",
  billing: 'Possible billing dispute',
  special_needs: 'About special needs',
  medical: 'Needs a medical judgment',
  none: 'Sensitive topic',
}

export interface Decision {
  route: Route
  suggestedRole: StaffRole
  /** Plain-language "why this came to you" for the operator. */
  reason: string
  /** Whether the KB covers it; drives Insights' "Couldn't answer". */
  answerable: boolean
}

/**
 * Scores → route (PLAN.md 3.3). Urgent beats everything; sensitive or not covered
 * goes to Dana; staff action or the child's health today is answered and looped in.
 */
export function decide(scores: RouteScores, childName: string): Decision {
  const childHealthToday = scores.is_child_health_today >= THRESHOLDS.childHealth
  // A question about the child's health today always "asks for a medical judgment".
  // Prefer looping in (policy answer + staff notified) over a hand-off for those.
  const sensitive =
    scores.is_sensitive >= THRESHOLDS.sensitive &&
    !(scores.sensitive_kind === 'medical' && childHealthToday)
  const answerable = scores.answerable_from_kb >= THRESHOLDS.answerable

  let route: Route
  let reason: string
  if (scores.is_urgent >= THRESHOLDS.urgent) {
    route = 'urgent'
    reason = scores.topic === 'Pickup' ? 'May miss pickup' : "A child's safety, right now"
  } else if (sensitive || !answerable) {
    route = 'handed_off'
    reason = sensitive
      ? SENSITIVE_REASONS[scores.sensitive_kind ?? 'none']
      : 'Not covered by your policies'
  } else if (childHealthToday) {
    route = 'looped_in'
    reason = `About ${childName}'s health today`
  } else if (scores.needs_staff_action >= THRESHOLDS.staffAction) {
    route = 'looped_in'
    reason = 'Asks staff to do something'
  } else {
    route = 'answered'
    reason = 'Covered by your policies'
  }

  return { route, reason, answerable, suggestedRole: suggestedRole(route, scores.topic, sensitive) }
}
