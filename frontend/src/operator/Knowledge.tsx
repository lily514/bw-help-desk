import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { KnowledgeEntry } from '../../../shared/types'
import { api } from '../shared/api'
import { formatDate } from '../shared/format'
import { ChatSquareIcon, PlusIcon } from '../shared/icons'
import { RetryButton } from './RetryButton'
import { entryPath, groupByCategory, previewLine } from './knowledgeModel'

/** Knowledge list: every entry the AI answers from, grouped by category (PLAN.md 4.4). */
export function Knowledge() {
  const [entries, setEntries] = useState<KnowledgeEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .listKnowledge()
      .then((e) => !cancelled && setEntries(e))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = () => {
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  return (
    <div className="operator-page">
      <div className="kb">
        {!entries && !failed && <p className="muted">Loading…</p>}
        {failed && (
          <div className="empty-card">
            <p>Couldn't load the knowledge base.</p>
            <RetryButton onClick={retry} />
          </div>
        )}
        {entries?.length === 0 && (
          <div className="empty-card">
            <p>No entries yet. The AI hands every question to Dana until there's something here.</p>
            <Link to="/operator/knowledge/new" className="btn btn-primary">
              <PlusIcon size={16} />
              New entry
            </Link>
          </div>
        )}
        {!!entries?.length && (
          <p className="kb-summary">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}. The AI only answers from
            what's here.
          </p>
        )}
        {entries &&
          groupByCategory(entries).map((group) => (
            <section key={group.category} className="kb-group">
              <h2 className="kb-group-title">{group.category}</h2>
              <div className="kb-grid">
                {group.entries.map((entry) => (
                  <Link
                    key={entry.id}
                    to={entryPath(entry.id)}
                    className={`kb-card${entry.fromParentQuestion ? ' is-learned' : ''}`}
                  >
                    <span className="kb-card-title">{entry.title}</span>
                    <span className="kb-card-preview">{previewLine(entry.body)}</span>
                    <span className="kb-card-meta">
                      <span>Updated {formatDate(entry.updatedAt)}</span>
                      {entry.fromParentQuestion && <FromParentTag />}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  )
}

export function FromParentTag({ large }: { large?: boolean }) {
  return (
    <span className={`from-parent-tag${large ? ' from-parent-tag-lg' : ''}`}>
      <ChatSquareIcon size={large ? 12 : 11} />
      From a parent question
    </span>
  )
}
