import handbook from '../../data/handbook.md?raw'
import {
  gradeResult,
  LEARN_SCENARIO,
  type TestResult,
  type TestResultsResponse,
  type TestScenario,
} from '../../shared/testScenarios'
import type { Route } from '../../shared/types'
import * as testResults from '../db/testResults'
import { knowledgeSeedSql } from '../seed/seed'

/**
 * Grades one scenario's outcome from the client-driven run (PLAN.md 4.5). The
 * question, expected route and grade come from the script, so the client only
 * reports what actually happened.
 */
export async function recordResult(
  db: D1Database,
  input: { runId: string; scenario: TestScenario; actual: Route; savedReply: boolean },
): Promise<TestResult> {
  const { runId, scenario, actual } = input
  const outcome = gradeResult(scenario.expected, actual)
  const result: TestResult = {
    id: crypto.randomUUID(),
    runId,
    scenarioNum: scenario.num,
    question: scenario.question,
    expected: scenario.expected,
    actual,
    passed: outcome === 'pass',
    unsafeMiss: outcome === 'unsafe_miss',
    learned: scenario.num === LEARN_SCENARIO && outcome === 'pass' && input.savedReply,
    createdAt: new Date().toISOString(),
  }
  await testResults.saveTestResult(db, result)
  return result
}

/** Without a run id, the latest run's results. */
export function listResults(db: D1Database, runId?: string): Promise<TestResultsResponse> {
  return testResults.listTestResults(db, runId)
}

/**
 * Deletes test data and restores the handbook KB so the run can be replayed.
 * A full reset (the Reset button) also deletes demo parents; starting a new run keeps them.
 */
export async function resetTestData(db: D1Database, demoParents: boolean): Promise<void> {
  await testResults.resetTestData(db, { demoParents, knowledgeSql: knowledgeSeedSql(handbook) })
}
