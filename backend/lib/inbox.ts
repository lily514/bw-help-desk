import { HANDED_OFF_ACK, URGENT_ACK } from '../../shared/copy'
import type { Category, RequestDetail, RouterName } from '../../shared/types'
import { getInboxRow } from '../db/inbox'
import { listKnowledge } from '../db/knowledge'
import { listRequestMessages } from '../db/messages'
import { getEarlierQuestion } from '../db/requests'
import { parseScores, toInboxItem } from '../db/rows'
import { bestMatchEntry } from '../domain/match'

const ACKNOWLEDGEMENTS = new Set([HANDED_OFF_ACK, URGENT_ACK])

export async function getRequestDetail(db: D1Database, id: string): Promise<RequestDetail | null> {
  const row = await getInboxRow(db, id)
  if (!row) return null

  const [thread, earlier, kb] = await Promise.all([
    listRequestMessages(db, id),
    getEarlierQuestion(db, row.parent_id, row.created_at),
    listKnowledge(db),
  ])
  const answer = thread.find((m) => m.role === 'ai' && !ACKNOWLEDGEMENTS.has(m.text))

  return {
    request: {
      ...toInboxItem(row),
      reason: row.reason,
      scores: parseScores(row.scores),
      router: row.router as RouterName,
      topic: row.topic as Category,
      answerable: row.answerable === 1,
    },
    earlier,
    aiAnswer: answer ? { text: answer.text, citations: answer.citations } : null,
    replies: thread.filter((m) => m.role === 'staff'),
    knowledge: kb.map(({ id, title, category }) => ({ id, title, category })),
    bestMatchId: bestMatchEntry(row.text, row.topic as Category, kb),
  }
}
