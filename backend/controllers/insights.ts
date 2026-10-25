import { Hono } from 'hono'
import type { Env } from '../env'
import { getInsights } from '../services/insights'

export const insights = new Hono<{ Bindings: Env }>()

/** GET /api/insights — the last 7 days, test conversations excluded. */
insights.get('/', async (c) => c.json(await getInsights(c.env.DB)))
