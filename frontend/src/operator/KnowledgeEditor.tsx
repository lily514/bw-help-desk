import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Link,
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
  type Blocker,
} from 'react-router'
import { CATEGORIES, type Category, type KnowledgeEntryDetail } from '../../../shared/types'
import { api, ApiError } from '../shared/api'
import { formatDate } from '../shared/format'
import { FromParentTag } from './Knowledge'

function isCategory(value: string | null): value is Category {
  return CATEGORIES.includes(value as Category)
}

interface Fields {
  title: string
  category: Category
  body: string
}

/** Remount per entry so switching entries (or to a new one) starts from fresh state. */
export function KnowledgeEditorPage() {
  const { entryId } = useParams()
  const [search] = useSearchParams()
  return <KnowledgeEditor key={`${entryId}?${search.toString()}`} />
}

/**
 * Edit an entry at /operator/knowledge/:entryId, or create one at /operator/knowledge/new
 * (optionally prefilled with ?title=&category=). Saving bumps `updated_at`; the next chat
 * call reads the new text (PLAN.md 4.4).
 */
function KnowledgeEditor() {
  const { entryId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const isNew = entryId === 'new'

  const [entry, setEntry] = useState<KnowledgeEntryDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // What the form held when it opened; any difference counts as unsaved changes.
  const [initial, setInitial] = useState<Fields | null>(() => {
    if (!isNew) return null
    const fromQuery = search.get('category')
    return {
      title: search.get('title') ?? '',
      category: isCategory(fromQuery) ? fromQuery : CATEGORIES[0],
      body: '',
    }
  })
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? CATEGORIES[0])
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const dirty =
    initial !== null &&
    (title !== initial.title || category !== initial.category || body !== initial.body)
  // Set just before navigating away after a successful save, so the blocker lets it through.
  const saved = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useBeforeUnload(
    useCallback(
      (e: BeforeUnloadEvent) => {
        if (dirty && !saved.current) e.preventDefault()
      },
      [dirty],
    ),
  )

  useEffect(() => {
    if (isNew || !entryId) return
    let cancelled = false
    api
      .getKnowledge(entryId)
      .then((e) => {
        if (cancelled) return
        setEntry(e)
        setInitial({ title: e.title, category: e.category, body: e.body })
        setTitle(e.title)
        setCategory(e.category)
        setBody(e.body)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'This entry no longer exists.'
            : "Couldn't load this entry. Refresh to try again.",
        )
      })
    return () => {
      cancelled = true
    }
  }, [entryId, isNew])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setSaveError('Add a title and an answer before saving.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const input = { title, category, body }
      if (isNew) await api.createKnowledge(input)
      else await api.updateKnowledge(entryId!, input)
      saved.current = true
      navigate('/operator/knowledge')
    } catch {
      setSaveError("Couldn't save. Try again.")
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="operator-page">
        <div className="empty-card">
          <p>
            {loadError} <Link to="/operator/knowledge">Back to Knowledge</Link>
          </p>
        </div>
      </div>
    )
  }

  if (!isNew && !entry) {
    return (
      <div className="operator-page">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="operator-page">
      <form className="kb-editor" onSubmit={save}>
        {entry && (
          <div className="kb-editor-meta">
            {entry.fromParentQuestion && <FromParentTag large />}
            <span className="muted">
              {entry.sourceParentName && `Saved from your reply to ${entry.sourceParentName} · `}
              Updated {formatDate(entry.updatedAt)}
            </span>
          </div>
        )}

        <div className="kb-editor-row">
          <div className="field field-title">
            <label htmlFor="entry-title">Title</label>
            <input
              id="entry-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="field field-category">
            <label htmlFor="entry-category">Category</label>
            <select
              id="entry-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="entry-body">Answer</label>
          <textarea
            id="entry-body"
            rows={11}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            aria-describedby="entry-body-hint"
          />
          <span id="entry-body-hint" className="field-hint">
            Plain text. The AI quotes from this and links parents to it.
          </span>
        </div>

        <div className="kb-editor-actions">
          {saveError && (
            <span className="action-note is-error" role="alert">
              {saveError}
            </span>
          )}
          <Link to="/operator/knowledge" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
      {blocker.state === 'blocked' && <LeaveDialog blocker={blocker} />}
    </div>
  )
}

/** Asks before leaving the editor with unsaved changes. */
function LeaveDialog({ blocker }: { blocker: Blocker }) {
  const stayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    stayRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && blocker.reset?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [blocker])

  return (
    <div className="dialog-layer">
      <div className="dialog-scrim" onClick={() => blocker.reset?.()} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        aria-describedby="leave-text"
        className="dialog"
      >
        <h2 id="leave-title">Discard your changes?</h2>
        <p id="leave-text">You've edited this entry but haven't saved it.</p>
        <div className="dialog-actions">
          <button
            ref={stayRef}
            type="button"
            className="btn btn-secondary"
            onClick={() => blocker.reset?.()}
          >
            Keep editing
          </button>
          <button type="button" className="btn btn-danger" onClick={() => blocker.proceed?.()}>
            Discard changes
          </button>
        </div>
      </div>
    </div>
  )
}
