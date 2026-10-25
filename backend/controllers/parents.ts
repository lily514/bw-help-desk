import { Hono } from 'hono'
import { ROOMS, type Room } from '../../shared/types'
import type { Env } from '../env'
import { createDemoParent, getParent } from '../services/parents'

export const parents = new Hono<{ Bindings: Env }>()

parents.get('/:id', async (c) => c.json(await getParent(c.env.DB, c.req.param('id'))))

/** POST /api/parents { name, childName, room, isTest? } — a demo parent. */
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

  const parent = await createDemoParent(c.env.DB, {
    name,
    childName,
    room,
    isTest: body.isTest === true,
  })
  return c.json(parent, 201)
})
