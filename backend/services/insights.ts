import type { Insights } from '../../shared/types'
import { listKnowledgeTitles } from '../db/knowledge'
import { listInsightRows } from '../db/inquiries'
import { INSIGHTS_DAYS, summarizeInsights } from '../domain/insights'

/** The last 7 days, test conversations excluded. */
export async function getInsights(db: D1Database): Promise<Insights> {
  const since = new Date(Date.now() - INSIGHTS_DAYS * 86_400_000).toISOString()
  const [rows, titles] = await Promise.all([listInsightRows(db, since), listKnowledgeTitles(db)])
  return summarizeInsights(rows, titles)
}
