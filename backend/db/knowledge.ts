import type { KnowledgeEntry } from '../../shared/types'
import { toKnowledgeEntry, type KnowledgeRow } from './rows'

export async function listKnowledge(db: D1Database): Promise<KnowledgeEntry[]> {
  const { results } = await db
    .prepare('SELECT * FROM knowledge_entries ORDER BY category, title')
    .all<KnowledgeRow>()
  return results.map(toKnowledgeEntry)
}

export async function listKnowledgeTitles(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT title FROM knowledge_entries')
    .all<{ title: string }>()
  return results.map((r) => r.title)
}

export async function getKnowledge(db: D1Database, id: string): Promise<KnowledgeEntry | null> {
  const row = await db
    .prepare('SELECT * FROM knowledge_entries WHERE id = ?')
    .bind(id)
    .first<KnowledgeRow>()
  return row ? toKnowledgeEntry(row) : null
}

/** Name of the parent whose question an entry was saved from, for the editor's meta line. */
export async function getSourceParentName(
  db: D1Database,
  inquiryId: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT p.name FROM inquiries r JOIN parents p ON p.id = r.parent_id WHERE r.id = ?')
    .bind(inquiryId)
    .first<{ name: string }>()
  return row?.name ?? null
}

export async function insertKnowledge(db: D1Database, e: KnowledgeEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO knowledge_entries
         (id, title, category, body, from_parent_question, source_inquiry_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      e.id,
      e.title,
      e.category,
      e.body,
      e.fromParentQuestion ? 1 : 0,
      e.sourceInquiryId,
      e.updatedAt,
    )
    .run()
}

export async function updateKnowledge(
  db: D1Database,
  id: string,
  fields: Pick<KnowledgeEntry, 'title' | 'category' | 'body' | 'updatedAt'>,
): Promise<void> {
  await db
    .prepare(
      'UPDATE knowledge_entries SET title = ?, category = ?, body = ?, updated_at = ? WHERE id = ?',
    )
    .bind(fields.title, fields.category, fields.body, fields.updatedAt, id)
    .run()
}
