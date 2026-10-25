import type {
  Category,
  InquiryStatus,
  Route,
  RouteScores,
  RouterName,
  StaffRole,
  ThreadInquiry,
} from '../../shared/types'
import type { InsightQuestion } from '../domain/insights'
import { toThreadInquiry, type InquiryRow } from './rows'

export interface NewInquiry {
  id: string
  parentId: string
  messageId: string
  route: Route
  reason: string
  scores: RouteScores | null
  router: RouterName
  suggestedRole: StaffRole
  topic: Category
  answerable: boolean
  isTest: boolean
  createdAt: string
}

export async function insertInquiry(db: D1Database, r: NewInquiry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO inquiries
         (id, parent_id, message_id, route, reason, scores, router, suggested_role, topic,
          answerable, status, forwarded_to, is_test, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, ?, ?)`,
    )
    .bind(
      r.id,
      r.parentId,
      r.messageId,
      r.route,
      r.reason,
      JSON.stringify(r.scores ?? {}),
      r.router,
      r.suggestedRole,
      r.topic,
      r.answerable ? 1 : 0,
      r.isTest ? 1 : 0,
      r.createdAt,
      r.createdAt,
    )
    .run()
}

export async function getInquiryRow(db: D1Database, id: string): Promise<InquiryRow | null> {
  return db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first<InquiryRow>()
}

/** A parent's inquiries; with `since`, only those created or updated after it. */
export async function listThreadInquiries(
  db: D1Database,
  parentId: string,
  since?: string,
): Promise<ThreadInquiry[]> {
  const { results } = await db
    .prepare(`SELECT * FROM inquiries WHERE parent_id = ? AND updated_at > ? ORDER BY created_at`)
    .bind(parentId, since ?? '')
    .all<InquiryRow>()
  return results.map(toThreadInquiry)
}

/** The parent's previous question before `before`, for the detail's "Earlier" line. */
export async function getEarlierQuestion(
  db: D1Database,
  parentId: string,
  before: string,
): Promise<{ text: string; route: Route; createdAt: string } | null> {
  const row = await db
    .prepare(
      `SELECT m.text, r.route, r.created_at FROM inquiries r
       JOIN messages m ON m.id = r.message_id
       WHERE r.parent_id = ? AND r.created_at < ?
       ORDER BY r.created_at DESC LIMIT 1`,
    )
    .bind(parentId, before)
    .first<{ text: string; route: string; created_at: string }>()
  return row ? { text: row.text, route: row.route as Route, createdAt: row.created_at } : null
}

/** Non-test inquiries since `since`, with their questions, for Insights. */
export async function listInsightRows(db: D1Database, since: string): Promise<InsightQuestion[]> {
  const { results } = await db
    .prepare(
      `SELECT r.route, r.topic, r.answerable, r.created_at, m.text
       FROM inquiries r JOIN messages m ON m.id = r.message_id
       WHERE r.is_test = 0 AND r.created_at >= ?`,
    )
    .bind(since)
    .all<{
      route: string
      topic: string
      answerable: number
      created_at: string
      text: string
    }>()
  return results.map((r) => ({
    route: r.route as Route,
    topic: r.topic as Category,
    answerable: r.answerable === 1,
    text: r.text,
    createdAt: r.created_at,
  }))
}

/** Used when answering fails after routing: the inquiry becomes a hand-off. */
export async function markInquiryHandedOff(
  db: D1Database,
  id: string,
  reason: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE inquiries SET route = 'handed_off', router = 'error', reason = ?, suggested_role = 'Director', updated_at = ? WHERE id = ?`,
    )
    .bind(reason, new Date().toISOString(), id)
    .run()
}

/** "Ask a person" on an AI answer: the answered inquiry becomes a hand-off to Dana. */
export async function escalateToPerson(db: D1Database, id: string): Promise<void> {
  await db
    .prepare(
      `UPDATE inquiries SET route = 'handed_off', reason = 'Parent asked for a person',
         suggested_role = 'Director', status = 'new', updated_at = ?
       WHERE id = ? AND route = 'answered'`,
    )
    .bind(new Date().toISOString(), id)
    .run()
}

export async function setInquiryStatus(
  db: D1Database,
  id: string,
  status: InquiryStatus,
  forwardedTo?: StaffRole,
): Promise<void> {
  await db
    .prepare(
      `UPDATE inquiries SET status = ?, forwarded_to = COALESCE(?, forwarded_to), updated_at = ?
       WHERE id = ?`,
    )
    .bind(status, forwardedTo ?? null, new Date().toISOString(), id)
    .run()
}

/** Opening an item marks it Seen, but never moves it backwards from forwarded or replied. */
export async function markSeen(db: D1Database, id: string): Promise<void> {
  await db
    .prepare(`UPDATE inquiries SET status = 'seen', updated_at = ? WHERE id = ? AND status = 'new'`)
    .bind(new Date().toISOString(), id)
    .run()
}
