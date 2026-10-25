import type { ThreadResponse } from '../../shared/types'
import { listMessages } from '../db/messages'
import { listThreadInquiries } from '../db/inquiries'
import { getParent } from './parents'

/**
 * The cursor handed back is a few seconds in the past, so a row written while
 * this poll was running is still picked up next time. Clients de-dupe by id.
 */
const CURSOR_OVERLAP_MS = 5_000

/** A parent's messages and inquiry statuses; with `since`, only what changed after it. */
export async function getThread(
  db: D1Database,
  parentId: string,
  since?: string,
): Promise<ThreadResponse> {
  await getParent(db, parentId)
  const serverTime = new Date(Date.now() - CURSOR_OVERLAP_MS).toISOString()
  const [messages, inquiries] = await Promise.all([
    listMessages(db, parentId, since),
    listThreadInquiries(db, parentId, since),
  ])
  return { messages, inquiries, serverTime }
}
