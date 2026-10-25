import { Hono } from 'hono'
import type { SaveAs, StaffRole } from '../../shared/types'
import type { Env } from '../env'
import { askPerson, forward, getRequestDetail, markSeen, reply } from '../services/requests'

export const requests = new Hono<{ Bindings: Env }>()

const ROLES: StaffRole[] = ['Director', 'Office', 'Classroom teacher', 'Kitchen']
const MAX_REPLY_LENGTH = 2000

/** GET /api/requests/:id — detail for the operator (PLAN.md 4.4). */
requests.get('/:id', async (c) => c.json(await getRequestDetail(c.env.DB, c.req.param('id'))))

/** POST /api/requests/:id/ask-person — "Ask a person" under an AI answer. */
requests.post('/:id/ask-person', async (c) => c.json(await askPerson(c.env.DB, c.req.param('id'))))

requests.post('/:id/seen', async (c) => c.json(await markSeen(c.env.DB, c.req.param('id'))))

requests.post('/:id/forward', async (c) => {
  const { role } = await c.req.json<{ role?: StaffRole }>()
  if (!role || !ROLES.includes(role)) return c.json({ error: 'A valid role is required' }, 400)
  return c.json(await forward(c.env.DB, c.req.param('id'), role))
})

/** POST /api/requests/:id/reply { text, saveAs? } — Dana's reply, optionally saved as knowledge. */
requests.post('/:id/reply', async (c) => {
  const body = await c.req.json<{ text?: unknown; saveAs?: SaveAs }>()
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text || text.length > MAX_REPLY_LENGTH) {
    return c.json({ error: `A reply of 1–${MAX_REPLY_LENGTH} characters is required` }, 400)
  }
  return c.json(await reply(c.env.DB, c.req.param('id'), text, body.saveAs))
})
