import type { InboxItem } from '../../shared/types'
import { toInboxItem, type InboxRow } from './rows'

const INBOX_SELECT = `
  SELECT r.*, m.text, p.name AS parent_name, p.child_name, p.room
  FROM requests r
  JOIN messages m ON m.id = r.message_id
  JOIN parents p ON p.id = r.parent_id`

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

/** One request with its question and parent, raw, for the detail view. */
export async function getInboxRow(db: D1Database, id: string): Promise<InboxRow | null> {
  return db.prepare(`${INBOX_SELECT} WHERE r.id = ?`).bind(id).first<InboxRow>()
}

export async function getInboxItem(db: D1Database, id: string): Promise<InboxItem | null> {
  const row = await getInboxRow(db, id)
  return row ? toInboxItem(row) : null
}
