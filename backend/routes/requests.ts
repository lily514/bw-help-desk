import { Hono } from 'hono'
import type { Env } from '../env'
import { escalateToPerson, getRequestRow, toThreadRequest } from '../lib/db'

export const requests = new Hono<{ Bindings: Env }>()

/** POST /api/requests/:id/ask-person — no-op if the request is already with a person. */
requests.post('/:id/ask-person', async (c) => {
  const id = c.req.param('id')
  if (!(await getRequestRow(c.env.DB, id))) return c.json({ error: 'Request not found' }, 404)
  await escalateToPerson(c.env.DB, id)
  return c.json(toThreadRequest((await getRequestRow(c.env.DB, id))!))
})
