import {
  CANNED_REPLIES,
  gradeResult,
  LEARN_SCENARIO,
  SAVE_ENTRY_ID,
  SAVE_SCENARIO,
  SAVED_REPLY,
  TEST_SCENARIOS,
  type TestResult,
  type TestScenario,
} from '../../../shared/testScenarios'
import type { Route, SaveAs } from '../../../shared/types'

/** Seconds between scripted questions, and before the automated operator replies (PLAN.md 4.5). */
export const SEND_INTERVAL_MS = 4000
export const REPLY_DELAY_MS = 3000

export type RunStatus = 'idle' | 'resetting' | 'running' | 'paused' | 'complete' | 'failed'

export interface RunState {
  status: RunStatus
  runId: string | null
  /** Scenarios sent so far in this run. */
  sent: number
  /** The automated operator's reply to #3 was saved as knowledge. */
  savedReply: boolean
  error: string | null
}

export const INITIAL_RUN: RunState = {
  status: 'idle',
  runId: null,
  sent: 0,
  savedReply: false,
  error: null,
}

/** Everything the runner does to the outside world; the real ones call the API. */
export interface RunnerDeps {
  reset: () => Promise<void>
  /** Parent id for a scenario's child: Sam for Maya, a test parent otherwise. */
  parentFor: (child: TestScenario['child']) => Promise<string>
  /** Sends a question as a test message; resolves with the final route once the reply is done. */
  ask: (parentId: string, text: string) => Promise<{ inquiryId: string; route: Route }>
  reply: (inquiryId: string, text: string, saveAs?: SaveAs) => Promise<void>
  record: (result: {
    runId: string
    scenarioNum: number
    actual: Route
    savedReply: boolean
  }) => Promise<TestResult>
  sleep: (ms: number) => Promise<void>
  now: () => number
  newRunId: () => string
}

export interface RunnerEvents {
  onState: (state: RunState) => void
  onResult: (result: TestResult) => void
}

/**
 * Client-driven test run (PLAN.md 4.5). The automated parent sends the scripted
 * questions one every ~4 seconds; the automated operator replies to escalated ones
 * ~3 seconds later with canned replies, saving its reply to #3 as knowledge. #15
 * waits for that save, so it shows the system learning.
 */
export class TestRunner {
  private state: RunState = INITIAL_RUN
  private index = 0
  private looping = false
  private pauseRequested = false
  private disposed = false
  private replies: Promise<void>[] = []
  private saved: Promise<boolean> | null = null
  private parents = new Map<TestScenario['child'], string>()

  constructor(
    private readonly deps: RunnerDeps,
    private readonly events: RunnerEvents,
  ) {}

  get current(): RunState {
    return this.state
  }

  /** Run: resume a paused or failed run, otherwise reset and start a new one. */
  async run(): Promise<void> {
    if (this.looping && this.pauseRequested) {
      // Paused but the current question is still in flight: just keep going.
      this.pauseRequested = false
      this.set({ status: 'running' })
      return
    }
    if (this.looping || this.state.status === 'resetting') return
    const resumable = this.state.status === 'paused' || this.state.status === 'failed'
    if (resumable && this.state.runId) return this.loop()

    this.set({ ...INITIAL_RUN, status: 'resetting' })
    try {
      // A fresh run starts from the handbook KB, so #3 needs Dana again.
      await this.deps.reset()
    } catch (err) {
      this.set({ status: 'failed', error: `Couldn't reset: ${message(err)}` })
      return
    }
    this.clear()
    this.set({ ...INITIAL_RUN, status: 'running', runId: this.deps.newRunId() })
    return this.loop()
  }

  /** Stops before the next question; anything in flight finishes. */
  pause(): void {
    if (this.state.status !== 'running') return
    this.pauseRequested = true
    this.set({ status: 'paused' })
  }

  /** Reset from the bar: only while nothing is in flight. */
  async reset(): Promise<void> {
    if (this.looping || this.state.status === 'resetting') return
    this.set({ ...INITIAL_RUN, status: 'resetting' })
    try {
      await this.deps.reset()
      this.clear()
      this.set({ ...INITIAL_RUN })
    } catch (err) {
      this.set({ status: 'failed', error: `Couldn't reset: ${message(err)}` })
    }
  }

  dispose(): void {
    this.disposed = true
  }

  private clear(): void {
    this.index = 0
    this.replies = []
    this.saved = null
    // Reset deletes test parents, so they're created again on the next run.
    this.parents.clear()
  }

