import { Hono } from 'hono'
import { CATEGORIES, type Category } from '../../shared/types'
import type { Env } from '../env'
import {
  createEntry,
  getEntryDetail,
  listEntries,
  updateEntry,
  type EntryInput,
} from '../services/knowledge'

export const knowledge = new Hono<{ Bindings: Env }>()

function parseInput(raw: Record<string, unknown>): EntryInput | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const body = typeof raw.body === 'string' ? raw.body.trim() : ''
  const category = raw.category as Category
  if (!title || !body || !CATEGORIES.includes(category)) return null
  return { title, category, body }
}

const INVALID_ENTRY = { error: 'title, body and a valid category are required' }

/** PUT's optional `additions`: `{ id, text }[]` with non-empty text. Absent → undefined. */
function parseAdditions(raw: unknown): { id: string; text: string }[] | undefined | null {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw)) return null
  const additions: { id: string; text: string }[] = []
  for (const a of raw as Record<string, unknown>[]) {
    const text = typeof a?.text === 'string' ? a.text.trim() : ''
    if (typeof a?.id !== 'string' || !text) return null
    additions.push({ id: a.id, text })
  }
  return additions
}

knowledge.get('/', async (c) => c.json(await listEntries(c.env.DB)))

knowledge.get('/:id', async (c) => c.json(await getEntryDetail(c.env.DB, c.req.param('id'))))

knowledge.post('/', async (c) => {
  const input = parseInput(await c.req.json<Record<string, unknown>>())
  if (!input) return c.json(INVALID_ENTRY, 400)
  return c.json(await createEntry(c.env.DB, input), 201)
})

knowledge.put('/:id', async (c) => {
  const raw = await c.req.json<Record<string, unknown>>()
  const input = parseInput(raw)
  if (!input) return c.json(INVALID_ENTRY, 400)
  const additions = parseAdditions(raw.additions)
  if (additions === null) return c.json({ error: 'each addition needs an id and text' }, 400)
  return c.json(await updateEntry(c.env.DB, c.req.param('id'), input, additions))
})
