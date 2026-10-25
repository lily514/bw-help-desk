import { HANDED_OFF_ACK, URGENT_ACK } from '../../shared/copy'
import type {
  Category,
  InboxItem,
  RequestDetail,
  RequestStatus,
  Room,
  Route,
  RouterName,
  RouteScores,
  StaffRole,
} from '../../shared/types'
import { toMessage, type MessageRow, type RequestRow } from './db'
import { bestMatchEntry } from '../domain/match'

type InboxRow = RequestRow & {
  text: string
  parent_name: string
  child_name: string
  room: string
}

const INBOX_SELECT = `
  SELECT r.*, m.text, p.name AS parent_name, p.child_name, p.room
  FROM requests r
  JOIN messages m ON m.id = r.message_id
  JOIN parents p ON p.id = r.parent_id`

function toInboxItem(r: InboxRow): InboxItem {
  return {
    id: r.id,
    parentId: r.parent_id,
    parentName: r.parent_name,
    childName: r.child_name,
    room: r.room as Room,
    text: r.text,
    route: r.route as Route,
    status: r.status as RequestStatus,
    suggestedRole: r.suggested_role as StaffRole,
    forwardedTo: r.forwarded_to as StaffRole | null,
    isTest: r.is_test === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

const INBOX_LIMIT = 100

/** Everything that went to a person: unreplied urgent pinned first, then newest. */
export async function listInbox(db: D1Database): Promise<InboxItem[]> {
  const { results } = await db
    .prepare(
      `${INBOX_SELECT}
       WHERE r.route != 'answered'
       ORDER BY (r.route = 'urgent' AND r.status != 'replied') DESC, r.created_at DESC
       LIMIT ?`,
    )
    .bind(INBOX_LIMIT)
    .all<InboxRow>()
  return results.map(toInboxItem)
}

export async function getInboxItem(db: D1Database, id: string): Promise<InboxItem | null> {
  const row = await db.prepare(`${INBOX_SELECT} WHERE r.id = ?`).bind(id).first<InboxRow>()
  return row ? toInboxItem(row) : null
}

const ACKNOWLEDGEMENTS = new Set([HANDED_OFF_ACK, URGENT_ACK])

export async function getRequestDetail(db: D1Database, id: string): Promise<RequestDetail | null> {
  const row = await db.prepare(`${INBOX_SELECT} WHERE r.id = ?`).bind(id).first<InboxRow>()
  if (!row) return null

  const [messages, earlier, kb] = await Promise.all([
    db
      .prepare('SELECT * FROM messages WHERE request_id = ? ORDER BY created_at, rowid')
      .bind(id)
      .all<MessageRow>(),
    db
      .prepare(
        `SELECT m.text, r.route, r.created_at FROM requests r
         JOIN messages m ON m.id = r.message_id
         WHERE r.parent_id = ? AND r.created_at < ?
         ORDER BY r.created_at DESC LIMIT 1`,
      )
      .bind(row.parent_id, row.created_at)
      .first<{ text: string; route: string; created_at: string }>(),
    db
      .prepare('SELECT id, title, category, body FROM knowledge_entries ORDER BY category, title')
      .all<{ id: string; title: string; category: Category; body: string }>(),
  ])

  const thread = messages.results.map(toMessage)
  const answer = thread.find((m) => m.role === 'ai' && !ACKNOWLEDGEMENTS.has(m.text))

  return {
    request: {
      ...toInboxItem(row),
      reason: row.reason,
      scores: parseScores(row.scores),
      router: row.router as RouterName,
      topic: row.topic as Category,
      answerable: row.answerable === 1,
    },
    earlier: earlier
      ? { text: earlier.text, route: earlier.route as Route, createdAt: earlier.created_at }
      : null,
    aiAnswer: answer ? { text: answer.text, citations: answer.citations } : null,
    replies: thread.filter((m) => m.role === 'staff'),
    knowledge: kb.results.map(({ id, title, category }) => ({ id, title, category })),
    bestMatchId: bestMatchEntry(row.text, row.topic as Category, kb.results),
  }
}

function parseScores(json: string): RouteScores | null {
  const parsed = JSON.parse(json) as Partial<RouteScores>
  return typeof parsed.is_urgent === 'number' ? (parsed as RouteScores) : null
}

export async function setRequestStatus(
  db: D1Database,
  id: string,
  status: RequestStatus,
  forwardedTo?: StaffRole,
): Promise<void> {
  await db
    .prepare(
      `UPDATE requests SET status = ?, forwarded_to = COALESCE(?, forwarded_to), updated_at = ?
       WHERE id = ?`,
    )
    .bind(status, forwardedTo ?? null, new Date().toISOString(), id)
    .run()
}

/** Opening an item marks it Seen, but never moves it backwards from forwarded or replied. */
export async function markSeen(db: D1Database, id: string): Promise<void> {
  await db
    .prepare(`UPDATE requests SET status = 'seen', updated_at = ? WHERE id = ? AND status = 'new'`)
    .bind(new Date().toISOString(), id)
    .run()
}