  private async loop(): Promise<void> {
    const runId = this.state.runId
    if (!runId) return
    this.looping = true
    this.pauseRequested = false
    this.set({ status: 'running', error: null })
    try {
      for (; this.index < TEST_SCENARIOS.length; this.index++) {
        if (this.disposed) return
        if (this.pauseRequested) return this.set({ status: 'paused' })

        const scenario = TEST_SCENARIOS[this.index]
        const started = this.deps.now()
        if (scenario.num === LEARN_SCENARIO && this.saved) await this.saved

        let parentId: string
        let sent: { inquiryId: string; route: Route }
        try {
          parentId = await this.parentFor(scenario.child)
          sent = await this.deps.ask(parentId, scenario.question)
        } catch (err) {
          return this.set({
            status: 'failed',
            error: `Couldn't send #${scenario.num}: ${message(err)}`,
          })
        }
        if (this.disposed) return
        this.set({ sent: this.index + 1 })

        try {
          const result = await this.deps.record({
            runId,
            scenarioNum: scenario.num,
            actual: sent.route,
            savedReply: this.state.savedReply,
          })
          if (!this.disposed) this.events.onResult(result)
        } catch (err) {
          return this.set({
            status: 'failed',
            error: `Couldn't save the result for #${scenario.num}: ${message(err)}`,
          })
        }

        if (sent.route !== 'answered') this.operatorReply(scenario, sent.inquiryId, sent.route)

        const isLast = this.index === TEST_SCENARIOS.length - 1
        if (!isLast)
          await this.deps.sleep(Math.max(0, SEND_INTERVAL_MS - (this.deps.now() - started)))
      }

      await Promise.all(this.replies)
      if (!this.disposed) this.set({ status: 'complete' })
    } finally {
      this.looping = false
    }
  }

  private async parentFor(child: TestScenario['child']): Promise<string> {
    const known = this.parents.get(child)
    if (known) return known
    const id = await this.deps.parentFor(child)
    this.parents.set(child, id)
    return id
  }

  /** The automated operator: a canned reply ~3 seconds later; #3's is saved as knowledge. */
  private operatorReply(scenario: TestScenario, inquiryId: string, route: Route): void {
    const save = scenario.num === SAVE_SCENARIO
    const text = save ? SAVED_REPLY : CANNED_REPLIES[route as Exclude<Route, 'answered'>]
    const done = this.deps
      .sleep(REPLY_DELAY_MS)
      .then(() => this.deps.reply(inquiryId, text, save ? { entryId: SAVE_ENTRY_ID } : undefined))
      .then(
        () => true,
        () => false,
      )
    if (save) {
      this.saved = done.then((ok) => {
        if (ok && !this.disposed) this.set({ savedReply: true })
        return ok
      })
    }
    this.replies.push(done.then(() => undefined))
  }

  private set(patch: Partial<RunState>): void {
    this.state = { ...this.state, ...patch }
    if (!this.disposed) this.events.onState(this.state)
  }
}

const TOTAL = TEST_SCENARIOS.length

/** The bar's status line; `stored` is how many results are on screen from an earlier run. */
export function runStatusText(run: RunState, stored: number): string {
  switch (run.status) {
    case 'resetting':
      return 'Resetting test data…'
    case 'running':
      return `Running · ${run.sent} of ${TOTAL} sent`
    case 'paused':
      return `Paused · ${run.sent} of ${TOTAL} sent`
    case 'complete':
      return `Run complete · ${TOTAL} of ${TOTAL} questions sent · automated parent and operator`
    case 'failed':
      return `Stopped · ${run.error ?? 'something went wrong'}. Run to retry.`
    case 'idle':
      return stored
        ? `Last run · ${stored} of ${TOTAL} questions sent`
        : `Ready · ${TOTAL} scripted questions, automated parent and operator`
  }
}

export type RowTone = 'pending' | 'pass' | 'learned' | 'over' | 'missed' | 'unsafe'

/** How a results-table row looks (PLAN.md 4.5): amber over-escalation, red unsafe, green learned. */
export function resultRow(
  scenario: TestScenario,
  result: TestResult | undefined,
  savedReply: boolean,
): { tone: RowTone; label: string; note: string | null } {
  if (!result) return { tone: 'pending', label: '—', note: null }
  const savedNote =
    scenario.num === SAVE_SCENARIO && savedReply ? 'Dana replied and saved it as an answer' : null

  switch (gradeResult(result.expected, result.actual)) {
    case 'pass':
      return result.learned
        ? {
            tone: 'learned',
            label: 'Pass',
            note: 'Learned: answered from the reply Dana saved in #3',
          }
        : { tone: 'pass', label: 'Pass', note: savedNote }
    case 'over_escalated':
      return {
        tone: 'over',
        label: 'Fail',
        note:
          result.expected === 'answered'
            ? "Over-escalated: safe, but Dana didn't need to see it"
            : 'Over-escalated: safe, but sent higher than needed',
      }
    case 'missed':
      return {
        tone: 'missed',
        label: 'Fail',
        note:
          result.expected === 'urgent'
            ? 'Missed: staff should have been alerted right away'
            : 'Missed: a person should have been looped in',
      }
    case 'unsafe_miss':
      return { tone: 'unsafe', label: 'Unsafe miss', note: 'Unsafe miss: the AI answered alone' }
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
