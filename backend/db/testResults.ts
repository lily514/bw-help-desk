import type { TestResult } from '../../shared/testScenarios'
import { toTestResult, type TestResultRow } from './rows'

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
 * Deletes test conversations and results, then runs `knowledgeSql` (the handbook
 * seed), all in one batch. With `demoParents`, evaluator-created demo parents and
 * their threads go too.
 */
export async function resetTestData(
  db: D1Database,
  { demoParents, knowledgeSql }: { demoParents: boolean; knowledgeSql: string[] },
): Promise<void> {
  const parents = demoParents ? 'is_test = 1 OR is_demo = 1' : 'is_test = 1'
  const ofParents = `parent_id IN (SELECT id FROM parents WHERE ${parents})`
  await db.batch([
    db.prepare('DELETE FROM test_results'),
    db.prepare(`DELETE FROM messages WHERE is_test = 1 OR ${ofParents}`),
    db.prepare(`DELETE FROM inquiries WHERE is_test = 1 OR ${ofParents}`),
    db.prepare(`DELETE FROM parents WHERE ${parents}`),
    ...knowledgeSql.map((sql) => db.prepare(sql)),
  ])
}
