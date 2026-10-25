import type { Category, Insights, Route } from '../../shared/types'

export const INSIGHTS_DAYS = 7

/** One non-test inquiry in the window, with the parent's question. */
export interface InsightQuestion {
  route: Route
  topic: Category
  answerable: boolean
  text: string
  createdAt: string
}

/** "Do you offer swim lessons?" and "do you offer swim lessons" group together. */
export function questionKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Stat tiles, top topics and "Couldn't answer". An uncovered question drops off the list once
 * an entry is titled with it, which is what "Add answer" and "Create a new entry" both do.
 */
export function summarizeInsights(rows: InsightQuestion[], kbTitles: string[]): Insights {
  const total = rows.length
  const answered = rows.filter((r) => r.route === 'answered').length
  const answeredByAiPct = total ? Math.round((answered / total) * 100) : 0

  const topicCounts = new Map<Category, number>()
  for (const r of rows) topicCounts.set(r.topic, (topicCounts.get(r.topic) ?? 0) + 1)
  const topTopics = [...topicCounts]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))

  const covered = new Set(kbTitles.map(questionKey))
  const groups = new Map<
    string,
    { question: string; topic: Category; count: number; latest: string }
  >()
  for (const r of rows) {
    if (r.answerable) continue
    const key = questionKey(r.text)
    if (!key || covered.has(key)) continue
    const group = groups.get(key)
    if (!group) {
      groups.set(key, { question: r.text, topic: r.topic, count: 1, latest: r.createdAt })
    } else {
      group.count++
      // Show the most recent wording and topic.
      if (r.createdAt > group.latest)
        Object.assign(group, { question: r.text, topic: r.topic, latest: r.createdAt })
    }
  }
  const couldntAnswer = [...groups.values()]
    .sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest))
    .map(({ question, topic, count }) => ({ question, topic, count }))

  return {
    questionsAsked: total,
    answeredByAiPct,
    sentToPersonPct: total ? 100 - answeredByAiPct : 0,
    topTopics,
    couldntAnswer,
  }
}
