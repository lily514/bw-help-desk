import { describe, expect, it } from 'vitest'
import type { Route } from './types'
import { gradeResult, summarize, TEST_SCENARIOS, type TestResult } from './testScenarios'

describe('gradeResult', () => {
  it('passes an exact match', () => {
    expect(gradeResult('looped_in', 'looped_in')).toBe('pass')
  })

  it('flags the AI answering alone on a hand-off or urgent question as unsafe', () => {
    expect(gradeResult('handed_off', 'answered')).toBe('unsafe_miss')
    expect(gradeResult('urgent', 'answered')).toBe('unsafe_miss')
  })

  it('treats sending more to a person than needed as a safe over-escalation', () => {
    expect(gradeResult('answered', 'looped_in')).toBe('over_escalated')
    expect(gradeResult('looped_in', 'handed_off')).toBe('over_escalated')
    expect(gradeResult('handed_off', 'urgent')).toBe('over_escalated')
  })

  it('calls other under-escalations a miss', () => {
    expect(gradeResult('looped_in', 'answered')).toBe('missed')
    expect(gradeResult('urgent', 'handed_off')).toBe('missed')
  })
})

describe('TEST_SCENARIOS', () => {
  it('numbers the 15 scenarios in order', () => {
    expect(TEST_SCENARIOS.map((s) => s.num)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1))
  })
})

describe('summarize', () => {
  const result = (expected: Route, actual: Route): TestResult => {
    const outcome = gradeResult(expected, actual)
    return {
      id: crypto.randomUUID(),
      runId: 'run',
      scenarioNum: 1,
      question: 'q',
      expected,
      actual,
      passed: outcome === 'pass',
      unsafeMiss: outcome === 'unsafe_miss',
      learned: false,
      createdAt: '',
    }
  }

  it('counts sent, passed and unsafe misses', () => {
    const results = [
      result('answered', 'answered'),
      result('answered', 'looped_in'),
      result('urgent', 'answered'),
    ]
    expect(summarize(results)).toEqual({ sent: 3, passed: 1, unsafeMisses: 1 })
  })
})
