import { Hono } from 'hono'
import type { ThreadResponse } from '../../shared/types'
import type { Env } from '../env'
import { getParent, listMessages, listThreadRequests } from '../lib/db'

export const thread = new Hono<{ Bindings: Env }>()

/**
 * The cursor handed back is a few seconds in the past, so a row written while
 * this poll was running is still picked up next time. Clients de-dupe by id.
 */
const CURSOR_OVERLAP_MS = 5_000

/** GET /api/thread/:parentId?since= — polled every 2 seconds by the parent app. */
thread.get('/:parentId', async (c) => {
  const db = c.env.DB
  const parentId = c.req.param('parentId')
  if (!(await getParent(db, parentId))) return c.json({ error: 'Parent not found' }, 404)

  const since = c.req.query('since') || undefined
  const serverTime = new Date(Date.now() - CURSOR_OVERLAP_MS).toISOString()
  const [messages, requests] = await Promise.all([
    listMessages(db, parentId, since),
    listThreadRequests(db, parentId, since),
  ])

  const response: ThreadResponse = { messages, requests, serverTime }
  return c.json(response)
})
