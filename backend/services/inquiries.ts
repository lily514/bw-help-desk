import { DIRECTOR, HANDED_OFF_ACK, URGENT_ACK } from '../../shared/copy'
import type {
  Category,
  InboxItem,
  Message,
  ReplyResult,
  InquiryDetail,
  RouterName,
  SaveAs,
  StaffRole,
  ThreadInquiry,
} from '../../shared/types'
import * as inbox from '../db/inbox'
import { listKnowledge } from '../db/knowledge'
import { insertMessage, listInquiryMessages } from '../db/messages'
import * as inquiries from '../db/inquiries'
import { parseScores, toInboxItem, toThreadInquiry } from '../db/rows'
import { suggestEntry } from '../domain/entrySuggestion'
import { NotFoundError } from './errors'
import { saveReplyAsAnswer } from './knowledge'

const ACKNOWLEDGEMENTS = new Set([HANDED_OFF_ACK, URGENT_ACK])

export const listInbox = inbox.listInbox

async function getInboxItem(db: D1Database, id: string): Promise<InboxItem> {
  const item = await inbox.getInboxItem(db, id)
  if (!item) throw new NotFoundError('Inquiry not found')
  return item
}

async function getInquiryRow(db: D1Database, id: string) {
  const row = await inquiries.getInquiryRow(db, id)
  if (!row) throw new NotFoundError('Inquiry not found')
  return row
}

/** Everything the operator's detail pane shows for one inquiry (PLAN.md 4.4). */
export async function getInquiryDetail(db: D1Database, id: string): Promise<InquiryDetail> {
  const row = await inbox.getInboxRow(db, id)
  if (!row) throw new NotFoundError('Inquiry not found')

  const [thread, earlier, kb] = await Promise.all([
    listInquiryMessages(db, id),
    inquiries.getEarlierQuestion(db, row.parent_id, row.created_at),
    listKnowledge(db),
  ])
  const answer = thread.find((m) => m.role === 'ai' && !ACKNOWLEDGEMENTS.has(m.text))

  return {
    inquiry: {
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
    suggestedEntryId: suggestEntry(row.text, row.topic as Category, kb),
  }
}

/** "Ask a person" under an AI answer; a no-op if the inquiry is already with a person. */
export async function askPerson(db: D1Database, id: string): Promise<ThreadInquiry> {
  await getInquiryRow(db, id)
  await inquiries.escalateToPerson(db, id)
  return toThreadInquiry(await getInquiryRow(db, id))
}

/** Opening an item in the inbox. */
export async function markSeen(db: D1Database, id: string): Promise<InboxItem> {
  await inquiries.markSeen(db, id)
  return getInboxItem(db, id)
}

/** Forwarding only updates the status and the parent's card; nobody is notified. */
export async function forward(db: D1Database, id: string, role: StaffRole): Promise<InboxItem> {
  const row = await getInquiryRow(db, id)
  // A forward after a reply keeps the inquiry Replied but records who it went to.
  await inquiries.setInquiryStatus(db, id, row.status === 'replied' ? 'replied' : 'forwarded', role)
  return getInboxItem(db, id)
}

/**
 * Appends Dana's reply to the parent's thread and, optionally, saves it as
 * knowledge so the AI can answer the question next time.
 */
export async function reply(
  db: D1Database,
  id: string,
  text: string,
  saveAs?: SaveAs,
): Promise<ReplyResult> {
  const row = await getInquiryRow(db, id)
  const item = await getInboxItem(db, id)

  const now = new Date().toISOString()
  const savedEntry = saveAs
    ? await saveReplyAsAnswer(db, saveAs, {
        text,
        question: item.text,
        topic: row.topic as Category,
        inquiryId: id,
        now,
      })
    : null

  const message: Message = {
    id: crypto.randomUUID(),
    parentId: row.parent_id,
    role: 'staff',
    text,
    citations: [],
    staffName: DIRECTOR.name,
    staffRole: DIRECTOR.role,
    inquiryId: id,
    isTest: row.is_test === 1,
    createdAt: now,
  }
  await insertMessage(db, message)
  await inquiries.setInquiryStatus(db, id, 'replied')

  return { inquiry: await getInboxItem(db, id), message, savedEntry }
}
