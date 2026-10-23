import type {
  Category,
  KnowledgeEntry,
  Message,
  MessageRole,
  Parent,
  RequestStatus,
  Room,
  Route,
  StaffRole,
  ThreadRequest,
} from '../../src/shared/types'

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

export interface MessageRow {
  id: string
  parent_id: string
  role: string
  text: string
  citations: string | null
  staff_name: string | null
  staff_role: string | null
  request_id: string | null
  is_test: number
  created_at: string
}

export interface RequestRow {
  id: string
  parent_id: string
  message_id: string
  route: string
  reason: string
  scores: string
  router: string
  suggested_role: string
  topic: string
  answerable: number
  status: string
  forwarded_to: string | null
  is_test: number
  created_at: string
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

export function toMessage(r: MessageRow): Message {
  return {
    id: r.id,
    parentId: r.parent_id,
    role: r.role as MessageRole,
    text: r.text,
    citations: r.citations ? (JSON.parse(r.citations) as string[]) : [],
    staffName: r.staff_name,
    staffRole: r.staff_role,
    requestId: r.request_id,
    isTest: r.is_test === 1,
    createdAt: r.created_at,
  }
}

export function toThreadRequest(r: RequestRow): ThreadRequest {
  return {
    id: r.id,
    messageId: r.message_id,
    route: r.route as Route,
    status: r.status as RequestStatus,
    suggestedRole: r.suggested_role as StaffRole,
    forwardedTo: r.forwarded_to as StaffRole | null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function insertMessage(db: D1Database, m: Message): Promise<void> {
  await db
    .prepare(
      `INSERT INTO messages
         (id, parent_id, role, text, citations, staff_name, staff_role, request_id, is_test, created_at)
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
      m.requestId,
      m.isTest ? 1 : 0,
      m.createdAt,
    )
    .run()
}

/** Messages for a parent, oldest first; with `since`, only those created after it. */
export async function listMessages(
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

/** A parent's requests; with `since`, only those created or updated after it. */
export async function listThreadRequests(
  db: D1Database,
  parentId: string,
  since?: string,
): Promise<ThreadRequest[]> {
  const { results } = await db
    .prepare(`SELECT * FROM requests WHERE parent_id = ? AND updated_at > ? ORDER BY created_at`)
    .bind(parentId, since ?? '')
    .all<RequestRow>()
  return results.map(toThreadRequest)
}
