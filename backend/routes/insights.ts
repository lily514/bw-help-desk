import { Hono } from 'hono'
import { listKnowledgeTitles } from '../db/knowledge'
import { listInsightRows } from '../db/requests'
import type { Env } from '../env'
import { INSIGHTS_DAYS, summarizeInsights } from '../domain/insights'

export const insights = new Hono<{ Bindings: Env }>()

/** GET /api/insights — the last 7 days, test conversations excluded. */
insights.get('/', async (c) => {
  const since = new Date(Date.now() - INSIGHTS_DAYS * 86_400_000).toISOString()
  const [rows, titles] = await Promise.all([
    listInsightRows(c.env.DB, since),
    listKnowledgeTitles(c.env.DB),
  ])
  return c.json(summarizeInsights(rows, titles))
})
