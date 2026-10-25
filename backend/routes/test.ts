import { Hono } from 'hono'
import { TEST_SCENARIOS } from '../../shared/testScenarios'
import type { Route } from '../../shared/types'
import type { Env } from '../env'
import { listResults, recordResult, resetTestData } from '../services/testMode'

export const test = new Hono<{ Bindings: Env }>()

const ROUTES: Route[] = ['answered', 'looped_in', 'handed_off', 'urgent']

/** POST /api/test/result — one scenario's outcome from the client-driven run (PLAN.md 4.5). */
test.post('/result', async (c) => {
  const body = await c.req.json<{
    runId?: unknown
    scenarioNum?: unknown
    actual?: unknown
    savedReply?: unknown
  }>()
  const scenario = TEST_SCENARIOS.find((s) => s.num === body.scenarioNum)
  const actual = body.actual as Route
  if (typeof body.runId !== 'string' || !body.runId || !scenario || !ROUTES.includes(actual)) {
    return c.json(
      { error: 'runId, a scenarioNum from the script and a valid actual route are required' },
      400,
    )
  }

  const result = await recordResult(c.env.DB, {
    runId: body.runId,
    scenario,
    actual,
    savedReply: body.savedReply === true,
  })
  return c.json(result, 201)
})

/** GET /api/test/results?runId= — without a run id, the latest run. */
test.get('/results', async (c) =>
  c.json(await listResults(c.env.DB, c.req.query('runId') || undefined)),
)

/**
 * POST /api/test/reset { demoParents? } — demo parents are deleted unless
 * `demoParents: false` (used when a new run starts).
 */
test.post('/reset', async (c) => {
  const body: { demoParents?: unknown } = await c.req.json().catch(() => ({}))
  await resetTestData(c.env.DB, body.demoParents !== false)
  return c.json({ ok: true })
})
