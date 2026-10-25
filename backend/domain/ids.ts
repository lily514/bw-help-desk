import type { Category } from '../../shared/types'

/** Lowercase, underscore-separated, capped so ids stay readable; empty if nothing is left. */
function slugify(text: string, maxLength: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug.slice(0, maxLength).replace(/_+$/, '')
}

/**
 * Id for a new knowledge entry (PLAN.md 2.1): "Do you offer swim lessons?" in Program →
 * `program:do_you_offer_swim_lessons`. The caller adds `_2`, `_3`… if it's taken.
 */
export function entryIdBase(category: Category, title: string): string {
  return `${category.toLowerCase()}:${slugify(title, 40) || 'entry'}`
}

/** Id for an evaluator-created parent: `demo-sam_rivera-1a2b3c4d`. The suffix keeps names reusable. */
export function demoParentId(name: string, suffix: string): string {
  return `demo-${slugify(name, 24) || 'parent'}-${suffix}`
}
