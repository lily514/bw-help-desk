import type { Parent, Room } from '../../shared/types'
import * as parents from '../db/parents'
import { demoParentId } from '../domain/ids'
import { NotFoundError } from './errors'

export async function getParent(db: D1Database, id: string): Promise<Parent> {
  const parent = await parents.getParent(db, id)
  if (!parent) throw new NotFoundError('Parent not found')
  return parent
}

/**
 * Evaluators create their own demo parent (is_demo = 1, cleared on Reset). Test mode
 * creates its scripted parents with `isTest`, so their requests are excluded from Insights.
 */
export async function createDemoParent(
  db: D1Database,
  input: { name: string; childName: string; room: Room; isTest: boolean },
): Promise<Parent> {
  const parent: Parent = {
    id: demoParentId(input.name, crypto.randomUUID().slice(0, 8)),
    name: input.name.slice(0, 80),
    childName: input.childName.slice(0, 40),
    room: input.room,
    isDemo: true,
    isTest: input.isTest,
    createdAt: new Date().toISOString(),
  }
  await parents.insertParent(db, parent)
  return parent
}
