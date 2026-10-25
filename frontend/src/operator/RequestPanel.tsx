import { useEffect, useId, useState, type FormEvent } from 'react'
import type { InboxItem, RequestDetail, SaveAs, StaffRole } from '../../../shared/types'
import { api } from '../shared/api'
import { firstName, formatTime } from '../shared/format'
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  FileIcon,
  ForwardIcon,
  InfoIcon,
  StarIcon,
} from '../shared/icons'
import { RouteBadge, TestBadge } from './Badges'
import { earlierLine, ROUTER_LABELS, SCORE_LABELS, when } from './model'
import { useInbox } from './OperatorApp'
import { RetryButton } from './RetryButton'

const ROLES: StaffRole[] = ['Director', 'Office', 'Classroom teacher', 'Kitchen']

/** Detail pane for one request (PLAN.md 4.4), top to bottom as in the design. */
export function RequestPanel({ item }: { item: InboxItem }) {
  const [detail, setDetail] = useState<RequestDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Refetch whenever the request changes (seen, forwarded, replied, from any device).
  useEffect(() => {
    let cancelled = false
    api
      .requestDetail(item.id)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [item.id, item.updatedAt, attempt])

  const retry = () => {
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  const parentFirst = firstName(item.parentName)

  return (
    <article className="request" aria-label="Selected conversation">
      <div className="request-head">
        <div>
          <h2>{item.parentName}</h2>
          <span className="request-sub">
            Parent of {item.childName} · {item.room} room · {when(item.createdAt)}
          </span>
        </div>
        <div className="request-badges">
          {item.isTest && <TestBadge />}
          <RouteBadge route={item.route} large />
        </div>
      </div>

      <div className="request-section">
        <span className="section-label">Message</span>
        <p className="request-message">{item.text}</p>
        {detail?.earlier && <span className="request-earlier">{earlierLine(detail.earlier)}</span>}
      </div>

      {!detail && !failed && <p className="muted">Loading details…</p>}
      {failed && !detail && (
        <div className="request-error">
          <p>Couldn't load the details.</p>
          <RetryButton onClick={retry} />
        </div>
      )}
      {detail && (
        <>
          <WhyBox detail={detail} />

          {detail.aiAnswer && (
            <div className="request-section">
              <span className="section-label">What {parentFirst} already heard</span>
              <div className="heard">
                <p>{detail.aiAnswer.text}</p>
                {detail.aiAnswer.citations.length > 0 && (
                  <div className="heard-chips">
                    {detail.aiAnswer.citations.map((id) => (
                      <span key={id} className="heard-chip">
                        <FileIcon size={14} />
                        {detail.knowledge.find((k) => k.id === id)?.title ?? id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {detail.replies.length > 0 && (
            <div className="request-section">
              <span className="section-label">Your replies</span>
              {detail.replies.map((m) => (
                <div key={m.id} className="sent-reply">
                  <p>{m.text}</p>
                  <span>Sent {formatTime(m.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          <ForwardRow item={item} />
          <ReplyForm item={item} detail={detail} />
        </>
      )}
    </article>
  )
}

function WhyBox({ detail }: { detail: RequestDetail }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { reason, scores, router, topic } = detail.request

  return (
    <div className="why">
      <div className="why-row">
        <span className="why-text">
          <InfoIcon size={18} />
          <span>
            <strong>Why this came to you:</strong> {reason}.
          </span>
        </span>
        <button
          type="button"
          className="text-button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          Details
          <ChevronDownIcon size={16} className={open ? 'is-flipped' : undefined} />
        </button>
      </div>
      {open && (
        <div id={panelId} className="why-details">
          {scores ? (
            <dl className="scores">
              {SCORE_LABELS.map(([key, label]) => (
                <div key={key} className="score">
                  <dt>{label}</dt>
                  <dd>
                    <span className="score-bar">
                      <span style={{ width: `${Math.round(scores[key] * 100)}%` }} />
                    </span>
                    <span className="score-value">{scores[key].toFixed(2)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted">No scores: routing didn't complete.</p>
          )}
          <p className="muted">
            Topic: {topic}
            {scores?.sensitive_kind &&
            scores.sensitive_kind !== 'none' &&
            scores.is_sensitive >= 0.5
              ? ` · Sensitive kind: ${scores.sensitive_kind.replace('_', ' ')}`
              : ''}
            {' · '}Router: {ROUTER_LABELS[router]}
          </p>
        </div>
      )}
    </div>
  )
}

function ForwardRow({ item }: { item: InboxItem }) {
  const { upsert } = useInbox()
  const [role, setRole] = useState<StaffRole>(item.forwardedTo ?? item.suggestedRole)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const selectId = useId()

  const forward = async () => {
    setBusy(true)
    setNote(null)
    try {
      upsert(await api.forward(item.id, role))
      setNote({
        ok: true,
        text: `Forwarded to ${role}. ${firstName(item.parentName)}'s status card is updated.`,
      })
    } catch {
      setNote({ ok: false, text: "Couldn't forward just now. Please try again." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="forward">
      <div className="forward-row">
        <span className="suggested">
          <StarIcon size={14} />
          Suggested: {item.suggestedRole}
        </span>
        <label htmlFor={selectId} className="sr-only">
          Forward to
        </label>
        <select id={selectId} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button type="button" className="btn btn-outline" onClick={forward} disabled={busy}>
          <ForwardIcon size={18} />
          Forward
        </button>
      </div>
      {note && (
        <p className={`action-note${note.ok ? '' : ' is-error'}`} role="status">
          {note.text}
        </p>
      )}
    </div>
  )
}

function ReplyForm({ item, detail }: { item: InboxItem; detail: RequestDetail }) {
  const { upsert } = useInbox()
  const [text, setText] = useState('')
  const [save, setSave] = useState(false)
  const [target, setTarget] = useState<'existing' | 'create'>('existing')
  const [entryId, setEntryId] = useState(detail.suggestedEntryId ?? detail.knowledge[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const ids = { reply: useId(), entry: useId() }
  const parentFirst = firstName(item.parentName)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    const saveAs: SaveAs | undefined = !save
      ? undefined
      : target === 'create'
        ? { create: true }
        : { entryId }
    setBusy(true)
    setNote(null)
    try {
      const result = await api.reply(item.id, text.trim(), saveAs)
      upsert(result.request)
      setText('')
      setSave(false)
      setNote({
        ok: true,
        text: result.savedEntry
          ? `Reply sent to ${parentFirst} and saved to “${result.savedEntry.title}”. The AI will use it next time.`
          : `Reply sent to ${parentFirst}.`,
      })
    } catch {
      setNote({ ok: false, text: "Couldn't send the reply. Please try again." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="reply" onSubmit={submit}>
      <label htmlFor={ids.reply} className="reply-label">
        Reply to {parentFirst}
      </label>
      <textarea
        id={ids.reply}
        rows={4}
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Write to ${parentFirst} as Dana. This appears in their chat.`}
      />

      <div className={`save-box${save ? ' is-on' : ''}`}>
        <label className="save-toggle">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
          Save as answer
          <span className="muted">so the AI can answer this next time</span>
        </label>
        {save && (
          <fieldset className="save-targets">
            <legend className="sr-only">Where to save it</legend>
            <div className="save-option">
              <label>
                <input
                  type="radio"
                  name={`save-target-${item.id}`}
                  checked={target === 'existing'}
                  onChange={() => setTarget('existing')}
                />
                Add to existing entry
              </label>
              <label htmlFor={ids.entry} className="sr-only">
                Entry
              </label>
              <select
                id={ids.entry}
                value={entryId}
                disabled={target !== 'existing'}
                onChange={(e) => setEntryId(e.target.value)}
              >
                {detail.knowledge.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.title} ({k.category})
                  </option>
                ))}
              </select>
            </div>
            <label className="save-option">
              <input
                type="radio"
                name={`save-target-${item.id}`}
                checked={target === 'create'}
                onChange={() => setTarget('create')}
              />
              Create a new entry from this reply
            </label>
          </fieldset>
        )}
      </div>

      <div className="reply-actions">
        {note && (
          <p className={`action-note${note.ok ? ' is-ok' : ' is-error'}`} role="status">
            {note.ok && <CheckIcon size={14} />}
            {note.text}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          {busy ? 'Sending…' : 'Send reply'}
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </form>
  )
}
