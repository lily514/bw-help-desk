import {
  CATEGORIES,
  SENSITIVE_KINDS,
  type Category,
  type KnowledgeEntry,
  type Message,
  type Parent,
  type RouteScores,
  type RouterName,
  type SensitiveKind,
} from '../../shared/types'
import type { Env } from '../env'
import { CENTER_TIME_ZONE, formatEntry } from './answer'
import { LLM_TIMEOUT_MS, openRouter } from './llm'

/**
 * Routing questions (PLAN.md 3.2). Jev (TypeSafe's decisions model, served by
 * OpenRouter) evaluates them all in parallel; the chat-model fallback is asked
 * the same questions and returns JSON. All Jev-specific code lives in this file.
 */

const TOPIC_CRITERIA: Record<Category, string> = {
  Hours: 'Opening hours, holidays, closures, weather',
  Fees: 'Tuition, payments, fees, discounts, billing',
  Health: 'Illness, fever, medication, allergies, toileting, sleep, injuries',
  Meals: 'Food, menus, lunch, snacks, treats',
  Pickup: 'Drop-off, pickup, who may pick up, emergency contacts',
  Program: 'Classroom, curriculum, supplies, enrollment, tours, activities, behavior',
  Policies: 'Contact info, staff, ratios, safety, visits, concerns',
}

const SENSITIVE_KIND_CRITERIA: Record<SensitiveKind, string> = {
  custody: 'Custody, a parent or adult who may not pick up, family legal matters',
  complaint: 'A complaint about staff, care or the center',
  behavior: "A child's behavior, biting, discipline or an incident between children",
  billing: 'A disputed charge, double billing or a refund',
  special_needs: 'Special needs, accommodations, IEP or IFSP',
  medical: 'A medical judgment about a specific child',
  none: 'None of these',
}

// Every question is about `new_message`; earlier messages are context only, so an
// urgent message earlier in the thread doesn't make the next question urgent.
const NOUL_QUESTIONS = {
  is_urgent: {
    instructions:
      "Does the new message describe something happening now that may affect a child's safety, or say the parent will miss or be late for pickup today?",
    true: 'A possible injury, allergic reaction or allergen exposure, a missing child, or a parent running late for pickup today',
    false:
      'A routine question or request, ordinary illness symptoms such as a fever or cough, or something about another day',
  },
  is_sensitive: {
    instructions:
      "Is the new message about custody, a complaint, a child's behavior, a billing dispute, special needs, or a medical judgment?",
  },
  is_child_health_today: {
    instructions: "Is the new message about the parent's own child's health or symptoms today?",
  },
  needs_staff_action: {
    instructions:
      "Given the center's policies, does a staff member need to do something about the new message, rather than the policies already telling the parent what to do?",
    true: "Staff must do, approve, arrange or check something for this family, or the policies don't say how to do what the parent is asking",
    false:
      "The center's policies already tell the parent what to do, or it is purely informational",
  },
  answerable_from_kb: {
    instructions:
      "Do the center's policies cover the subject of the new message, so a reply can be based on them even if staff also need to act?",
    true: 'The policies include information on this subject',
    false: 'The policies say nothing about this subject',
  },
} as const

type NoulKey = keyof typeof NOUL_QUESTIONS

export interface RouteInput {
  parent: Parent
  question: string
  kb: KnowledgeEntry[]
  /** Recent thread messages, so "too" or "again" make sense. */
  history: Message[]
  now: Date
}

export interface RouterResult {
  scores: RouteScores
  router: Exclude<RouterName, 'error'>
}

/** Jev unless ROUTER=llm; the chat-model fallback if Jev fails. */
export async function routeQuestion(env: Env, input: RouteInput): Promise<RouterResult> {
  if (env.ROUTER === 'jev') {
    try {
      return { scores: await jevScores(env, input), router: 'jev' }
    } catch (err) {
      console.error('Jev router failed, using fallback', err)
    }
  }
  return { scores: await llmScores(env, input), router: 'llm-fallback' }
}

