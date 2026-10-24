import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { InboxItem } from '../../../shared/types'
import { api } from '../shared/api'
import { ChevronLeftIcon } from '../shared/icons'
import { RouteBadge, TestBadge } from './Badges'
import { inboxSummary, listTime, statusLabel } from './model'
import { useInbox } from './OperatorApp'
import { RequestPanel } from './RequestPanel'

/** Two panes on a laptop; list or detail on a phone (PLAN.md 4.4). */
export function Inbox() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const { items, failed, fresh, upsert } = useInbox()
  const selected = items?.find((i) => i.id === requestId)

  // Opening an item marks it Seen.
  const marking = useRef<string | null>(null)
  useEffect(() => {
    if (!selected || selected.status !== 'new' || marking.current === selected.id) return
    marking.current = selected.id
    api
      .markSeen(selected.id)
      .then(upsert)
      .catch(() => {})
  }, [selected, upsert])

  return (
    <div className={`inbox${requestId ? ' has-selection' : ''}`}>
      <section className="inbox-list" aria-label="Conversations">
        <div className="inbox-list-head">
          <span className="inbox-list-title">Needs you</span>
          {items && <span className="inbox-list-meta">{inboxSummary(items)}</span>}
        </div>
        {!items && !failed && <p className="inbox-empty">Loading…</p>}
        {failed && !items && (
          <p className="inbox-empty">Couldn't load the inbox. Retrying every few seconds.</p>
        )}
        {items?.length === 0 && (
          <p className="inbox-empty">
            Nothing needs you right now. Questions the AI can't fully answer will appear here.
          </p>
        )}
        {items?.map((item) => (
          <InboxRow
            key={item.id}
            item={item}
            selected={item.id === requestId}
            fresh={fresh.has(item.id)}
            onOpen={() => navigate(`/operator/inbox/${item.id}`)}
          />
        ))}
      </section>

      <div className="inbox-detail">
        <Link to="/operator/inbox" className="back-link">
          <ChevronLeftIcon size={18} />
          Inbox
        </Link>
        {selected ? (
          <RequestPanel key={selected.id} item={selected} />
        ) : (
          <div className="empty-card">
            <p>
              {requestId && items
                ? 'This conversation is no longer in the inbox.'
                : 'Select a conversation to read it and reply.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function InboxRow({
  item,
  selected,
  fresh,
  onOpen,
}: {
  item: InboxItem
  selected: boolean
  fresh: boolean
  onOpen: () => void
}) {
  const pinned = item.route === 'urgent' && item.status !== 'replied'
  const isNew = item.status === 'new'
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? 'true' : undefined}
      className={[
        'inbox-row',
        pinned && 'is-pinned',
        selected && 'is-selected',
        fresh && 'is-fresh',
        isNew && 'is-new',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="inbox-row-top">
        <span className="inbox-row-name">
          {item.parentName} · {item.childName}
        </span>
        <span className="inbox-row-time">{listTime(item.createdAt)}</span>
      </span>
      <span className="inbox-row-text">{item.text}</span>
      <span className="inbox-row-meta">
        <RouteBadge route={item.route} />
        {item.isTest && <TestBadge />}
        <span className={`inbox-row-status${isNew ? ' is-new' : ''}`}>{statusLabel(item)}</span>
      </span>
    </button>
  )
}
