import type { KnowledgeEntry } from './types'

/** An entry's full text as the AI and parents see it: the body, then each addition as a paragraph. */
export function entryText(e: Pick<KnowledgeEntry, 'body' | 'additions'>): string {
  return [e.body.trimEnd(), ...e.additions.map((a) => a.text.trim())].join('\n\n')
}
