import { describe, expect, it } from 'vitest'
import {
  gradeResult,
  SAVE_ENTRY_ID,
  SAVED_REPLY,
  TEST_SCENARIOS,
  type TestResult,
} from '../../../shared/testScenarios'
import type { Route, SaveAs } from '../../../shared/types'
import {
  INITIAL_RUN,
  resultRow,
  runStatusText,
  TestRunner,
  type RunnerDeps,
  type RunState,
} from './testRun'

type Call =
  | { kind: 'reset' }
  | { kind: 'ask'; parentId: string; text: string }
  | { kind: 'reply'; inquiryId: string; text: string; saveAs?: SaveAs }
  | { kind: 'record'; scenarioNum: number; actual: Route; savedReply: boolean }

/** Routes every scenario as expected; sleeps resolve on the next microtask. */
function harness(routeFor: (num: number) => Route = (num) => TEST_SCENARIOS[num - 1].expected) {
  const calls: Call[] = []
  const states: RunState[] = []
  const results: TestResult[] = []
  let failAsk: number | null = null
  const deps: RunnerDeps = {
    reset: async () => {
      calls.push({ kind: 'reset' })
    },
    parentFor: async (child) => (child === 'Maya' ? 'sam-rivera' : `test-${child}`),
    ask: async (parentId, text) => {
      const num = TEST_SCENARIOS.find((s) => s.question === text)!.num
      if (num === failAsk) {
        failAsk = null
        throw new Error('network down')
      }
      calls.push({ kind: 'ask', parentId, text })
      return { inquiryId: `req-${num}`, route: routeFor(num) }
    },
    reply: async (inquiryId, text, saveAs) => {
      calls.push({ kind: 'reply', inquiryId, text, saveAs })
    },
    record: async ({ runId, scenarioNum, actual, savedReply }) => {
      calls.push({ kind: 'record', scenarioNum, actual, savedReply })
      const s = TEST_SCENARIOS[scenarioNum - 1]
      const outcome = gradeResult(s.expected, actual)
      return {
        id: `r${scenarioNum}`,
        runId,
        scenarioNum,
        question: s.question,
        expected: s.expected,
        actual,
        passed: outcome === 'pass',
        unsafeMiss: outcome === 'unsafe_miss',
        learned: false,
        createdAt: '',
      }
    },
    sleep: () => Promise.resolve(),
    now: () => 0,
    newRunId: () => 'run-1',
  }
  const runner = new TestRunner(deps, {
    onState: (s) => states.push(s),
    onResult: (r) => results.push(r),
  })
  return {
    runner,
    calls,
    states,
    results,
    failNextAsk: (num: number) => (failAsk = num),
  }
}

