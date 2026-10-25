import { useEffect, useRef, useState } from 'react'
import { entryText } from '../../../shared/knowledge'
import type { KnowledgeEntry } from '../../../shared/types'
import { api } from '../shared/api'
import { formatDate } from '../shared/format'
import { CloseIcon } from '../shared/icons'
import { Markdown } from '../shared/Markdown'

/** Bottom sheet with the full policy text behind a citation chip (PLAN.md 4.3). */
export function PolicySheet({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const [entry, setEntry] = useState<KnowledgeEntry | null>(null)
  const [failed, setFailed] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getKnowledge(entryId)
      .then((e) => !cancelled && setEntry(e))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [entryId])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-layer">
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={entry ? `${entry.title} policy` : 'Policy'}
        className="sheet"
      >
        <span className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-head">
          <div className="sheet-heading">
            {entry && <span className="pill">{entry.category}</span>}
            <h2>{entry?.title ?? (failed ? 'Policy unavailable' : 'Loading…')}</h2>
            {entry && <p className="sheet-updated">Updated {formatDate(entry.updatedAt)}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-button icon-button-filled"
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="sheet-body">
          {entry && <Markdown text={entryText(entry)} />}
          {failed && <p>We couldn't load this policy right now. Please try again in a moment.</p>}
        </div>
        <button type="button" className="btn btn-secondary sheet-back" onClick={onClose}>
          Back to chat
        </button>
      </section>
    </div>
  )
}
