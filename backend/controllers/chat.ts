import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { Env } from '../env'
import { answerQuestion, saveQuestion } from '../services/chat'

export const chat = new Hono<{ Bindings: Env }>()

const MAX_QUESTION_LENGTH = 1000

/** POST /api/chat → SSE (PLAN.md 3.1). The pipeline lives in services/chat.ts. */
chat.post('/', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  const { success } = await c.env.CHAT_LIMITER.limit({ key: ip })
  if (!success) {
    return c.json({ error: "You're sending messages quickly. Please wait a minute." }, 429)
  }

  const body = await c.req.json<{ parentId?: unknown; text?: unknown; isTest?: unknown }>()
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (typeof body.parentId !== 'string' || !text || text.length > MAX_QUESTION_LENGTH) {
    return c.json({ error: `parentId and text (1–${MAX_QUESTION_LENGTH} chars) are required` }, 400)
  }

  const question = await saveQuestion(c.env.DB, {
    parentId: body.parentId,
    text,
    isTest: body.isTest === true,
  })
  return streamSSE(c, (stream) =>
    answerQuestion(c.env, question, (e) =>
      stream.writeSSE({ event: e.event, data: JSON.stringify(e.data) }),
    ),
  )
})
