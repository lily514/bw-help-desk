import { entryText } from '../../shared/knowledge'
import type { KnowledgeEntry } from '../../shared/types'

// Pieces of the model prompts shared by the answerer (answer.ts) and the router (router.ts).

/** The time zone for the Maple Grove Early Learning Center; NOT central time */
export const CENTER_TIME_ZONE = 'America/Indiana/Indianapolis'

/**
 * One knowledge entry as the models see it: `[id] Title (Category, updated date)`, then the
 * body and Dana's saved additions as plain paragraphs.
 */
export function formatEntry(e: KnowledgeEntry): string {
  return `[${e.id}] ${e.title} (${e.category}, updated ${e.updatedAt.slice(0, 10)})\n${entryText(e)}`
}
