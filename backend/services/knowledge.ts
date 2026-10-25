import type { Category, KnowledgeEntry, KnowledgeEntryDetail, SaveAs } from '../../shared/types'
import * as knowledge from '../db/knowledge'
import { entryIdBase } from '../domain/ids'
import { NotFoundError } from './errors'

export interface EntryInput {
  title: string
  category: Category
  body: string
}

export const listEntries = knowledge.listKnowledge

/** An entry plus, for one saved from a reply, the name of the parent who asked. */
export async function getEntryDetail(db: D1Database, id: string): Promise<KnowledgeEntryDetail> {
  const entry = await knowledge.getKnowledge(db, id)
  if (!entry) throw new NotFoundError('Entry not found')
  const sourceParentName = entry.sourceInquiryId
    ? await knowledge.getSourceParentName(db, entry.sourceInquiryId)
    : null
  return { ...entry, sourceParentName }
}

export async function createEntry(
  db: D1Database,
  input: EntryInput,
  source: { fromParentQuestion: boolean; sourceInquiryId: string | null },
): Promise<KnowledgeEntry> {
  const entry: KnowledgeEntry = {
    id: await createEntryId(db, input.category, input.title),
    ...input,
    ...source,
    updatedAt: new Date().toISOString(),
  }
  await knowledge.insertKnowledge(db, entry)
  return entry
}

/** Saving bumps `updated_at`; the next chat call uses the new text automatically. */
export async function updateEntry(
  db: D1Database,
  id: string,
  input: EntryInput,
): Promise<KnowledgeEntry> {
  const existing = await knowledge.getKnowledge(db, id)
  if (!existing) throw new NotFoundError('Entry not found')
  const updatedAt = new Date().toISOString()
  await knowledge.updateKnowledge(db, id, { ...input, updatedAt })
  return { ...existing, ...input, updatedAt }
}

/**
 * "Save as answer" on Dana's reply (PLAN.md 4.4): append it to an existing entry as a
 * new paragraph, or create an entry titled with the parent's question.
 */
export async function saveReplyAsAnswer(
  db: D1Database,
  saveAs: SaveAs,
  reply: { text: string; question: string; topic: Category; inquiryId: string; now: string },
): Promise<KnowledgeEntry | null> {
  if ('entryId' in saveAs) {
    const entry = await knowledge.getKnowledge(db, saveAs.entryId)
    if (!entry) throw new NotFoundError('Knowledge entry not found')
    const updated = {
      ...entry,
      body: `${entry.body.trimEnd()}\n\n${reply.text}`,
      updatedAt: reply.now,
    }
    await knowledge.updateKnowledge(db, entry.id, updated)
    return updated
  }

  if (!('create' in saveAs)) return null
  const { question } = reply
  const title = question.length > 120 ? `${question.slice(0, 117)}...` : question
  const entry: KnowledgeEntry = {
    id: await createEntryId(db, reply.topic, title),
    title,
    category: reply.topic,
    body: reply.text,
    fromParentQuestion: true,
    sourceInquiryId: reply.inquiryId,
    updatedAt: reply.now,
  }
  await knowledge.insertKnowledge(db, entry)
  return entry
}

/** `entryIdBase`, de-duplicated with a suffix. */
async function createEntryId(db: D1Database, category: Category, title: string): Promise<string> {
  const base = entryIdBase(category, title)
  let id = base
  for (let n = 2; await knowledge.getKnowledge(db, id); n++) id = `${base}_${n}`
  return id
}
