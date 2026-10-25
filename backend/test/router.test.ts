import { describe, expect, it } from 'vitest'
import { parseJevAnswers, parseLlmScores } from '../ai/router'

const VALID = {
  topic: 'Health',
  sensitive_kind: 'none',
  is_urgent: 0.1,
  is_sensitive: 0.2,
  is_child_health_today: 0.9,
  needs_staff_action: 0.3,
  answerable_from_kb: 0.8,
}

describe('parseLlmScores', () => {
  it('parses a valid object', () => {
    expect(parseLlmScores(JSON.stringify(VALID))).toEqual(VALID)
  })

  it('accepts a fenced block, string numbers and any topic case', () => {
    const content =
      '```json\n' + JSON.stringify({ ...VALID, topic: 'health', is_urgent: '0.4' }) + '\n```'
    expect(parseLlmScores(content)).toMatchObject({ topic: 'Health', is_urgent: 0.4 })
  })

  it('clamps out-of-range values and defaults an unknown sensitive_kind', () => {
    const r = parseLlmScores(
      JSON.stringify({ ...VALID, is_urgent: 1.7, is_sensitive: -2, sensitive_kind: 'x' }),
    )
    expect(r).toMatchObject({ is_urgent: 1, is_sensitive: 0, sensitive_kind: 'none' })
  })

  it('rejects missing scores, unknown topics and non-JSON', () => {
    expect(() => parseLlmScores(JSON.stringify({ ...VALID, is_urgent: undefined }))).toThrow(
      /is_urgent/,
    )
    expect(() => parseLlmScores(JSON.stringify({ ...VALID, topic: 'Weather' }))).toThrow(/topic/)
    expect(() => parseLlmScores('not json')).toThrow()
  })
})

describe('parseJevAnswers', () => {
  it('flattens noul and choice answers from the decisions endpoint', () => {
    const answers = {
      topic: { type: 'choice' as const, choice: 'Pickup' },
      sensitive_kind: { type: 'choice' as const, choice: 'custody' },
      is_urgent: { type: 'noul' as const, noul: 0.12 },
      is_sensitive: { type: 'noul' as const, noul: 0.91 },
      is_child_health_today: { type: 'noul' as const, noul: 0.01 },
      needs_staff_action: { type: 'noul' as const, noul: 0.7 },
      answerable_from_kb: { type: 'noul' as const, noul: 0.2 },
    }
    expect(parseJevAnswers(answers)).toEqual({
      topic: 'Pickup',
      sensitive_kind: 'custody',
      is_urgent: 0.12,
      is_sensitive: 0.91,
      is_child_health_today: 0.01,
      needs_staff_action: 0.7,
      answerable_from_kb: 0.2,
    })
  })

  it('rejects an incomplete answer set', () => {
    expect(() => parseJevAnswers({ topic: { type: 'choice', choice: 'Hours' } })).toThrow()
  })
})
