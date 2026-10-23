import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { ChatEvent, Message } from '../../shared/types'
import type { Env } from '../env'
import { streamAnswer } from '../lib/answer'
import { HANDED_OFF_ACK } from '../lib/copy'
import { getParent, insertMessage, listKnowledge, listMessages } from '../lib/db'

export const chat = new Hono<{ Bindings: Env }>()

const MAX_QUESTION_LENGTH = 1000

/**
 * POST /api/chat → SSE (PLAN.md 3.1). Phase 2: every question is answered by
 * the model; routing arrives in Phase 3. Any model failure becomes the
 * hand-off acknowledgement, never a raw error.
 */
chat.post('/', async (c) => {
  const body = await c.req.json<{ parentId?: unknown; text?: unknown; isTest?: unknown }>()
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (typeof body.parentId !== 'string' || !text || text.length > MAX_QUESTION_LENGTH) {
    return c.json({ error: `parentId and text (1–${MAX_QUESTION_LENGTH} chars) are required` }, 400)
  }

  const db = c.env.DB
  const parent = await getParent(db, body.parentId)
  if (!parent) return c.json({ error: 'Parent not found' }, 404)

  const isTest = body.isTest === true || parent.isTest
  const [kb, history] = await Promise.all([listKnowledge(db), listMessages(db, parent.id)])

  const question: Message = {
    id: crypto.randomUUID(),
    parentId: parent.id,
    role: 'parent',
    text,
    citations: [],
    staffName: null,
    staffRole: null,
    requestId: null,
    isTest,
    createdAt: new Date().toISOString(),
  }
  await insertMessage(db, question)

  return streamSSE(c, async (stream) => {
    const send = (e: ChatEvent) => stream.writeSSE({ event: e.event, data: JSON.stringify(e.data) })

    await send({ event: 'user', data: { message: question } })

    let answer: { text: string; citations: string[] }
    try {
      answer = await streamAnswer(
        c.env,
        { parent, kb, now: new Date(), question: text, history },
        (delta) => send({ event: 'delta', data: { text: delta } }),
      )
    } catch (err) {
      console.error('answer failed', err)
      answer = { text: HANDED_OFF_ACK, citations: [] }
    }

    const reply: Message = {
      ...question,
      id: crypto.randomUUID(),
      role: 'ai',
      text: answer.text,
      citations: answer.citations,
      createdAt: new Date().toISOString(),
    }
    await insertMessage(db, reply)
    await send({ event: 'done', data: { message: reply, citations: reply.citations } })
  })
})
