import { Hono } from 'hono'
import type { Env } from '../env'
import { getThread } from '../services/thread'

export const thread = new Hono<{ Bindings: Env }>()

/** GET /api/thread/:parentId?since= — polled every 2 seconds by the parent app. */
thread.get('/:parentId', async (c) =>
  c.json(await getThread(c.env.DB, c.req.param('parentId'), c.req.query('since') || undefined)),
)
