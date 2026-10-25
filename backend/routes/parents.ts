import { Hono } from 'hono'
import { ROOMS, type Parent, type Room } from '../../shared/types'
import type { Env } from '../env'
import { getParent, insertParent } from '../lib/db'
import { slugify } from '../domain/slug'

export const parents = new Hono<{ Bindings: Env }>()

parents.get('/:id', async (c) => {
  const parent = await getParent(c.env.DB, c.req.param('id'))
  return parent ? c.json(parent) : c.json({ error: 'Parent not found' }, 404)
})

/**
 * Evaluators create their own demo parent (is_demo = 1, cleared on Reset). Test mode
 * creates its scripted parents with `isTest`, so their requests are excluded from Insights.
 */
parents.post('/', async (c) => {
  const body = await c.req.json<{
    name?: unknown
    childName?: unknown
    room?: unknown
    isTest?: unknown
  }>()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const childName = typeof body.childName === 'string' ? body.childName.trim() : ''
  const room = body.room as Room

  if (!name || !childName || !ROOMS.includes(room)) {
    return c.json({ error: 'name, childName and a valid room are required' }, 400)
  }

  const parent: Parent = {
    id: `demo-${slugify(name, 24)}-${crypto.randomUUID().slice(0, 8)}`,
    name: name.slice(0, 80),
    childName: childName.slice(0, 40),
    room,
    isDemo: true,
    isTest: body.isTest === true,
    createdAt: new Date().toISOString(),
  }
  await insertParent(c.env.DB, parent)
  return c.json(parent, 201)
})
