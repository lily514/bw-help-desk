export interface Env {
  DB: D1Database
  OPENROUTER_API_KEY?: string
  /** OpenRouter chat model for answers and the fallback router, e.g. 'openai/gpt-6.1-sol'. */
  CHAT_COMPLETION_MODEL: string
  /** 'jev' (default) or 'llm' to force the fallback router. */
  ROUTER: 'jev' | 'llm'
  /** OpenRouter decisions model for routing, e.g. 'typesafe/jev-1.14'. */
  ROUTER_MODEL: string
  /** Per-IP limit on POST /api/chat (wrangler.toml [[ratelimits]]). */
  CHAT_LIMITER: RateLimit
}
