import { Hono } from 'hono'
import { CATEGORIES, type Category, type KnowledgeEntry } from '../../src/shared/types'
import type { Env } from '../env'
import { getKnowledge, insertKnowledge, listKnowledge, updateKnowledge } from '../lib/db'
import { slugify } from '../lib/slug'

export const kb = new Hono<{ Bindings: Env }>()

interface EntryInput {
  title: string
  category: Category
  body: string
}

function parseInput(raw: Record<string, unknown>): EntryInput | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const body = typeof raw.body === 'string' ? raw.body.trim() : ''
  const category = raw.category as Category
  if (!title || !body || !CATEGORIES.includes(category)) return null
  return { title, category, body }
}

kb.get('/', async (c) => c.json(await listKnowledge(c.env.DB)))

kb.get('/:id', async (c) => {
  const entry = await getKnowledge(c.env.DB, c.req.param('id'))
  return entry ? c.json(entry) : c.json({ error: 'Entry not found' }, 404)
})

/** New entries get ids like `program:do_you_offer_swim_lessons`, de-duplicated with a suffix. */
kb.post('/', async (c) => {
  const raw = await c.req.json<Record<string, unknown>>()
  const input = parseInput(raw)
  if (!input) return c.json({ error: 'title, body and a valid category are required' }, 400)

  const base = `${input.category.toLowerCase()}:${slugify(input.title)}`
  let id = base
  for (let n = 2; await getKnowledge(c.env.DB, id); n++) id = `${base}_${n}`

  const entry: KnowledgeEntry = {
    id,
    ...input,
    fromParentQuestion: raw.fromParentQuestion === true,
    sourceRequestId: typeof raw.sourceRequestId === 'string' ? raw.sourceRequestId : null,
    updatedAt: new Date().toISOString(),
  }
  await insertKnowledge(c.env.DB, entry)
  return c.json(entry, 201)
})

kb.put('/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await getKnowledge(c.env.DB, id)
  if (!existing) return c.json({ error: 'Entry not found' }, 404)

  const input = parseInput(await c.req.json<Record<string, unknown>>())
  if (!input) return c.json({ error: 'title, body and a valid category are required' }, 400)

  const updatedAt = new Date().toISOString()
  await updateKnowledge(c.env.DB, id, { ...input, updatedAt })
  return c.json({ ...existing, ...input, updatedAt })
})
