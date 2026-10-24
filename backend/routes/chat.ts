import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { ChatEvent, Message, Route } from '../../shared/types'
import type { Env } from '../env'
import { streamAnswer } from '../lib/answer'
import { HANDED_OFF_ACK, URGENT_ACK } from '../lib/copy'
import {
  getParent,
  insertMessage,
  insertRequest,
  listKnowledge,
  listMessages,
  markRequestHandedOff,
  type NewRequest,
} from '../lib/db'
import { decide } from '../lib/decide'
import { routeQuestion, type RouteInput } from '../lib/router'

export const chat = new Hono<{ Bindings: Env }>()

const MAX_QUESTION_LENGTH = 1000

/**
 * POST /api/chat → SSE (PLAN.md 3.1): save the question, route it, tell the UI
 * the route, then stream an answer (answered, looped in) or send a fixed
 * acknowledgement (handed off, urgent). Any failure becomes a hand-off; the
 * parent never sees a raw error.
 */
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

  const db = c.env.DB
  const parent = await getParent(db, body.parentId)
  if (!parent) return c.json({ error: 'Parent not found' }, 404)

  const isTest = body.isTest === true || parent.isTest
  const [kb, history] = await Promise.all([listKnowledge(db), listMessages(db, parent.id)])
  const requestId = crypto.randomUUID()

  const question: Message = {
    id: crypto.randomUUID(),
    parentId: parent.id,
    role: 'parent',
    text,
    citations: [],
    staffName: null,
    staffRole: null,
    requestId,
    isTest,
    createdAt: new Date().toISOString(),
  }
  await insertMessage(db, question)

  return streamSSE(c, async (stream) => {
    const send = (e: ChatEvent) => stream.writeSSE({ event: e.event, data: JSON.stringify(e.data) })
    await send({ event: 'user', data: { message: question } })

    const now = new Date()
    const request: NewRequest = {
      id: requestId,
      parentId: parent.id,
      messageId: question.id,
      isTest,
      createdAt: new Date().toISOString(),
      ...(await routeOrHandOff(c.env, { parent, question: text, kb, history, now })),
    }
    await insertRequest(db, request)
    let route: Route = request.route
    await send({ event: 'route', data: { requestId, route, status: 'new' } })

    let answer = {
      text: route === 'urgent' ? URGENT_ACK : HANDED_OFF_ACK,
      citations: [] as string[],
    }
    if (route === 'answered' || route === 'looped_in') {
      try {
        answer = await streamAnswer(
          c.env,
          { parent, kb, now, question: text, history, loopedIn: route === 'looped_in' },
          (delta) => send({ event: 'delta', data: { text: delta } }),
        )
      } catch (err) {
        console.error('answer failed', err)
        route = 'handed_off'
        await markRequestHandedOff(db, requestId, 'The assistant could not answer')
        await send({ event: 'route', data: { requestId, route, status: 'new' } })
      }
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

/** Router + decision, or a hand-off if routing fails (PLAN.md 3.1 step 7). */
async function routeOrHandOff(
  env: Env,
  input: RouteInput,
): Promise<Omit<NewRequest, 'id' | 'parentId' | 'messageId' | 'isTest' | 'createdAt'>> {
  try {
    const { scores, router } = await routeQuestion(env, input)
    const decision = decide(scores, input.parent.childName)
    return {
      route: decision.route,
      reason: decision.reason,
      suggestedRole: decision.suggestedRole,
      answerable: decision.answerable,
      topic: scores.topic,
      scores,
      router,
    }
  } catch (err) {
    console.error('routing failed', err)
    return {
      route: 'handed_off',
      reason: 'The assistant could not route this',
      suggestedRole: 'Director',
      answerable: true,
      topic: 'Policies',
      scores: null,
      router: 'error',
    }
  }
}
