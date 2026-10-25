import type { Parent } from '../../shared/types'
import { toParent, type ParentRow } from './rows'

export async function getParent(db: D1Database, id: string): Promise<Parent | null> {
  const row = await db.prepare('SELECT * FROM parents WHERE id = ?').bind(id).first<ParentRow>()
  return row ? toParent(row) : null
}

export async function insertParent(db: D1Database, p: Parent): Promise<void> {
  await db
    .prepare(
      `INSERT INTO parents (id, name, child_name, room, is_demo, is_test, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(p.id, p.name, p.childName, p.room, p.isDemo ? 1 : 0, p.isTest ? 1 : 0, p.createdAt)
    .run()
}
