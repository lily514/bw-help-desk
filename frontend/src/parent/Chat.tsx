import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CENTER_PHONE } from '../../../shared/copy'
import type { Message, Parent, ThreadRequest, ThreadResponse } from '../../../shared/types'
import { api, ApiError } from '../shared/api'
import { firstName } from '../shared/format'
import { ArrowUpIcon, LogOutIcon } from '../shared/icons'
import { Logo } from '../shared/Logo'
import { usePolling } from '../shared/usePolling'
import { AiAnswer, AiText, ParentBubble, StaffBubble, TypingBubble } from './Bubbles'
import { PolicySheet } from './PolicySheet'
import { clearParentId } from './session'
import { StatusCard } from './StatusCard'
import { buildThreadItems } from './thread'
import { UrgentBanner } from './UrgentBanner'

/** The AI reply currently streaming in. */
interface Pending {
  localQuestionId: string
  requestId?: string
  text: string
  startedAt: string
}

const PENDING_ID = 'pending-reply'

export function Chat({ parentId, onSignOut }: { parentId: string; onSignOut: () => void }) {
  const navigate = useNavigate()
  const [parent, setParent] = useState<Parent | null>(null)
  const [messages, setMessages] = useState<Map<string, Message>>(new Map())
  const [requests, setRequests] = useState<Map<string, ThreadRequest>>(new Map())
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const pendingRef = useRef<Pending | null>(null)
  const cursor = useRef<string | undefined>(undefined)
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [asking, setAsking] = useState<Set<string>>(new Set())

  // Read through a function: TypeScript doesn't track ref mutations across awaits.
  const currentPending = (): Pending | null => pendingRef.current
  const updatePending = (next: Pending | null) => {
    pendingRef.current = next
    setPending(next)
  }

  const merge = useCallback((incoming: Message[], incomingRequests: ThreadRequest[]) => {
    if (incoming.length) {
      setMessages((prev) => {
        const next = new Map(prev)
        for (const m of incoming) next.set(m.id, m)
        return next
      })
      // The poll can deliver the saved reply before the stream's `done` event.
      const current = pendingRef.current
      if (
        current?.requestId &&
        incoming.some((m) => m.role === 'ai' && m.requestId === current.requestId)
      ) {
        updatePending(null)
      }
    }
    if (incomingRequests.length) {
      setRequests((prev) => {
        const next = new Map(prev)
        for (const r of incomingRequests) next.set(r.id, r)
        return next
      })
    }
  }, [])

  const applyThread = useCallback(
    (thread: ThreadResponse) => {
      merge(thread.messages, thread.requests)
      cursor.current = thread.serverTime
    },
    [merge],
  )

  const signOut = useCallback(() => {
    clearParentId()
    onSignOut()
    navigate('/parent')
  }, [navigate, onSignOut])

  // Initial load.
  useEffect(() => {
    let cancelled = false
    Promise.all([api.getParent(parentId), api.thread(parentId), api.listKnowledge()])
      .then(([p, thread, kb]) => {
        if (cancelled) return
        setParent(p)
        applyThread(thread)
        setTitles(Object.fromEntries(kb.map((e) => [e.id, e.title])))
      })
      .catch((err) => {
        if (cancelled) return
        // The demo parent was removed by a test-data reset: back to sign-in.
        if (err instanceof ApiError && err.status === 404) signOut()
        else setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [parentId, applyThread, signOut])

  usePolling(
    async () => applyThread(await api.thread(parentId, cursor.current)),
    2000,
    parent !== null,
  )

  const send = async (text: string) => {
    if (!text || pendingRef.current) return
    setNotice(null)
    setDraft('')

    const now = new Date().toISOString()
    const local: Message = {
      id: `local-${Date.now()}`,
      parentId,
      role: 'parent',
      text,
      citations: [],
      staffName: null,
      staffRole: null,
      requestId: null,
      isTest: false,
      createdAt: now,
    }
    setMessages((prev) => new Map(prev).set(local.id, local))
    updatePending({ localQuestionId: local.id, text: '', startedAt: now })

    let savedQuestionId = ''
    try {
      for await (const event of api.chat(parentId, text)) {
        if (event.event === 'user') {
          const saved = event.data.message
          savedQuestionId = saved.id
          setMessages((prev) => {
            const next = new Map(prev)
            next.delete(local.id)
            next.set(saved.id, saved)
            return next
          })
          const current = currentPending()
          if (current) updatePending({ ...current, requestId: saved.requestId ?? undefined })
        } else if (event.event === 'route') {
          const { requestId, route, status, suggestedRole } = event.data
          setRequests((prev) => {
            const existing = prev.get(requestId)
            const at = new Date().toISOString()
            return new Map(prev).set(requestId, {
              id: requestId,
              messageId: savedQuestionId,
              route,
              status,
              suggestedRole,
              forwardedTo: existing?.forwardedTo ?? null,
              createdAt: existing?.createdAt ?? at,
              updatedAt: at,
            })
          })
        } else if (event.event === 'delta') {
          const current = currentPending()
          if (current) updatePending({ ...current, text: current.text + event.data.text })
        } else if (event.event === 'done') {
          merge([event.data.message], [])
          updatePending(null)
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const next = new Map(prev)
        next.delete(local.id)
        return next
      })
      setDraft(text)
      setNotice(
        err instanceof ApiError && err.status === 429
          ? err.message
          : `We couldn't send that. Please try again, or call the center at ${CENTER_PHONE}.`,
      )
    } finally {
      if (currentPending()?.localQuestionId === local.id) updatePending(null)
    }
  }

  const askPerson = async (requestId: string) => {
    setAsking((prev) => new Set(prev).add(requestId))
    try {
      const updated = await api.askPerson(requestId)
      setRequests((prev) => new Map(prev).set(updated.id, updated))
    } catch {
      setNotice(`We couldn't reach Dana just now. Please call the center at ${CENTER_PHONE}.`)
    } finally {
      setAsking((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  const items = useMemo(() => {
    const all = [...messages.values()]
    if (pending) {
      // Always after the newest message: the saved question has a server timestamp,
      // which can be later than this device's clock.
      const newest = Math.max(
        Date.parse(pending.startedAt),
        ...all.map((m) => Date.parse(m.createdAt)),
      )
      all.push({
        id: PENDING_ID,
        parentId,
        role: 'ai',
        text: pending.text,
        citations: [],
        staffName: null,
        staffRole: null,
        requestId: pending.requestId ?? null,
        isTest: false,
        createdAt: new Date(newest + 1).toISOString(),
      })
    }
    return buildThreadItems(all, [...requests.values()])
  }, [messages, requests, pending, parentId])

  const showUrgent = [...requests.values()].some(
    (r) => r.route === 'urgent' && r.status !== 'replied',
  )

  // Keep the newest message in view unless the parent has scrolled up to read.
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [items, showUrgent])
  const onScroll = () => {
    const el = scrollRef.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const childName = parent?.childName ?? ''
  const greeting = parent && (
    <AiText
      text={`Hi ${firstName(parent.name)}, ask me anything about Maple Grove. If it needs a person, I'll make sure Dana sees it.`}
    />
  )
  const closeSheet = useCallback(() => setSheetId(null), [])

  return (
    <div className="screen chat">
      <header className="chat-header">
        <Logo size={40} />
        <div className="chat-header-text">
          <span className="chat-header-title">Maple Grove</span>
          <span className="chat-header-subtitle">Front desk</span>
        </div>
        <button
          type="button"
          className="icon-button chat-signout"
          aria-label="Switch parent"
          title="Switch parent"
          onClick={signOut}
        >
          <LogOutIcon size={20} />
        </button>
      </header>

      {showUrgent && <UrgentBanner />}

      <main
        className="thread"
        ref={scrollRef}
        onScroll={onScroll}
        aria-live="polite"
        aria-busy={!!pending}
      >
        {loadError && (
          <p className="thread-note">
            We couldn't load your messages. Check your connection and refresh.
          </p>
        )}
        {parent && (
          <>
            {items.length === 0 && (
              <>
                <p className="divider">Today</p>
                {greeting}
              </>
            )}
            {items.map((item, index) => {
              if (item.kind === 'divider') {
                return (
                  <Fragment key={item.key}>
                    <p className="divider">{item.label}</p>
                    {index === 0 && greeting}
                  </Fragment>
                )
              }
              if (item.kind === 'status') {
                return <StatusCard key={item.key} request={item.request} childName={childName} />
              }
              const m = item.message
              if (m.role === 'parent') return <ParentBubble key={item.key} message={m} />
              if (m.role === 'staff') return <StaffBubble key={item.key} message={m} />
              if (m.id === PENDING_ID && !m.text) return <TypingBubble key={item.key} />
              const request = m.requestId ? requests.get(m.requestId) : undefined
              return (
                <AiAnswer
                  key={item.key}
                  message={m}
                  titles={titles}
                  onOpenCitation={setSheetId}
                  streaming={m.id === PENDING_ID}
                  askingPerson={!!request && asking.has(request.id)}
                  onAskPerson={
                    request?.route === 'answered' && m.id !== PENDING_ID
                      ? () => askPerson(request.id)
                      : undefined
                  }
                />
              )
            })}
          </>
        )}
      </main>

      {notice && (
        <p className="composer-notice" role="alert">
          {notice}
        </p>
      )}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          void send(draft.trim())
        }}
      >
        <label htmlFor="message" className="sr-only">
          Message
        </label>
        <input
          id="message"
          type="text"
          placeholder="Ask about Maple Grove"
          autoComplete="off"
          maxLength={1000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!parent}
        />
        <button
          type="submit"
          className="send"
          aria-label="Send"
          disabled={!draft.trim() || !!pending || !parent}
        >
          <ArrowUpIcon size={20} />
        </button>
      </form>

      {sheetId && <PolicySheet entryId={sheetId} onClose={closeSheet} />}
    </div>
  )
}
