import type { Message, ThreadRequest } from '../../../shared/types'
import { dayLabel, sameDay } from '../shared/format'

export type ThreadItem =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message }
  | { kind: 'status'; key: string; request: ThreadRequest }

/**
 * Orders messages with date dividers, and places each request's status card
 * right after its AI reply (or after the parent's message while the reply is
 * still on its way). Answered requests get no card.
 */
export function buildThreadItems(
  messages: Message[],
  requests: ThreadRequest[],
  now: Date = new Date(),
): ThreadItem[] {
  const sorted = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const cardRequests = new Map(
    requests.filter((r) => r.route !== 'answered').map((r) => [r.id, r] as const),
  )

  // Where each card goes: the first AI message for the request, else the parent message.
  const anchor = new Map<string, string>()
  for (const m of sorted) {
    if (!m.requestId || !cardRequests.has(m.requestId)) continue
    const current = anchor.get(m.requestId)
    if (m.role === 'ai' && !current?.startsWith('ai:')) anchor.set(m.requestId, `ai:${m.id}`)
    else if (m.role === 'parent' && !current) anchor.set(m.requestId, `parent:${m.id}`)
  }

  const items: ThreadItem[] = []
  let previous: Message | undefined
  for (const m of sorted) {
    if (!previous || !sameDay(previous.createdAt, m.createdAt)) {
      items.push({ kind: 'divider', key: `day-${m.id}`, label: dayLabel(m.createdAt, now) })
    }
    items.push({ kind: 'message', key: m.id, message: m })
    if (m.requestId) {
      const request = cardRequests.get(m.requestId)
      const spot = anchor.get(m.requestId)
      if (request && spot === `${m.role}:${m.id}`) {
        items.push({ kind: 'status', key: `status-${request.id}`, request })
      }
    }
    previous = m
  }
  return items
}
