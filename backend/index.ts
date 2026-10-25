import { Hono } from 'hono'
import type { Env } from './env'
import { chat } from './controllers/chat'
import { inbox } from './controllers/inbox'
import { insights } from './controllers/insights'
import { knowledge } from './controllers/knowledge'
import { parents } from './controllers/parents'
import { inquiries } from './controllers/inquiries'
import { testMode } from './controllers/testMode'
import { thread } from './controllers/thread'
import { NotFoundError } from './services/errors'

// Static assets (the React app) are served by Workers Assets; only /api/* reaches this app.
const app = new Hono<{ Bindings: Env }>().basePath('/api')

app.get('/health', (c) => c.json({ ok: true }))
app.route('/parents', parents)
app.route('/knowledge', knowledge)
app.route('/chat', chat)
app.route('/thread', thread)
app.route('/inquiries', inquiries)
app.route('/inbox', inbox)
app.route('/insights', insights)
app.route('/test', testMode)

app.notFound((c) => c.json({ error: 'Not found' }, 404))

app.onError((err, c) => {
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404)
  console.error(err)
  return c.json({ error: 'Something went wrong' }, 500)
})

export default app
