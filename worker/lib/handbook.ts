import type { Category, KnowledgeEntry } from '../../src/shared/types'

/** Handbook id prefix → operator-facing category (PLAN.md 2.1). */
const CATEGORY_BY_PREFIX: Record<string, Category> = {
  center: 'Policies',
  policy: 'Policies',
  ratios: 'Policies',
  hours: 'Hours',
  fees: 'Fees',
  health: 'Health',
  meals: 'Meals',
  pickup: 'Pickup',
  enroll: 'Program',
  daily: 'Program',
  program: 'Program',
}

export function categoryForId(id: string): Category {
  const category = CATEGORY_BY_PREFIX[id.split(':')[0]]
  if (!category) throw new Error(`No category mapping for handbook id "${id}"`)
  return category
}

const HEADING = /^## \[([a-z_]+:[a-z_]+)\] (.+?) \(updated (\d{4}-\d{2}-\d{2})\)\s*$/

/**
 * Parse `## [id] Title (updated YYYY-MM-DD)` sections into knowledge entries.
 * The body is everything up to the next `## ` heading. Dates become noon UTC
 * so they display as the same calendar day in US time zones.
 */
export function parseHandbook(markdown: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = []
  let current: { entry: KnowledgeEntry; lines: string[] } | null = null

  const flush = () => {
    if (!current) return
    current.entry.body = current.lines.join('\n').trim()
    entries.push(current.entry)
    current = null
  }

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      flush()
      const match = HEADING.exec(line)
      if (!match) throw new Error(`Malformed handbook heading: ${line}`)
      const [, id, title, date] = match
      current = {
        entry: {
          id,
          title,
          category: categoryForId(id),
          body: '',
          fromParentQuestion: false,
          sourceRequestId: null,
          updatedAt: `${date}T12:00:00.000Z`,
        },
        lines: [],
      }
    } else if (current) {
      current.lines.push(line)
    }
  }
  flush()

  return entries
}
