import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Insights as InsightsData } from '../../../shared/types'
import { api } from '../shared/api'
import { PlusIcon } from '../shared/icons'
import './insights.css'

function askedTimes(count: number): string {
  return count === 1 ? 'Asked once' : `Asked ${count} times`
}

/** Last 7 days, test conversations excluded (PLAN.md 4.4). */
export function Insights() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .insights()
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) {
    return (
      <div className="operator-page">
        <div className="empty-card">
          <p>Couldn't load insights. Refresh to try again.</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="operator-page">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  const maxTopic = data.topTopics[0]?.count ?? 0

  return (
    <div className="operator-page">
      <div className="insights">
        <div className="stat-tiles">
          <div className="stat-tile">
            <span className="stat-label">Questions asked</span>
            <span className="stat-value">{data.questionsAsked}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">Answered by AI</span>
            <span className="stat-value is-accent">{data.answeredByAiPct}%</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">Sent to a person</span>
            <span className="stat-value">{data.sentToPersonPct}%</span>
          </div>
        </div>

        <div className="insights-panels">
          <section className="insights-panel topics">
            <h2>Top topics</h2>
            {data.topTopics.length === 0 && (
              <p className="muted">No questions in the last 7 days.</p>
            )}
            <ul className="topic-list">
              {data.topTopics.map(({ topic, count }) => (
                <li key={topic} className="topic">
                  <div className="topic-row">
                    <span>{topic}</span>
                    <span className="topic-count">{count}</span>
                  </div>
                  <div className="topic-bar" aria-hidden="true">
                    <span style={{ width: `${(count / maxTopic) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="insights-panel uncovered">
            <h2>Couldn't answer</h2>
            <p className="insights-panel-sub">
              The knowledge base didn't cover these. Add an answer and the AI handles them next
              time.
            </p>
            {data.couldntAnswer.length === 0 && (
              <p className="uncovered-empty">Nothing uncovered this week.</p>
            )}
            <ul className="uncovered-list">
              {data.couldntAnswer.map(({ question, topic, count }) => (
                <li key={question} className="uncovered-row">
                  <div className="uncovered-text">
                    <span>{question}</span>
                    <span className="muted">{askedTimes(count)}</span>
                  </div>
                  <Link
                    to={`/operator/knowledge/new?${new URLSearchParams({ title: question, category: topic })}`}
                    className="btn btn-outline add-answer"
                  >
                    <PlusIcon size={14} />
                    Add answer
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
