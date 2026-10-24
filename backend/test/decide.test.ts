import { describe, expect, it } from 'vitest'
import type { RouteScores } from '../../shared/types'
import { decide } from '../lib/decide'

/** A plain, covered, factual question; override fields per case. */
function scores(overrides: Partial<RouteScores> = {}): RouteScores {
  return {
    topic: 'Hours',
    sensitive_kind: 'none',
    is_urgent: 0.02,
    is_sensitive: 0.05,
    is_child_health_today: 0.03,
    needs_staff_action: 0.1,
    answerable_from_kb: 0.95,
    ...overrides,
  }
}

describe('decide', () => {
  it('answers plain factual questions', () => {
    expect(decide(scores(), 'Maya')).toEqual({
      route: 'answered',
      reason: 'Covered by your policies',
      answerable: true,
      suggestedRole: 'Office',
    })
  })

  it('urgent beats everything', () => {
    const d = decide(
      scores({
        topic: 'Pickup',
        is_urgent: 0.9,
        is_sensitive: 0.9,
        is_child_health_today: 0.9,
        needs_staff_action: 0.9,
        answerable_from_kb: 0.1,
      }),
      'Maya',
    )
    expect(d).toMatchObject({
      route: 'urgent',
      suggestedRole: 'Director',
      reason: 'May miss pickup',
    })
    expect(decide(scores({ topic: 'Health', is_urgent: 0.7 }), 'Noah').reason).toBe(
      "A child's safety, right now",
    )
  })

  it('hands off sensitive questions to the Director with a specific reason', () => {
    const d = decide(
      scores({ topic: 'Pickup', is_sensitive: 0.8, sensitive_kind: 'custody' }),
      'Theo',
    )
    expect(d).toMatchObject({
      route: 'handed_off',
      suggestedRole: 'Director',
      reason: 'Possible custody issue',
    })
  })

  it('hands off questions the KB does not cover', () => {
    const d = decide(scores({ topic: 'Program', answerable_from_kb: 0.2 }), 'Maya')
    expect(d).toMatchObject({
      route: 'handed_off',
      answerable: false,
      reason: 'Not covered by your policies',
      suggestedRole: 'Classroom teacher',
    })
  })

  it('loops in questions about the child’s health today', () => {
    const d = decide(scores({ topic: 'Health', is_child_health_today: 0.85 }), 'Maya')
    expect(d).toMatchObject({
      route: 'looped_in',
      reason: "About Maya's health today",
      suggestedRole: 'Director',
    })
  })

  it('loops in (not hands off) medical-judgment questions about the child today', () => {
    const fever = scores({
      topic: 'Health',
      is_sensitive: 0.85,
      sensitive_kind: 'medical',
      is_child_health_today: 0.97,
    })
    expect(decide(fever, 'Maya')).toMatchObject({
      route: 'looped_in',
      reason: "About Maya's health today",
    })
    const custody = { ...fever, sensitive_kind: 'custody' as const }
    expect(decide(custody, 'Maya').route).toBe('handed_off')
  })

  it('loops in questions that need staff to act', () => {
    const d = decide(scores({ topic: 'Meals', needs_staff_action: 0.7 }), 'Leo')
    expect(d).toMatchObject({
      route: 'looped_in',
      reason: 'Asks staff to do something',
      suggestedRole: 'Kitchen',
    })
  })

  it('uses inclusive thresholds and falls back to a generic sensitive reason', () => {
    expect(decide(scores({ is_urgent: 0.5 }), 'Maya').route).toBe('urgent')
    expect(decide(scores({ answerable_from_kb: 0.5 }), 'Maya').route).toBe('answered')
    expect(decide(scores({ is_sensitive: 0.6, sensitive_kind: undefined }), 'Maya').reason).toBe(
      'Sensitive topic',
    )
  })
})
