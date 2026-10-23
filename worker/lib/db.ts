import type { Category, KnowledgeEntry, Parent, Room } from '../../src/shared/types'

// Row shapes as stored in D1 (snake_case, 0/1 booleans).

export interface ParentRow {
  id: string
  name: string
  child_name: string
  room: string
  is_demo: number
  is_test: number
  created_at: string
}

export interface KnowledgeRow {
  id: string
  title: string
  category: string
  body: string
  from_parent_question: number
  source_request_id: string | null
  updated_at: string
}

export function toParent(r: ParentRow): Parent {
  return {
    id: r.id,
    name: r.name,
    childName: r.child_name,
    room: r.room as Room,
    isDemo: r.is_demo === 1,
    isTest: r.is_test === 1,
    createdAt: r.created_at,
  }
}

export function toKnowledgeEntry(r: KnowledgeRow): KnowledgeEntry {
  return {
    id: r.id,
    title: r.title,
    category: r.category as Category,
    body: r.body,
    fromParentQuestion: r.from_parent_question === 1,
    sourceRequestId: r.source_request_id,
    updatedAt: r.updated_at,
  }
}

export async function getParent(db: D1Database, id: string): Promise<Parent | null> {
  const row = await db.prepare('SELECT * FROM parents WHERE id = ?').bind(id).first<ParentRow>()
  return row ? toParent(row) : null
}

export async function insertParent(db: D1Database, p: Parent): Promise<void> {
  await db
    .prepare(
      `INSERT INTO parents (id, name, child_name, room, is_demo, is_test, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(p.id, p.name, p.childName, p.room, p.isDemo ? 1 : 0, p.isTest ? 1 : 0, p.createdAt)
    .run()
}

export async function listKnowledge(db: D1Database): Promise<KnowledgeEntry[]> {
  const { results } = await db
    .prepare('SELECT * FROM knowledge_entries ORDER BY category, title')
    .all<KnowledgeRow>()
  return results.map(toKnowledgeEntry)
}

export async function getKnowledge(db: D1Database, id: string): Promise<KnowledgeEntry | null> {
  const row = await db
    .prepare('SELECT * FROM knowledge_entries WHERE id = ?')
    .bind(id)
    .first<KnowledgeRow>()
  return row ? toKnowledgeEntry(row) : null
}

export async function insertKnowledge(db: D1Database, e: KnowledgeEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO knowledge_entries
         (id, title, category, body, from_parent_question, source_request_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      e.id,
      e.title,
      e.category,
      e.body,
      e.fromParentQuestion ? 1 : 0,
      e.sourceRequestId,
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
