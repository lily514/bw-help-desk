import type { Category } from '../../shared/types'

const STOPWORDS = new Set(
  'a an and are as at be but by can could do does for from has have her his how i if in is it its me my of on or our she so that the their them they this to up was we what when where which who will with would you your'.split(
    ' ',
  ),
)

/** Lowercase content words, at least three letters, minus common filler. */
export function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  )
}

interface Candidate {
  id: string
  title: string
  category: Category
  body: string
}

/**
 * Default entry for "Add to existing entry" (PLAN.md 4.4): same topic, most
 * word overlap with the question. Falls back to all entries if none share the topic.
 */
export function bestMatchEntry(
  question: string,
  topic: Category,
  entries: Candidate[],
): string | null {
  const words = contentWords(question)
  const sameTopic = entries.filter((e) => e.category === topic)
  const pool = sameTopic.length ? sameTopic : entries

  let best: { id: string; score: number } | null = null
  for (const e of pool) {
    const entryWords = contentWords(`${e.title} ${e.body}`)
    let score = 0
    for (const w of words) if (entryWords.has(w)) score++
    if (!best || score > best.score) best = { id: e.id, score }
  }
  return best?.id ?? null
}