describe('TestRunner', () => {
  it('resets, sends all 15 in order and completes', async () => {
    const { runner, calls, results } = harness()
    await runner.run()
    expect(calls[0]).toEqual({ kind: 'reset' })
    expect(calls.filter((c) => c.kind === 'ask').map((c) => c.text)).toEqual(
      TEST_SCENARIOS.map((s) => s.question),
    )
    expect(results).toHaveLength(15)
    expect(runner.current).toMatchObject({ status: 'complete', sent: 15, runId: 'run-1' })
  })

  it('sends Maya questions as Sam and the others as test parents', async () => {
    const { runner, calls } = harness()
    await runner.run()
    const asks = calls.filter((c) => c.kind === 'ask')
    expect(asks[0].parentId).toBe('sam-rivera')
    expect(asks[5]).toMatchObject({ parentId: 'test-Leo' })
  })

  it('replies to escalations only, saving #3 into the pickup entry', async () => {
    const { runner, calls } = harness()
    await runner.run()
    const replies = calls.filter((c) => c.kind === 'reply')
    const escalated = TEST_SCENARIOS.filter((s) => s.expected !== 'answered')
    expect(replies.map((r) => r.inquiryId).sort()).toEqual(
      escalated.map((s) => `req-${s.num}`).sort(),
    )
    expect(replies.find((r) => r.inquiryId === 'req-3')).toMatchObject({
      text: SAVED_REPLY,
      saveAs: { entryId: SAVE_ENTRY_ID },
    })
    expect(replies.filter((r) => r.saveAs)).toHaveLength(1)
  })

  it('sends #15 only after the #3 save finished, and reports it', async () => {
    const { runner, calls } = harness()
    await runner.run()
    const saveAt = calls.findIndex((c) => c.kind === 'reply' && c.inquiryId === 'req-3')
    const askAt = calls.findIndex((c) => c.kind === 'ask' && c.text === TEST_SCENARIOS[14].question)
    expect(saveAt).toBeGreaterThan(-1)
    expect(saveAt).toBeLessThan(askAt)
    expect(calls.find((c) => c.kind === 'record' && c.scenarioNum === 15)).toMatchObject({
      savedReply: true,
    })
  })

  it("doesn't reply when #3 is answered by AI, so #15 isn't learned", async () => {
    const { runner, calls } = harness((num) =>
      num === 3 ? 'answered' : TEST_SCENARIOS[num - 1].expected,
    )
    await runner.run()
    expect(calls.some((c) => c.kind === 'reply' && c.inquiryId === 'req-3')).toBe(false)
    expect(calls.find((c) => c.kind === 'record' && c.scenarioNum === 15)).toMatchObject({
      savedReply: false,
    })
  })

  it('stops on a failed send and retries that question on Run', async () => {
    const { runner, calls, failNextAsk } = harness()
    failNextAsk(4)
    await runner.run()
    expect(runner.current).toMatchObject({ status: 'failed', sent: 3 })
    expect(runner.current.error).toContain('#4')

    await runner.run()
    expect(runner.current).toMatchObject({ status: 'complete', sent: 15 })
    expect(calls.filter((c) => c.kind === 'reset')).toHaveLength(1)
    expect(calls.filter((c) => c.kind === 'ask')).toHaveLength(15)
  })

  it('pauses before the next question and resumes where it left off', async () => {
    const { runner, calls, results } = harness()
    const origRecord = results.push.bind(results)
    results.push = (r: TestResult) => {
      if (r.scenarioNum === 5) runner.pause()
      return origRecord(r)
    }
    await runner.run()
    expect(runner.current).toMatchObject({ status: 'paused', sent: 5 })
    expect(calls.filter((c) => c.kind === 'ask')).toHaveLength(5)

    await runner.run()
    expect(runner.current).toMatchObject({ status: 'complete', sent: 15 })
    expect(calls.filter((c) => c.kind === 'ask')).toHaveLength(15)
  })
})

describe('resultRow', () => {
  const scenario = (num: number) => TEST_SCENARIOS[num - 1]
  const result = (num: number, actual: Route, learned = false): TestResult => {
    const s = scenario(num)
    const outcome = gradeResult(s.expected, actual)
    return {
      id: 'x',
      runId: 'run',
      scenarioNum: num,
      question: s.question,
      expected: s.expected,
      actual,
      passed: outcome === 'pass',
      unsafeMiss: outcome === 'unsafe_miss',
      learned,
      createdAt: '',
    }
  }

  it('is pending before the scenario runs', () => {
    expect(resultRow(scenario(1), undefined, false).tone).toBe('pending')
  })

  it('marks #15 learned and notes the save on #3', () => {
    expect(resultRow(scenario(15), result(15, 'answered', true), true)).toMatchObject({
      tone: 'learned',
      label: 'Pass',
    })
    expect(resultRow(scenario(3), result(3, 'looped_in'), true).note).toMatch(/saved/)
    expect(resultRow(scenario(3), result(3, 'looped_in'), false).note).toBeNull()
  })

  it('styles over-escalations amber and unsafe misses red', () => {
    expect(resultRow(scenario(12), result(12, 'looped_in'), false)).toMatchObject({
      tone: 'over',
      label: 'Fail',
    })
    expect(resultRow(scenario(8), result(8, 'answered'), false)).toMatchObject({
      tone: 'unsafe',
      label: 'Unsafe miss',
    })
  })
})

describe('runStatusText', () => {
  it('shows progress while running and the stored run when idle', () => {
    expect(runStatusText({ ...INITIAL_RUN, status: 'running', sent: 7 }, 7)).toBe(
      'Running · 7 of 15 sent',
    )
    expect(runStatusText(INITIAL_RUN, 15)).toBe('Last run · 15 of 15 questions sent')
  })
})
