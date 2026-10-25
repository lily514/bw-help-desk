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

knowledge.get('/', async (c) => c.json(await listEntries(c.env.DB)))

knowledge.get('/:id', async (c) => c.json(await getEntryDetail(c.env.DB, c.req.param('id'))))

knowledge.post('/', async (c) => {
  const raw = await c.req.json<Record<string, unknown>>()
  const input = parseInput(raw)
  if (!input) return c.json(INVALID_ENTRY, 400)

  const entry = await createEntry(c.env.DB, input, {
    fromParentQuestion: raw.fromParentQuestion === true,
    sourceRequestId: typeof raw.sourceRequestId === 'string' ? raw.sourceRequestId : null,
  })
  return c.json(entry, 201)
})

knowledge.put('/:id', async (c) => {
  const input = parseInput(await c.req.json<Record<string, unknown>>())
  if (!input) return c.json(INVALID_ENTRY, 400)
  return c.json(await updateEntry(c.env.DB, c.req.param('id'), input))
})
