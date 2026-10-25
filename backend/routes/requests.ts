import { Hono } from 'hono'
import { DIRECTOR } from '../../shared/copy'
import type { KnowledgeEntry, Message, ReplyResult, SaveAs, StaffRole } from '../../shared/types'
import type { Env } from '../env'
import { getInboxItem } from '../db/inbox'
import { createEntryId, getKnowledge, insertKnowledge, updateKnowledge } from '../db/knowledge'
import { insertMessage } from '../db/messages'
import { escalateToPerson, getRequestRow, markSeen, setRequestStatus } from '../db/requests'
import { toThreadRequest } from '../db/rows'
import { getRequestDetail } from '../lib/inbox'

export const requests = new Hono<{ Bindings: Env }>()

const ROLES: StaffRole[] = ['Director', 'Office', 'Classroom teacher', 'Kitchen']
const MAX_REPLY_LENGTH = 2000

/** GET /api/requests/:id — detail for the operator (PLAN.md 4.4). */
requests.get('/:id', async (c) => {
  const detail = await getRequestDetail(c.env.DB, c.req.param('id'))
  return detail ? c.json(detail) : c.json({ error: 'Request not found' }, 404)
})

/** POST /api/requests/:id/ask-person — no-op if the request is already with a person. */
requests.post('/:id/ask-person', async (c) => {
  const id = c.req.param('id')
  if (!(await getRequestRow(c.env.DB, id))) return c.json({ error: 'Request not found' }, 404)
  await escalateToPerson(c.env.DB, id)
  return c.json(toThreadRequest((await getRequestRow(c.env.DB, id))!))
})

requests.post('/:id/seen', async (c) => {
  const id = c.req.param('id')
  await markSeen(c.env.DB, id)
  const item = await getInboxItem(c.env.DB, id)
  return item ? c.json(item) : c.json({ error: 'Request not found' }, 404)
})

/** Forwarding only updates the status and the parent's card; nobody is notified. */
requests.post('/:id/forward', async (c) => {
  const id = c.req.param('id')
  const { role } = await c.req.json<{ role?: StaffRole }>()
  if (!role || !ROLES.includes(role)) return c.json({ error: 'A valid role is required' }, 400)

  const row = await getRequestRow(c.env.DB, id)
  if (!row) return c.json({ error: 'Request not found' }, 404)
  // A forward after a reply keeps the request Replied but records who it went to.
  await setRequestStatus(c.env.DB, id, row.status === 'replied' ? 'replied' : 'forwarded', role)
  return c.json(await getInboxItem(c.env.DB, id))
})

/**
 * POST /api/requests/:id/reply — appends Dana's reply to the parent's thread and,
 * optionally, saves it as knowledge so the AI can answer it next time.
 */
requests.post('/:id/reply', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json<{ text?: unknown; saveAs?: SaveAs }>()
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text || text.length > MAX_REPLY_LENGTH) {
    return c.json({ error: `A reply of 1–${MAX_REPLY_LENGTH} characters is required` }, 400)
  }

  const row = await getRequestRow(db, id)
  const item = row && (await getInboxItem(db, id))
  if (!row || !item) return c.json({ error: 'Request not found' }, 404)

  const now = new Date().toISOString()
  let savedEntry: KnowledgeEntry | null = null
  if (body.saveAs && 'entryId' in body.saveAs) {
    const entry = await getKnowledge(db, body.saveAs.entryId)
    if (!entry) return c.json({ error: 'Knowledge entry not found' }, 404)
    savedEntry = { ...entry, body: `${entry.body.trimEnd()}\n\n${text}`, updatedAt: now }
    await updateKnowledge(db, entry.id, savedEntry)
  } else if (body.saveAs && 'create' in body.saveAs) {
    const title = item.text.length > 120 ? `${item.text.slice(0, 117)}...` : item.text
    savedEntry = {
      id: await createEntryId(db, row.topic as KnowledgeEntry['category'], title),
      title,
      category: row.topic as KnowledgeEntry['category'],
      body: text,
      fromParentQuestion: true,
      sourceRequestId: id,
      updatedAt: now,
    }
    await insertKnowledge(db, savedEntry)
  }

  const message: Message = {
    id: crypto.randomUUID(),
    parentId: row.parent_id,
    role: 'staff',
    text,
    citations: [],
    staffName: DIRECTOR.name,
    staffRole: DIRECTOR.role,
    requestId: id,
    isTest: row.is_test === 1,
    createdAt: now,
  }
  await insertMessage(db, message)
  await setRequestStatus(db, id, 'replied')

  const result: ReplyResult = { request: (await getInboxItem(db, id))!, message, savedEntry }
  return c.json(result)
})