/** The state both routers see. */
export function routerState({ parent, question, kb, history, now }: RouteInput) {
  return {
    center_policies: kb.map(formatEntry).join('\n\n'),
    today: now.toLocaleDateString('en-US', {
      timeZone: CENTER_TIME_ZONE,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    parent: { name: parent.name, child: parent.childName, room: parent.room },
    earlier_messages_for_context_only: history.slice(-4).map((m) => `${m.role}: ${m.text}`),
    new_message: question,
  }
}

const JEV_TIMEOUT_MS = 8_000
const DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions'

/** Jev question payloads: `noul` answers yes/no with a probability, `choice` picks a label. */
function jevQuestions() {
  const nouls = Object.fromEntries(
    (Object.keys(NOUL_QUESTIONS) as NoulKey[]).map((key) => {
      const q: { instructions: string; true?: string; false?: string } = NOUL_QUESTIONS[key]
      const criteria = q.true ? { true: q.true, false: q.false } : undefined
      return [key, { type: 'noul', instructions: q.instructions, criteria }]
    }),
  )
  return {
    topic: {
      type: 'choice',
      instructions: 'Which topic is the message mainly about?',
      criteria: TOPIC_CRITERIA,
    },
    sensitive_kind: {
      type: 'choice',
      instructions: 'If the message is sensitive, which kind is it?',
      criteria: SENSITIVE_KIND_CRITERIA,
    },
    ...nouls,
  }
}

type JevAnswer = { type: 'noul'; noul: number } | { type: 'choice'; choice: string }

async function jevScores(env: Env, input: RouteInput): Promise<RouteScores> {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set')
  const res = await fetch(DECISIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Maple Grove Front Desk',
    },
    body: JSON.stringify({
      model: env.ROUTER_MODEL,
      state: routerState(input),
      questions: jevQuestions(),
    }),
    signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Jev returned ${res.status}: ${await res.text()}`)
  const { answers } = (await res.json()) as { answers: Record<string, JevAnswer> }
  return parseJevAnswers(answers)
}

/** Flattens Jev's answers into RouteScores, validating them like the fallback's JSON. */
export function parseJevAnswers(answers: Record<string, JevAnswer>): RouteScores {
  const flat = Object.fromEntries(
    Object.entries(answers).map(([key, a]) => [key, a.type === 'noul' ? a.noul : a.choice]),
  )
  return validateScores(flat)
}

const LLM_ROUTER_PROMPT = `You route parent messages for the front desk of Maple Grove Early Learning Center.
You will get the center's policies, the parent, recent conversation and the new message as JSON.

Reply with only a JSON object with these keys:
- "topic": one of ${CATEGORIES.map((c) => `"${c}"`).join(', ')}.
${CATEGORIES.map((c) => `  ${c}: ${TOPIC_CRITERIA[c]}`).join('\n')}
- "sensitive_kind": one of ${SENSITIVE_KINDS.map((k) => `"${k}"`).join(', ')}.
${SENSITIVE_KINDS.map((k) => `  ${k}: ${SENSITIVE_KIND_CRITERIA[k]}`).join('\n')}
${(Object.keys(NOUL_QUESTIONS) as NoulKey[])
  .map((key) => {
    const q: { instructions: string; true?: string; false?: string } = NOUL_QUESTIONS[key]
    const hint = q.true ? ` (yes: ${q.true}; no: ${q.false})` : ''
    return `- "${key}": probability from 0 to 1 that the answer is yes. ${q.instructions}${hint}`
  })
  .join('\n')}`

async function llmScores(env: Env, input: RouteInput): Promise<RouteScores> {
  const response = await openRouter(env).chat.completions.create(
    {
      model: env.CHAT_COMPLETION_MODEL,
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: LLM_ROUTER_PROMPT },
        { role: 'user', content: JSON.stringify(routerState(input)) },
      ],
    },
    { signal: AbortSignal.timeout(LLM_TIMEOUT_MS) },
  )
  return parseLlmScores(response.choices[0]?.message?.content ?? '')
}

/** Validates the fallback's JSON; throws if it is unusable so the caller hands off. */
export function parseLlmScores(content: string): RouteScores {
  const json = content.replace(/^```(?:json)?\s*|\s*```$/g, '')
  return validateScores(JSON.parse(json) as Record<string, unknown>)
}

function validateScores(raw: Record<string, unknown>): RouteScores {
  const probability = (key: NoulKey): number => {
    const value = Number(raw[key])
    if (!Number.isFinite(value)) throw new Error(`Router JSON missing ${key}`)
    return Math.min(1, Math.max(0, value))
  }
  const topic = CATEGORIES.find((c) => c.toLowerCase() === String(raw.topic).toLowerCase())
  if (!topic) throw new Error(`Router JSON has unknown topic ${String(raw.topic)}`)
  const sensitiveKind = SENSITIVE_KINDS.find((k) => k === raw.sensitive_kind) ?? 'none'

  return {
    topic,
    sensitive_kind: sensitiveKind,
    is_urgent: probability('is_urgent'),
    is_sensitive: probability('is_sensitive'),
    is_child_health_today: probability('is_child_health_today'),
    needs_staff_action: probability('needs_staff_action'),
    answerable_from_kb: probability('answerable_from_kb'),
  }
}
