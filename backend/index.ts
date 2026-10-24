import { Hono } from 'hono'
import type { Env } from './env'
import { chat } from './routes/chat'
import { kb } from './routes/kb'
import { parents } from './routes/parents'
import { requests } from './routes/requests'
import { thread } from './routes/thread'

// Static assets (the React app) are served by Workers Assets; only /api/* reaches this app.
const app = new Hono<{ Bindings: Env }>().basePath('/api')

app.get('/health', (c) => c.json({ ok: true }))
app.route('/parents', parents)
app.route('/kb', kb)
app.route('/chat', chat)
app.route('/thread', thread)
app.route('/requests', requests)

app.notFound((c) => c.json({ error: 'Not found' }, 404))

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Something went wrong' }, 500)
})

export default app
