/** Lowercase, underscore-separated slug, capped so ids stay readable: "Do you offer swim lessons?" → "do_you_offer_swim_lessons". */
export function slugify(text: string, maxLength = 40): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug.slice(0, maxLength).replace(/_+$/, '') || 'entry'
}
