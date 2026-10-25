import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import type { InboxItem } from '../../../shared/types'
import { api } from '../shared/api'
import { usePolling } from '../shared/usePolling'
import { Inbox } from './Inbox'
import { Insights } from './Insights'
import { Knowledge } from './Knowledge'
import { KnowledgeEditorPage } from './KnowledgeEditor'
import { newArrivals } from './model'
import { Shell } from './Shell'
import { TestModeProvider } from './TestMode'
import { TestResults } from './TestResults'
import './operator.css'

interface InboxState {
  items: InboxItem[] | null
  failed: boolean
  /** Ids that arrived since the operator opened the page; they slide in and glow briefly. */
  fresh: ReadonlySet<string>
  /** Apply a change made here right away instead of waiting for the next poll. */
  upsert: (item: InboxItem) => void
}

const InboxContext = createContext<InboxState | null>(null)

export function useInbox(): InboxState {
  const state = useContext(InboxContext)
  if (!state) throw new Error('useInbox outside OperatorApp')
  return state
}

const FRESH_MS = 4000

/** Operator control center at /operator (PLAN.md 4.4). */
export function OperatorApp() {
  const [items, setItems] = useState<InboxItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  const known = useRef<Set<string> | null>(null)

  const load = useCallback(async () => {
    try {
      const next = await api.inbox()
      setFailed(false)
      setItems(next)
      if (known.current) {
        const arrived = newArrivals(known.current, next)
        if (arrived.length) {
          setFresh((prev) => new Set([...prev, ...arrived]))
          setTimeout(
            () => setFresh((prev) => new Set([...prev].filter((id) => !arrived.includes(id)))),
            FRESH_MS,
          )
        }
      }
      known.current = new Set(next.map((i) => i.id))
    } catch {
      setFailed(true)
    }
  }, [])

  usePolling(load, 2000, true, true)

  const upsert = useCallback((item: InboxItem) => {
    setItems((prev) => prev?.map((i) => (i.id === item.id ? item : i)) ?? prev)
  }, [])

  return (
    <InboxContext.Provider value={{ items, failed, fresh, upsert }}>
      <TestModeProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Navigate to="inbox" replace />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="inbox/:inquiryId" element={<Inbox />} />
            <Route path="knowledge" element={<Knowledge />} />
            <Route path="knowledge/:entryId" element={<KnowledgeEditorPage />} />
            <Route path="insights" element={<Insights />} />
            <Route path="test" element={<TestResults />} />
            <Route path="*" element={<Navigate to="inbox" replace />} />
          </Route>
        </Routes>
      </TestModeProvider>
    </InboxContext.Provider>
  )
}
