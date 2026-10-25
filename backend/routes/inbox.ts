import { Hono } from 'hono'
import type { Env } from '../env'
import { listInbox } from '../db/inbox'

export const inbox = new Hono<{ Bindings: Env }>()

/** GET /api/inbox — polled every 2 seconds by the operator app. */
inbox.get('/', async (c) => c.json(await listInbox(c.env.DB)))
