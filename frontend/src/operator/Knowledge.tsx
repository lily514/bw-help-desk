import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { KnowledgeEntry } from '../../../shared/types'
import { api } from '../shared/api'
import { formatDate } from '../shared/format'
import { BookIcon, ChatSquareIcon, PlusIcon, UserIcon } from '../shared/icons'
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
                    className={`kb-card${isFromDana(entry) ? ' is-learned' : ''}`}
                  >
                    <span className="kb-card-title">{entry.title}</span>
                    <span className="kb-card-preview">{previewLine(entry.body)}</span>
                    <span className="kb-card-meta">
                      <span>Updated {formatDate(entry.updatedAt)}</span>
                      <SourceTags entry={entry} />
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

/** True when any of the entry's text came from Dana rather than the handbook. */
function isFromDana(entry: Pick<KnowledgeEntry, 'source' | 'additions'>): boolean {
  return entry.source !== 'handbook' || entry.additions.length > 0
}

/**
 * Where an entry's text came from: "From a parent question" or "Written by you" for entries
 * Dana created, plus "+N saved replies" for replies added to it. Handbook entries get no tag
 * in the list; the editor (`withHandbook`) labels them too.
 */
export function SourceTags({
  entry,
  large,
  withHandbook,
}: {
  entry: Pick<KnowledgeEntry, 'source' | 'additions'>
  large?: boolean
  withHandbook?: boolean
}) {
  const size = large ? 12 : 11
  const cls = (variant: string) => `kb-tag kb-tag-${variant}${large ? ' kb-tag-lg' : ''}`
  const n = entry.additions.length
  return (
    <>
      {entry.source === 'handbook' && withHandbook && (
        <span className={cls('neutral')}>
          <BookIcon size={size} />
          From the handbook
        </span>
      )}
      {entry.source === 'reply' && (
        <span className={cls('staff')}>
          <ChatSquareIcon size={size} />
          From a parent question
        </span>
      )}
      {entry.source === 'manual' && (
        <span className={cls('neutral')}>
          <UserIcon size={size} />
          Written by you
        </span>
      )}
      {n > 0 && (
        <span className={cls('staff')}>
          <ChatSquareIcon size={size} />+{n} saved {n === 1 ? 'reply' : 'replies'}
        </span>
      )}
    </>
  )
}
