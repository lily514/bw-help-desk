import type { Route, RouteScores } from '../../shared/types'
import { DIRECTOR, HANDED_OFF_ACK } from './copy'
import { parseHandbook } from './handbook'
import { suggestedRole } from './roles'
import {
  DEMO_PARENT,
  HISTORY_PARENTS,
  SEED_QUESTIONS,
  type SeedKind,
  type SeedQuestion,
} from './seed-data'

type SqlValue = string | number | null

export function sqlValue(value: SqlValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') return String(value)
  return `'${value.replace(/'/g, "''")}'`
}

function insert(table: string, row: Record<string, SqlValue>): string {
  const columns = Object.keys(row)
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns
    .map((c) => sqlValue(row[c]))
    .join(', ')});`
}

/** SQL that replaces the knowledge base with the handbook seed. */
export function knowledgeSeedSql(handbookMd: string): string[] {
  return [
    'DELETE FROM knowledge_entries;',
    ...parseHandbook(handbookMd).map((e) =>
      insert('knowledge_entries', {
        id: e.id,
        title: e.title,
        category: e.category,
        body: e.body,
        from_parent_question: 0,
        source_request_id: null,
        updated_at: e.updatedAt,
      }),
    ),
  ]
}

/** Full reset: empty every table, then insert the KB, parents and seed history (PLAN.md 2.2). */
export function buildSeedSql(handbookMd: string, now: Date = new Date()): string {
  const statements = [
    'DELETE FROM test_results;',
    'DELETE FROM messages;',
    'DELETE FROM requests;',
    'DELETE FROM parents;',
    ...knowledgeSeedSql(handbookMd),
    insert('parents', {
      id: DEMO_PARENT.id,
      name: DEMO_PARENT.name,
      child_name: DEMO_PARENT.childName,
      room: DEMO_PARENT.room,
      is_demo: 0,
      is_test: 0,
      created_at: easternTime(now, 30, '09:00'),
    }),
    ...HISTORY_PARENTS.map((p) =>
      insert('parents', {
        id: p.id,
        name: p.name,
        child_name: p.childName,
        room: p.room,
        is_demo: 0,
        is_test: 0,
        created_at: easternTime(now, 30, '09:00'),
      }),
    ),
    ...SEED_QUESTIONS.flatMap((q, i) => questionSql(q, i + 1, now)),
  ]
  return statements.join('\n') + '\n'
}

const ROUTE_BY_KIND: Record<SeedKind, Route> = {
  answered: 'answered',
  health: 'looped_in',
  staff_action: 'looped_in',
  sensitive: 'handed_off',
  uncovered: 'handed_off',
}

function questionSql(q: SeedQuestion, n: number, now: Date): string[] {
  const id = String(n).padStart(3, '0')
  const parent = HISTORY_PARENTS.find((p) => p.id === q.parentId)
  if (!parent) throw new Error(`Unknown seed parent ${q.parentId}`)

  const route = ROUTE_BY_KIND[q.kind]
  const askedAt = easternTime(now, q.daysAgo, q.time)
  const requestId = `seed-req-${id}`
  const messageId = `seed-msg-${id}-q`

  const statements = [
    insert('messages', {
      id: messageId,
      parent_id: q.parentId,
      role: 'parent',
      text: q.question,
      citations: null,
      staff_name: null,
      staff_role: null,
      request_id: requestId,
      is_test: 0,
      created_at: askedAt,
    }),
    insert('messages', {
      id: `seed-msg-${id}-ai`,
      parent_id: q.parentId,
      role: 'ai',
      text: q.answer ?? HANDED_OFF_ACK,
      citations: q.answer ? JSON.stringify(q.citations ?? []) : null,
      staff_name: null,
      staff_role: null,
      request_id: requestId,
      is_test: 0,
      created_at: addMinutes(askedAt, 0.1),
    }),
  ]

  const repliedAt = addMinutes(askedAt, 12 + ((n * 7) % 35))
  if (q.staffReply) {
    statements.push(
      insert('messages', {
        id: `seed-msg-${id}-staff`,
        parent_id: q.parentId,
        role: 'staff',
        text: q.staffReply,
        citations: null,
        staff_name: DIRECTOR.name,
        staff_role: DIRECTOR.role,
        request_id: requestId,
        is_test: 0,
        created_at: repliedAt,
      }),
    )
  }

  statements.push(
    insert('requests', {
      id: requestId,
      parent_id: q.parentId,
      message_id: messageId,
      route,
      reason: q.reason ?? reasonFor(q.kind, parent.childName),
      scores: JSON.stringify(scoresFor(q)),
      router: 'jev',
      suggested_role: suggestedRole(route, q.topic, q.kind === 'sensitive'),
      topic: q.topic,
      answerable: q.kind === 'uncovered' ? 0 : 1,
      status: q.staffReply ? 'replied' : 'new',
      forwarded_to: null,
      is_test: 0,
      created_at: askedAt,
      updated_at: q.staffReply ? repliedAt : askedAt,
    }),
  )
  return statements
}

function reasonFor(kind: SeedKind, childName: string): string {
  switch (kind) {
    case 'answered':
      return 'Covered by your policies'
    case 'health':
      return `About ${childName}'s health today`
    case 'staff_action':
      return 'Asks staff to do something'
    case 'sensitive':
      return 'Sensitive topic'
    case 'uncovered':
      return 'Not covered by your policies'
  }
}

/** Plausible router scores consistent with each kind's route (PLAN.md 3.3 thresholds). */
function scoresFor(q: SeedQuestion): RouteScores {
  return {
    topic: q.topic,
    is_urgent: 0.04,
    is_sensitive: q.kind === 'sensitive' ? 0.86 : 0.08,
    is_child_health_today: q.kind === 'health' ? 0.82 : 0.06,
    needs_staff_action: q.kind === 'staff_action' ? 0.78 : 0.14,
    answerable_from_kb: q.kind === 'uncovered' ? 0.12 : 0.91,
  }
}

/**
 * ISO timestamp for "daysAgo days before now at HH:MM Eastern". Uses a fixed
 * UTC-4 offset (EDT); an hour off in winter doesn't matter for seed data.
 */
export function easternTime(now: Date, daysAgo: number, time: string): string {
  const [hh, mm] = time.split(':').map(Number)
  const day = new Date(now.getTime() - daysAgo * 86_400_000)
  return new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hh + 4, mm),
  ).toISOString()
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}
