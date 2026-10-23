import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { KnowledgeEntry, Message, Parent } from '../../src/shared/types'
import type { Env } from '../env'
import { CitationStream } from './citations'
import { LLM_TIMEOUT_MS, openRouter } from './llm'

export const CENTER_TIME_ZONE = 'America/Indiana/Indianapolis'

/** Earlier messages from the thread given to the model, so follow-ups make sense. */
const HISTORY_LIMIT = 6

const ROLE_AND_RULES = `You are the front desk assistant for Maple Grove Early Learning Center, answering parents in a chat.

Voice: warm, plain and short, like a kind staff member texting back. Usually two to four sentences. Use the child's first name. No emoji, no headings, no bullet lists unless the parent asks for a list. Never sound like a policy document, even when quoting one.
Punctuation: plain and simple. Straight quotes and apostrophes only. No em dashes or en dashes: use a comma, a period, or the word "to" for ranges (6:30am to 6:00pm). No semicolons.

Rules:
- Answer only from the knowledge base below. Do not add facts, numbers or dates that are not in it.
- Never give medical judgment about a specific child. Say what the policy says and leave the call to staff and the family's doctor.
- Never say a staff action has been done (a pickup added, a fee waived, a tour booked). Staff do those things, not you.
- If the knowledge base doesn't fully cover the question, say what it does cover and that the front desk will follow up.
- Resolve days like "Wednesday" or "next Friday" using today's date below.

Output format: write the answer, then end with one final line listing every knowledge base entry you used:
[[cite: id1, id2]]
Use the exact ids in square brackets from the knowledge base. If you used none, write [[cite: ]].`

function formatEntry(e: KnowledgeEntry): string {
  return `[${e.id}] ${e.title} (${e.category}, updated ${e.updatedAt.slice(0, 10)})\n${e.body}`
}

export interface AnswerContext {
  parent: Parent
  kb: KnowledgeEntry[]
  now: Date
  /** PLAN.md 3.4 item 6: staff have already been notified. */
  loopedIn?: boolean
}

/**
 * System prompt (PLAN.md 3.4). The fixed role, rules and KB come first so the
 * provider's prefix cache can reuse them; per-call details come last.
 */
export function buildSystemPrompt({ parent, kb, now, loopedIn }: AnswerContext): string {
  const today = now.toLocaleDateString('en-US', {
    timeZone: CENTER_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const parentFirst = parent.name.split(' ')[0]

  const perCall = [
    `Today is ${today}.`,
    `You are talking with ${parentFirst}, parent of ${parent.childName} (${parent.room} room).`,
  ]
  if (loopedIn) {
    perCall.push(
      'Staff have already been notified about this message. After answering, say so naturally in one sentence.',
    )
  }

  return [
    ROLE_AND_RULES,
    `# Knowledge base\n\n${kb.map(formatEntry).join('\n\n')}`,
    `# This conversation\n\n${perCall.join('\n')}`,
  ].join('\n\n')
}

function historyMessages(history: Message[]): ChatCompletionMessageParam[] {
  return history.slice(-HISTORY_LIMIT).map((m) =>
    m.role === 'parent'
      ? { role: 'user', content: m.text }
      : {
          role: 'assistant',
          content: m.role === 'staff' ? `(${m.staffName}, ${m.staffRole}): ${m.text}` : m.text,
        },
  )
}

const PLAIN: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u2026': '...',
}

/** Curly quotes and ellipses → ASCII. Character-for-character, so safe on any delta split. */
export function plainPunctuation(text: string): string {
  return text.replace(/[\u2018\u2019\u201C\u201D\u2026]/g, (ch) => PLAIN[ch])
}

export interface AnswerResult {
  text: string
  citations: string[]
}

/**
 * Streams an answer, calling `onText` with parent-visible text as it arrives.
 * Throws if the model hasn't started within LLM_TIMEOUT_MS or the stream fails;
 * the caller turns that into a hand-off.
 */
export async function streamAnswer(
  env: Env,
  ctx: AnswerContext & { question: string; history: Message[] },
  onText: (text: string) => Promise<void>,
): Promise<AnswerResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

  try {
    const stream = await openRouter(env).chat.completions.create(
      {
        model: env.OPENROUTER_MODEL,
        stream: true,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: 'system', content: buildSystemPrompt(ctx) },
          ...historyMessages(ctx.history),
          { role: 'user', content: ctx.question },
        ],
      },
      { signal: controller.signal },
    )

    const citations = new CitationStream(new Set(ctx.kb.map((e) => e.id)))
    let started = false
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (!delta) continue
      if (!started) {
        started = true
        clearTimeout(timer)
      }
      const visible = citations.push(plainPunctuation(delta))
      if (visible) await onText(visible)
    }

    const result = citations.finish()
    if (result.tail) await onText(result.tail)
    if (!result.text) throw new Error('Model returned an empty answer')
    return { text: result.text, citations: result.citations }
  } finally {
    clearTimeout(timer)
  }
}
