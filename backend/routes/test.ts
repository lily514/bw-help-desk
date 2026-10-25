import { Hono } from 'hono'
import handbook from '../../data/handbook.md?raw'
import {
  gradeResult,
  LEARN_SCENARIO,
  TEST_SCENARIOS,
  type TestResult,
  type TestResultsResponse,
} from '../../shared/testScenarios'
import type { Route } from '../../shared/types'
import type { Env } from '../env'
import { listTestResults, resetTestData, saveTestResult } from '../db/testResults'
import { knowledgeSeedSql } from '../seed/seed'

export const test = new Hono<{ Bindings: Env }>()

const ROUTES: Route[] = ['answered', 'looped_in', 'handed_off', 'urgent']

/**
 * POST /api/test/result — one scenario's outcome from the client-driven run
 * (PLAN.md 4.5). The question, expected route and grade come from the script,
 * so the client only reports what actually happened.
 */
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

  const outcome = gradeResult(scenario.expected, actual)
  const result: TestResult = {
    id: crypto.randomUUID(),
    runId: body.runId,
    scenarioNum: scenario.num,
    question: scenario.question,
    expected: scenario.expected,
    actual,
    passed: outcome === 'pass',
    unsafeMiss: outcome === 'unsafe_miss',
    learned: scenario.num === LEARN_SCENARIO && outcome === 'pass' && body.savedReply === true,
    createdAt: new Date().toISOString(),
  }
  await saveTestResult(c.env.DB, result)
  return c.json(result, 201)
})

/** GET /api/test/results?runId= — without a run id, the latest run. */
test.get('/results', async (c) => {
  const response: TestResultsResponse = await listTestResults(
    c.env.DB,
    c.req.query('runId') || undefined,
  )
  return c.json(response)
})

/**
 * POST /api/test/reset { demoParents? } — deletes test data and restores the
 * handbook KB so the run can be replayed. Demo parents are deleted unless
 * `demoParents: false` (used when a new run starts).
 */
test.post('/reset', async (c) => {
  const body: { demoParents?: unknown } = await c.req.json().catch(() => ({}))
  await resetTestData(c.env.DB, {
    demoParents: body.demoParents !== false,
    knowledgeSql: knowledgeSeedSql(handbook),
  })
  return c.json({ ok: true })
})
