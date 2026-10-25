import type { KnowledgeAddition, KnowledgeEntry } from '../../shared/types'
import {
  toKnowledgeAddition,
  toKnowledgeEntry,
  type KnowledgeAdditionRow,
  type KnowledgeRow,
} from './rows'

const ADDITIONS_SELECT = `
  SELECT a.*, p.name AS parent_name
  FROM knowledge_additions a
  LEFT JOIN inquiries r ON r.id = a.source_inquiry_id
  LEFT JOIN parents p ON p.id = r.parent_id`

/** Every entry with its additions (oldest first). */
export async function listKnowledge(db: D1Database): Promise<KnowledgeEntry[]> {
  const [entries, additions] = await db.batch([
    db.prepare('SELECT * FROM knowledge_entries ORDER BY category, title'),
    db.prepare(`${ADDITIONS_SELECT} ORDER BY a.created_at, a.id`),
  ])
  const byEntry = new Map<string, KnowledgeAddition[]>()
  for (const row of additions.results as KnowledgeAdditionRow[]) {
    const list = byEntry.get(row.entry_id) ?? []
    list.push(toKnowledgeAddition(row))
    byEntry.set(row.entry_id, list)
  }
  return (entries.results as KnowledgeRow[]).map((r) => toKnowledgeEntry(r, byEntry.get(r.id)))
}

export async function listKnowledgeTitles(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT title FROM knowledge_entries')
    .all<{ title: string }>()
  return results.map((r) => r.title)
}

export async function getKnowledge(db: D1Database, id: string): Promise<KnowledgeEntry | null> {
  const [entry, additions] = await db.batch([
    db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').bind(id),
    db.prepare(`${ADDITIONS_SELECT} WHERE a.entry_id = ? ORDER BY a.created_at, a.id`).bind(id),
  ])
  const row = entry.results[0] as KnowledgeRow | undefined
  if (!row) return null
  return toKnowledgeEntry(
    row,
    (additions.results as KnowledgeAdditionRow[]).map(toKnowledgeAddition),
  )
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

/** Inserts the entry itself; `additions` are left out (a new entry has none). */
export async function insertKnowledge(db: D1Database, e: KnowledgeEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO knowledge_entries
         (id, title, category, body, source, source_inquiry_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(e.id, e.title, e.category, e.body, e.source, e.sourceInquiryId, e.updatedAt)
    .run()
}

/**
 * Updates the entry's own fields. With `additions`, also rewrites the entry's additions in
 * the same batch: listed ones get the new text, unlisted ones are deleted.
 */
export async function updateKnowledge(
  db: D1Database,
  id: string,
  fields: Pick<KnowledgeEntry, 'title' | 'category' | 'body' | 'updatedAt'>,
  additions?: { id: string; text: string }[],
): Promise<void> {
  const statements = [
    db
      .prepare(
        'UPDATE knowledge_entries SET title = ?, category = ?, body = ?, updated_at = ? WHERE id = ?',
      )
      .bind(fields.title, fields.category, fields.body, fields.updatedAt, id),
  ]
  if (additions) {
    const keep = additions.map((a) => a.id)
    statements.push(
      db
        .prepare(
          `DELETE FROM knowledge_additions
           WHERE entry_id = ? AND id NOT IN (SELECT value FROM json_each(?))`,
        )
        .bind(id, JSON.stringify(keep)),
      ...additions.map((a) =>
        db
          .prepare('UPDATE knowledge_additions SET text = ? WHERE id = ? AND entry_id = ?')
          .bind(a.text, a.id, id),
      ),
    )
  }
  await db.batch(statements)
}

/** Saves a reply onto an existing entry and bumps the entry's `updated_at`. */
export async function insertAddition(
  db: D1Database,
  entryId: string,
  a: Pick<KnowledgeAddition, 'id' | 'text' | 'sourceInquiryId' | 'createdAt'>,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO knowledge_additions (id, entry_id, text, source_inquiry_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(a.id, entryId, a.text, a.sourceInquiryId, a.createdAt),
    db
      .prepare('UPDATE knowledge_entries SET updated_at = ? WHERE id = ?')
      .bind(a.createdAt, entryId),
  ])
}
