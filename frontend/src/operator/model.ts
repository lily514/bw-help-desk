import type { InboxItem, Route, RouterName, RouteScores } from '../../../shared/types'
import { dayLabel, formatTime, sameDay } from '../shared/format'

export const ROUTE_LABELS: Record<Route, string> = {
  answered: 'AI answered',
  looped_in: 'Looped in',
  handed_off: 'Handed off',
  urgent: 'Urgent',
}

/** List status: New / Seen / Forwarded to {role} / Replied. */
export function statusLabel(item: Pick<InboxItem, 'status' | 'forwardedTo'>): string {
  switch (item.status) {
    case 'new':
      return 'New'
    case 'seen':
      return 'Seen'
    case 'forwarded':
      return `Forwarded to ${item.forwardedTo ?? 'staff'}`
    case 'replied':
      return 'Replied'
  }
}

/** "3 new · 5 today" for the list header. */
export function inboxSummary(items: InboxItem[], now: Date = new Date()): string {
  const fresh = items.filter((i) => i.status === 'new').length
  const today = items.filter((i) => sameDay(i.createdAt, now.toISOString())).length
  return `${fresh} new · ${today} today`
}

/** "Today 5:32 PM", "Yesterday 9:10 AM", "Mon, Oct 19 9:10 AM". */
export function when(iso: string, now: Date = new Date()): string {
  return `${dayLabel(iso, now)} ${formatTime(iso)}`
}

/** Short time for list rows: time today, otherwise the day. */
export function listTime(iso: string, now: Date = new Date()): string {
  return sameDay(iso, now.toISOString()) ? formatTime(iso) : dayLabel(iso, now)
}

const EARLIER_OUTCOME: Record<Route, string> = {
  answered: 'answered by AI',
  looped_in: 'answered by AI, front desk looped in',
  handed_off: 'sent to Dana',
  urgent: 'urgent, staff alerted',
}

/** One muted line of earlier context, e.g. `Earlier today: "Are you open…" (answered by AI)`. */
export function earlierLine(
  earlier: { text: string; route: Route; createdAt: string },
  now: Date = new Date(),
): string {
  const day = dayLabel(earlier.createdAt, now)
  const prefix = day === 'Today' ? 'Earlier today' : day === 'Yesterday' ? 'Yesterday' : day
  const text = earlier.text.length > 70 ? `${earlier.text.slice(0, 67).trimEnd()}…` : earlier.text
  return `${prefix}: “${text}” (${EARLIER_OUTCOME[earlier.route]})`
}

export const ROUTER_LABELS: Record<RouterName, string> = {
  jev: 'Jev (TypeSafe decisions model)',
  'llm-fallback': 'Fallback router (chat model)',
  error: 'Routing failed, handed off to be safe',
}

export const SCORE_LABELS: [keyof Omit<RouteScores, 'topic' | 'sensitive_kind'>, string][] = [
  ['is_urgent', 'Urgent right now'],
  ['is_sensitive', 'Sensitive'],
  ['is_child_health_today', "Child's health today"],
  ['needs_staff_action', 'Needs staff to act'],
  ['answerable_from_kb', 'Covered by policies'],
]

/** Ids in `items` that weren't in `known`, so new arrivals can slide in. */
export function newArrivals(known: ReadonlySet<string>, items: InboxItem[]): string[] {
  return items.filter((i) => !known.has(i.id)).map((i) => i.id)
}
