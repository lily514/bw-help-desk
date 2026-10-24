import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { TEST_PARENTS, type TestResult } from '../../../shared/testScenarios'
import type { Route } from '../../../shared/types'
import { DEMO_PARENT_ID } from '../parent/session'
import { api, ApiError } from '../shared/api'
import { PauseIcon, PlayIcon, ResetIcon } from '../shared/icons'
import { INITIAL_RUN, runStatusText, TestRunner, type RunnerDeps, type RunState } from './testRun'

interface TestModeState {
  enabled: boolean
  setEnabled: (on: boolean) => void
  run: RunState
  /** The current run's results, or the latest stored run's after a reload. */
  results: TestResult[]
  start: () => void
  pause: () => void
  reset: () => void
}

const TestModeContext = createContext<TestModeState | null>(null)

export function useTestMode(): TestModeState {
  const state = useContext(TestModeContext)
  if (!state) throw new Error('useTestMode outside TestModeProvider')
  return state
}

const STORAGE_KEY = 'maple-grove.testMode'
const RATE_LIMIT_WAIT_MS = 15_000

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the switch just won't be remembered.
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Sends one test question and reads the stream to the end; the last route event wins. */
async function ask(parentId: string, text: string): Promise<{ requestId: string; route: Route }> {
  for (;;) {
    try {
      let sent: { requestId: string; route: Route } | null = null
      for await (const event of api.chat(parentId, text, true)) {
        if (event.event === 'route') sent = event.data
      }
      if (!sent) throw new Error('No route in the reply')
      return sent
    } catch (err) {
      // The per-IP chat limit (PLAN.md 2.3): wait it out rather than fail the run.
      if (err instanceof ApiError && err.status === 429) await sleep(RATE_LIMIT_WAIT_MS)
      else throw err
    }
  }
}

const deps: RunnerDeps = {
  reset: async () => {
    await api.testReset(false)
  },
  parentFor: async (child) => {
    if (child === 'Maya') return DEMO_PARENT_ID
    const { name, room } = TEST_PARENTS[child]
    return (await api.createParent({ name, childName: child, room, isTest: true })).id
  },
  ask,
  reply: async (requestId, text, saveAs) => {
    await api.reply(requestId, text, saveAs)
  },
  record: (result) => api.testResult(result),
  sleep,
  now: () => Date.now(),
  newRunId: () => crypto.randomUUID(),
}

/** Test mode for the operator app (PLAN.md 4.5): the switch, the runner and its results. */
export function TestModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(readEnabled)
  const [run, setRun] = useState<RunState>(INITIAL_RUN)
  const [results, setResults] = useState<TestResult[]>([])
  const runner = useRef<TestRunner | null>(null)

  useEffect(() => {
    const r = new TestRunner(deps, {
      onState: (state) => {
        setRun(state)
        if (state.status === 'resetting') setResults([])
      },
      onResult: (result) =>
        setResults((prev) => [...prev.filter((p) => p.scenarioNum !== result.scenarioNum), result]),
    })
    runner.current = r
    return () => r.dispose()
  }, [])

  // The latest stored run, so results survive a reload.
  useEffect(() => {
    api
      .testResults()
      .then((res) => setResults((prev) => (prev.length ? prev : res.results)))
      .catch(() => {})
  }, [])

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on)
    writeEnabled(on)
    if (!on) runner.current?.pause()
  }, [])

  const start = useCallback(() => void runner.current?.run(), [])
  const pause = useCallback(() => runner.current?.pause(), [])
  const reset = useCallback(() => void runner.current?.reset(), [])

  return (
    <TestModeContext.Provider value={{ enabled, setEnabled, run, results, start, pause, reset }}>
      {children}
    </TestModeContext.Provider>
  )
}

/** Header switch (PLAN.md 4.4). */
export function TestModeSwitch() {
  const { enabled, setEnabled } = useTestMode()
  return (
    <label className="test-switch">
      <input
        type="checkbox"
        role="switch"
        className="sr-only"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
      />
      <span className="test-switch-track" aria-hidden="true">
        <span className="test-switch-thumb" />
      </span>
      Test mode
    </label>
  )
}

/** Slim dark bar under the header while test mode is on (PLAN.md 4.5). */
export function TestBar() {
  const { enabled, run, results, start, pause, reset } = useTestMode()
  const { pathname } = useLocation()
  if (!enabled) return null

  const busy = run.status === 'running' || run.status === 'resetting'
  return (
    <div role="region" aria-label="Test controls" className="test-bar">
      <div className="test-bar-status">
        <span className="test-bar-badge">Test</span>
        <span aria-live="polite">{runStatusText(run, results.length)}</span>
        {!pathname.startsWith('/operator/test') && (
          <Link to="/operator/test" className="test-bar-link">
            See results
          </Link>
        )}
      </div>
      <div className="test-bar-actions">
        <button type="button" className="test-btn test-btn-run" onClick={start} disabled={busy}>
          <PlayIcon size={14} />
          Run
        </button>
        <button
          type="button"
          className="test-btn"
          onClick={pause}
          disabled={run.status !== 'running'}
        >
          <PauseIcon size={14} />
          Pause
        </button>
        <button type="button" className="test-btn" onClick={reset} disabled={busy}>
          <ResetIcon size={14} />
          Reset
        </button>
      </div>
    </div>
  )
}
