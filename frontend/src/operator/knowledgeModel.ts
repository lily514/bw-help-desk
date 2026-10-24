import { CATEGORIES, type Category, type KnowledgeEntry } from '../../../shared/types'

const LIST_MARKER = /^\s*[-*] /
const TABLE_ROW = /^\s*\|.*\|\s*$/

/** One-line card preview: the first line of prose or list text, skipping tables. */
export function previewLine(body: string): string {
  const lines = body.split(/\r?\n/).filter((l) => l.trim())
  const line = lines.find((l) => !TABLE_ROW.test(l)) ?? lines[0] ?? ''
  return line.replace(LIST_MARKER, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Entries grouped in category order, each group sorted by title; empty categories dropped. */
export function groupByCategory(
  entries: KnowledgeEntry[],
): { category: Category; entries: KnowledgeEntry[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    entries: entries
      .filter((e) => e.category === category)
      .sort((a, b) => a.title.localeCompare(b.title)),
  })).filter((g) => g.entries.length > 0)
}

/** Route to an entry's editor; ids contain a colon, so encode them. */
export function entryPath(id: string): string {
  return `/operator/knowledge/${encodeURIComponent(id)}`
}
