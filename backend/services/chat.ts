import { HANDED_OFF_ACK, URGENT_ACK } from '../../shared/copy'
import type { ChatEvent, KnowledgeEntry, Message, Parent, Route } from '../../shared/types'
import { streamAnswer } from '../ai/answer'
import { routeQuestion, type RouteInput } from '../ai/router'
import { listKnowledge } from '../db/knowledge'
import { insertMessage, listMessages } from '../db/messages'
import { insertRequest, markRequestHandedOff, type NewRequest } from '../db/requests'
import { decide } from '../domain/decide'
import type { Env } from '../env'
import { getParent } from './parents'

/** A saved question, with what answering it needs. */
export interface Question {
  parent: Parent
  requestId: string
  message: Message
  kb: KnowledgeEntry[]
  history: Message[]
}

/** Step 1 (PLAN.md 3.1): save the parent's question, before the stream opens. */
export async function saveQuestion(
  db: D1Database,
  input: { parentId: string; text: string; isTest: boolean },
): Promise<Question> {
  const parent = await getParent(db, input.parentId)
  const [kb, history] = await Promise.all([listKnowledge(db), listMessages(db, parent.id)])

  const requestId = crypto.randomUUID()
  const message: Message = {
    id: crypto.randomUUID(),
    parentId: parent.id,
    role: 'parent',
    text: input.text,
    citations: [],
    staffName: null,
    staffRole: null,
    requestId,
    isTest: input.isTest || parent.isTest,
    createdAt: new Date().toISOString(),
  }
  await insertMessage(db, message)
  return { parent, requestId, message, kb, history }
}

/**
 * The rest of PLAN.md 3.1, sent as events: route the question, tell the UI the
 * route, then stream an answer (answered, looped in) or send a fixed
 * acknowledgement (handed off, urgent). Any failure becomes a hand-off; the
 * parent never sees a raw error.
 */
export async function answerQuestion(
  env: Env,
  { parent, requestId, message: question, kb, history }: Question,
  send: (event: ChatEvent) => Promise<void>,
): Promise<void> {
  const db = env.DB
  const text = question.text
  await send({ event: 'user', data: { message: question } })

  const now = new Date()
  const request: NewRequest = {
    id: requestId,
    parentId: parent.id,
    messageId: question.id,
    isTest: question.isTest,
    createdAt: new Date().toISOString(),
    ...(await routeOrHandOff(env, { parent, question: text, kb, now })),
  }
  await insertRequest(db, request)
  let route: Route = request.route
  await send({
    event: 'route',
    data: { requestId, route, status: 'new', suggestedRole: request.suggestedRole },
  })

  let answer = {
    text: route === 'urgent' ? URGENT_ACK : HANDED_OFF_ACK,
    citations: [] as string[],
  }
  if (route === 'answered' || route === 'looped_in') {
    try {
      answer = await streamAnswer(
        env,
        { parent, kb, now, question: text, history, loopedIn: route === 'looped_in' },
        (delta) => send({ event: 'delta', data: { text: delta } }),
      )
    } catch (err) {
      console.error('answer failed', err)
      route = 'handed_off'
      await markRequestHandedOff(db, requestId, 'The assistant could not answer')
      await send({
        event: 'route',
        data: { requestId, route, status: 'new', suggestedRole: 'Director' },
      })
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
}

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
