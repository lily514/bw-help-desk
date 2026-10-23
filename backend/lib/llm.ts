import OpenAI from 'openai'
import type { Env } from '../env'

/** All model calls go through OpenRouter's OpenAI-compatible API. */
export function openRouter(env: Env): OpenAI {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set')
  return new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: { 'X-Title': 'Maple Grove Front Desk' },
    maxRetries: 0,
  })
}

/** Time allowed for the model to start answering before we hand off (PLAN.md 2). */
export const LLM_TIMEOUT_MS = 10_000
