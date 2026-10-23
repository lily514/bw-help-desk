export interface Env {
  DB: D1Database
  OPENROUTER_API_KEY?: string
  /** OpenRouter model id, e.g. 'openai/gpt-6.1-sol'. */
  OPENROUTER_MODEL: string
  /** 'jev' (default) or 'llm' to force the fallback router. */
  ROUTER: 'jev' | 'llm'
}
