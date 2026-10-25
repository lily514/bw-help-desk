import { describe, expect, it } from 'vitest'
import { questionKey, summarizeInsights, type InsightRow } from '../domain/insights'

function row(extra: Partial<InsightRow> = {}): InsightRow {
  return {
    route: 'answered',
    topic: 'Hours',
    answerable: true,
    text: 'What time do you open?',
    createdAt: '2026-10-20T12:00:00.000Z',
    ...extra,
  }
}

const swim = (createdAt: string, text = 'Do you offer swim lessons?'): InsightRow =>
  row({ route: 'handed_off', topic: 'Program', answerable: false, text, createdAt })

describe('summarizeInsights', () => {
  it('returns zeros for an empty week', () => {
    expect(summarizeInsights([], [])).toEqual({
      questionsAsked: 0,
      answeredByAiPct: 0,
      sentToPersonPct: 0,
      topTopics: [],
      couldntAnswer: [],
    })
  })

  it('splits answered vs sent to a person into whole percentages that sum to 100', () => {
    const rows = [row(), row(), row({ route: 'looped_in' })]
    const s = summarizeInsights(rows, [])
    expect(s.questionsAsked).toBe(3)
    expect(s.answeredByAiPct).toBe(67)
    expect(s.sentToPersonPct).toBe(33)
  })

  it('counts every non-answered route as sent to a person', () => {
    const rows = [
      row({ route: 'looped_in' }),
      row({ route: 'handed_off' }),
      row({ route: 'urgent' }),
    ]
    expect(summarizeInsights(rows, []).sentToPersonPct).toBe(100)
  })

  it('orders topics by count', () => {
    const rows = [row({ topic: 'Meals' }), row({ topic: 'Fees' }), row({ topic: 'Fees' })]
    expect(summarizeInsights(rows, []).topTopics).toEqual([
      { topic: 'Fees', count: 2 },
      { topic: 'Meals', count: 1 },
    ])
  })

  it('groups uncovered questions by wording, most asked first', () => {
    const rows = [
      row({
        route: 'handed_off',
        topic: 'Pickup',
        answerable: false,
        text: 'Where should I park?',
      }),
      swim('2026-10-18T12:00:00.000Z'),
      swim('2026-10-19T12:00:00.000Z', 'do you offer swim lessons'),
      row(),
    ]
    expect(summarizeInsights(rows, []).couldntAnswer).toEqual([
      { question: 'do you offer swim lessons', topic: 'Program', count: 2 },
      { question: 'Where should I park?', topic: 'Pickup', count: 1 },
    ])
  })

  it('drops a question once an entry is titled with it', () => {
    const rows = [swim('2026-10-18T12:00:00.000Z')]
    expect(summarizeInsights(rows, ['Do you offer swim lessons']).couldntAnswer).toEqual([])
  })
})

describe('questionKey', () => {
  it('ignores case, punctuation and extra spaces', () => {
    expect(questionKey('  Can kids wear  Halloween costumes?! ')).toBe(
      'can kids wear halloween costumes',
    )
  })
})
