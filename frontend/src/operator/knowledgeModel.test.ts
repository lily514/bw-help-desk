import { describe, expect, it } from 'vitest'
import type { KnowledgeEntry } from '../../../shared/types'
import { entryPath, groupByCategory, previewLine } from './knowledgeModel'

function entry(id: string, title: string, category: KnowledgeEntry['category']): KnowledgeEntry {
  return {
    id,
    title,
    category,
    body: '',
    fromParentQuestion: false,
    sourceRequestId: null,
    updatedAt: '2026-08-01T00:00:00.000Z',
  }
}

describe('previewLine', () => {
  it('strips the list marker from the first line', () => {
    expect(previewLine('- Open Monday–Friday, 6:30am–6:00pm.\n- Closed weekends.')).toBe(
      'Open Monday–Friday, 6:30am–6:00pm.',
    )
  })

  it('skips a leading table', () => {
    const body = '| Program | Rate |\n|---|---|\n| Twos | $270 |\n- Tuition is due Mondays.'
    expect(previewLine(body)).toBe('Tuition is due Mondays.')
  })

  it('falls back to the table when there is nothing else', () => {
    expect(previewLine('| Program | Rate |')).toBe('Program Rate')
  })

  it('keeps plain paragraphs as they are', () => {
    expect(previewLine('\n\nYes, she can.\n\nSecond paragraph.')).toBe('Yes, she can.')
  })
})

describe('groupByCategory', () => {
  it('orders groups by category and entries by title, dropping empty categories', () => {
    const groups = groupByCategory([
      entry('pickup:b', 'Sign-in', 'Pickup'),
      entry('hours:b', 'Weather', 'Hours'),
      entry('hours:a', 'Holidays', 'Hours'),
    ])
    expect(groups.map((g) => g.category)).toEqual(['Hours', 'Pickup'])
    expect(groups[0]!.entries.map((e) => e.id)).toEqual(['hours:a', 'hours:b'])
  })
})

describe('entryPath', () => {
  it('encodes the colon in entry ids', () => {
    expect(entryPath('pickup:signin')).toBe('/operator/knowledge/pickup%3Asignin')
  })
})
