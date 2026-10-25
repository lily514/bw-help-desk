import type { Message } from '../../shared/types'
import { toMessage, type MessageRow } from './rows'

export async function insertMessage(db: D1Database, m: Message): Promise<void> {
  await db
    .prepare(
      `INSERT INTO messages
         (id, parent_id, role, text, citations, staff_name, staff_role, inquiry_id, is_test, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      m.id,
      m.parentId,
      m.role,
      m.text,
      m.role === 'ai' ? JSON.stringify(m.citations) : null,
      m.staffName,
      m.staffRole,
      m.inquiryId,
      m.isTest ? 1 : 0,
      m.createdAt,
    )
    .run()
}

/** Messages for a parent, oldest first; with `since`, only those created after it. */
export async function listParentMessages(
  db: D1Database,
  parentId: string,
  since?: string,
): Promise<Message[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM messages WHERE parent_id = ? AND created_at > ? ORDER BY created_at, rowid`,
    )
    .bind(parentId, since ?? '')
    .all<MessageRow>()
  return results.map(toMessage)
}

/** The question, the AI's answer and any staff replies for one inquiry, oldest first. */
export async function listInquiryMessages(db: D1Database, inquiryId: string): Promise<Message[]> {
  const { results } = await db
    .prepare('SELECT * FROM messages WHERE inquiry_id = ? ORDER BY created_at, rowid')
    .bind(inquiryId)
    .all<MessageRow>()
  return results.map(toMessage)
}
