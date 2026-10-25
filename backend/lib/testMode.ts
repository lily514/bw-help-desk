import type { Route } from '../../shared/types'
import type { TestResult } from '../../shared/testScenarios'
import { knowledgeSeedSql } from '../seed/seed'

interface TestResultRow {
  id: string
  run_id: string
  scenario_num: number
  question: string
  expected: string
  actual: string
  passed: number
  unsafe_miss: number
  learned: number
  created_at: string
}

function toTestResult(r: TestResultRow): TestResult {
  return {
    id: r.id,
    runId: r.run_id,
    scenarioNum: r.scenario_num,
    question: r.question,
    expected: r.expected as Route,
    actual: r.actual as Route,
    passed: r.passed === 1,
    unsafeMiss: r.unsafe_miss === 1,
    learned: r.learned === 1,
    createdAt: r.created_at,
  }
}

/** Replaces any earlier result for the same scenario in the run (a retried send). */
export async function saveTestResult(db: D1Database, r: TestResult): Promise<void> {
  await db.batch([
    db
      .prepare('DELETE FROM test_results WHERE run_id = ? AND scenario_num = ?')
      .bind(r.runId, r.scenarioNum),
    db
      .prepare(
        `INSERT INTO test_results
           (id, run_id, scenario_num, question, expected, actual, passed, unsafe_miss, learned, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        r.id,
        r.runId,
        r.scenarioNum,
        r.question,
        r.expected,
        r.actual,
        r.passed ? 1 : 0,
        r.unsafeMiss ? 1 : 0,
        r.learned ? 1 : 0,
        r.createdAt,
      ),
  ])
}

/** The run's results in scenario order; without a run id, the latest run's. */
export async function listTestResults(
  db: D1Database,
  runId?: string,
): Promise<{ runId: string | null; results: TestResult[] }> {
  const id =
    runId ??
    (
      await db
        .prepare('SELECT run_id FROM test_results ORDER BY created_at DESC LIMIT 1')
        .first<{ run_id: string }>()
    )?.run_id
  if (!id) return { runId: null, results: [] }

  const { results } = await db
    .prepare('SELECT * FROM test_results WHERE run_id = ? ORDER BY scenario_num')
    .bind(id)
    .all<TestResultRow>()
  return { runId: id, results: results.map(toTestResult) }
}

/**
 * Deletes test conversations and results and restores the handbook knowledge base,
 * in one batch. A full reset (the Reset button) also deletes evaluator-created
 * demo parents and their threads; starting a new run keeps them.
 */
export async function resetTestData(
  db: D1Database,
  handbookMd: string,
  { demoParents }: { demoParents: boolean },
): Promise<void> {
  const parents = demoParents ? 'is_test = 1 OR is_demo = 1' : 'is_test = 1'
  const ofParents = `parent_id IN (SELECT id FROM parents WHERE ${parents})`
  await db.batch([
    db.prepare('DELETE FROM test_results'),
    db.prepare(`DELETE FROM messages WHERE is_test = 1 OR ${ofParents}`),
    db.prepare(`DELETE FROM requests WHERE is_test = 1 OR ${ofParents}`),
    db.prepare(`DELETE FROM parents WHERE ${parents}`),
    ...knowledgeSeedSql(handbookMd).map((sql) => db.prepare(sql)),
  ])
}
