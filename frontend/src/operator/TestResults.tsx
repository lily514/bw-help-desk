import { summarize, TEST_SCENARIOS } from '../../../shared/testScenarios'
import { ShieldCheckIcon } from '../shared/icons'
import { RouteBadge } from './Badges'
import { resultRow } from './testRun'
import { useTestMode } from './TestMode'

/** Results panel (PLAN.md 4.5, design reference screen 10). */
export function TestResults() {
  const { run, results, enabled, setEnabled } = useTestMode()
  const byNum = new Map(results.map((r) => [r.scenarioNum, r]))
  const { sent, passed, unsafeMisses } = summarize(results)
  // After a reload the runner's state is gone; a learned #15 means #3's reply was saved.
  const savedReply = run.savedReply || results.some((r) => r.learned)
  const sending = run.status === 'running' ? run.sent + 1 : null

  return (
    <div className="operator-page test-results">
      {!enabled && (
        <div className="test-off-note">
          <span>Turn on test mode to run the 15 scripted questions.</span>
          <button type="button" className="btn btn-outline" onClick={() => setEnabled(true)}>
            Turn on test mode
          </button>
        </div>
      )}

      <div className="test-summary">
        <div className="test-summary-main">
          <span className="test-summary-score">
            {sent ? `${passed}/${sent} routed correctly` : 'No run yet'}
          </span>
          {sent > 0 && (
            <span className={`test-summary-safety${unsafeMisses ? ' is-unsafe' : ''}`}>
              <ShieldCheckIcon size={18} />
              {unsafeMisses} unsafe {unsafeMisses === 1 ? 'miss' : 'misses'}
            </span>
          )}
        </div>
        <div className="test-legend">
          <span>
            <span className="test-swatch test-swatch-over" aria-hidden="true" />
            Over-escalated (safe)
          </span>
          <span>
            <span className="test-swatch test-swatch-unsafe" aria-hidden="true" />
            Unsafe miss: AI answered alone
          </span>
        </div>
      </div>

      <div className="test-table-wrap">
        <table className="test-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Question</th>
              <th scope="col">Expected</th>
              <th scope="col">Actual</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {TEST_SCENARIOS.map((s) => {
              const result = byNum.get(s.num)
              const row = resultRow(s, result, savedReply)
              return (
                <tr key={s.num} className={`test-row tone-${row.tone}`}>
                  <td className="test-num">{s.num}</td>
                  <td>
                    <div className="test-question">
                      <span>{s.question}</span>
                      {row.note && <span className="test-note">{row.note}</span>}
                    </div>
                  </td>
                  <td>
                    <RouteBadge route={s.expected} />
                  </td>
                  <td>
                    {result ? (
                      <RouteBadge route={result.actual} />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="test-result">
                    {sending === s.num ? <span className="muted">Sending…</span> : row.label}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
