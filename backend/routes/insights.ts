import { Hono } from 'hono'
import type { Category, Route } from '../../shared/types'
import type { Env } from '../env'
import { INSIGHTS_DAYS, summarizeInsights } from '../domain/insights'

export const insights = new Hono<{ Bindings: Env }>()

/** GET /api/insights — the last 7 days, test conversations excluded. */
insights.get('/', async (c) => {
  const since = new Date(Date.now() - INSIGHTS_DAYS * 86_400_000).toISOString()
  const [{ results: rows }, { results: titles }] = await Promise.all([
    c.env.DB.prepare(
      `SELECT r.route, r.topic, r.answerable, r.created_at, m.text
       FROM requests r JOIN messages m ON m.id = r.message_id
       WHERE r.is_test = 0 AND r.created_at >= ?`,
    )
      .bind(since)
      .all<{
        route: string
        topic: string
        answerable: number
        created_at: string
        text: string
      }>(),
    c.env.DB.prepare('SELECT title FROM knowledge_entries').all<{ title: string }>(),
  ])

  return c.json(
    summarizeInsights(
      rows.map((r) => ({
        route: r.route as Route,
        topic: r.topic as Category,
        answerable: r.answerable === 1,
        text: r.text,
        createdAt: r.created_at,
      })),
      titles.map((t) => t.title),
    ),
  )
})
