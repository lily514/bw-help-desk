import type { Message, ThreadInquiry } from '../../../shared/types'
import { dayLabel, sameDay } from '../shared/format'

export type ThreadItem =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message }
  | { kind: 'status'; key: string; inquiry: ThreadInquiry }

/**
 * Orders messages with date dividers, and places each inquiry's status card
 * right after its AI reply (or after the parent's message while the reply is
 * still on its way). Answered inquiries get no card.
 */
export function buildThreadItems(
  messages: Message[],
  inquiries: ThreadInquiry[],
  now: Date = new Date(),
): ThreadItem[] {
  const sorted = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const cardInquiries = new Map(
    inquiries.filter((r) => r.route !== 'answered').map((r) => [r.id, r] as const),
  )

  // Where each card goes: the first AI message for the inquiry, else the parent message.
  const anchor = new Map<string, string>()
  for (const m of sorted) {
    if (!m.inquiryId || !cardInquiries.has(m.inquiryId)) continue
    const current = anchor.get(m.inquiryId)
    if (m.role === 'ai' && !current?.startsWith('ai:')) anchor.set(m.inquiryId, `ai:${m.id}`)
    else if (m.role === 'parent' && !current) anchor.set(m.inquiryId, `parent:${m.id}`)
  }

  const items: ThreadItem[] = []
  let previous: Message | undefined
  for (const m of sorted) {
    if (!previous || !sameDay(previous.createdAt, m.createdAt)) {
      items.push({ kind: 'divider', key: `day-${m.id}`, label: dayLabel(m.createdAt, now) })
    }
    items.push({ kind: 'message', key: m.id, message: m })
    if (m.inquiryId) {
      const inquiry = cardInquiries.get(m.inquiryId)
      const spot = anchor.get(m.inquiryId)
      if (inquiry && spot === `${m.role}:${m.id}`) {
        items.push({ kind: 'status', key: `status-${inquiry.id}`, inquiry })
      }
    }
    previous = m
  }
  return items
}
