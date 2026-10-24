// Sends test scenarios to a running dev server and prints expected vs actual routes.
// Usage: npm run check:routes                  (scenarios 1–14 against http://localhost:5173)
//        npm run check:routes -- 1 5 15        (only these scenarios)
//        BASE_URL=https://… npm run check:routes
// Messages are sent with isTest, but they do land in the database: run `npm run db:seed` after.
import type { Parent, Route } from '../../shared/types'
import { TEST_PARENTS, TEST_SCENARIOS, type TestScenario } from '../../shared/testScenarios'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const only = process.argv.slice(2).map(Number).filter(Boolean)
const scenarios = TEST_SCENARIOS.filter((s) => (only.length ? only.includes(s.num) : s.num <= 14))

const parentIds = new Map<TestScenario['child'], string>([['Maya', 'sam-rivera']])

async function parentFor(child: TestScenario['child']): Promise<string> {
  const existing = parentIds.get(child)
  if (existing) return existing
  const info = TEST_PARENTS[child as keyof typeof TEST_PARENTS]
  const res = await fetch(`${BASE_URL}/api/parents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: info.name, childName: child, room: info.room }),
  })
  const parent = (await res.json()) as Parent
  parentIds.set(child, parent.id)
  return parent.id
}

/** Reads the SSE stream; returns the last route and the final message text. */
async function ask(parentId: string, text: string): Promise<{ route?: Route; reply: string }> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parentId, text, isTest: true }),
  })
  if (res.status === 429) {
    // Per-IP chat limit (20/min). Wait it out rather than report a miss.
    await new Promise((resolve) => setTimeout(resolve, 15_000))
    return ask(parentId, text)
  }
  if (!res.ok) return { reply: `HTTP ${res.status}: ${await res.text()}` }

  let route: Route | undefined
  let reply = ''
  for (const block of (await res.text()).split('\n\n')) {
    const event = /^event: (\w+)/m.exec(block)?.[1]
    const data = /^data: (.*)$/m.exec(block)?.[1]
    if (!event || !data) continue
    const payload = JSON.parse(data)
    if (event === 'route') route = payload.route
    if (event === 'done') reply = payload.message.text
  }
  return { route, reply }
}

let correct = 0
let unsafe = 0
for (const s of scenarios) {
  const started = Date.now()
  const { route, reply } = await ask(await parentFor(s.child), s.question)
  const ok = route === s.expected
  const isUnsafe = route === 'answered' && (s.expected === 'handed_off' || s.expected === 'urgent')
  if (ok) correct++
  if (isUnsafe) unsafe++
  const mark = ok ? 'ok  ' : isUnsafe ? 'UNSAFE' : 'MISS'
  console.log(
    `${mark.padEnd(6)} #${String(s.num).padEnd(2)} expected ${s.expected.padEnd(10)} got ${String(route).padEnd(10)} ${((Date.now() - started) / 1000).toFixed(1)}s  ${s.question}`,
  )
  console.log(`         → ${reply.replace(/\s+/g, ' ').slice(0, 140)}`)
}
console.log(`\n${correct}/${scenarios.length} routed as expected · ${unsafe} unsafe misses`)
