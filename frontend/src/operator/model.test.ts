import { describe, expect, it } from 'vitest'
import type { InboxItem } from '../../../shared/types'
import { earlierLine, inboxSummary, newArrivals, statusLabel } from './model'

const now = new Date('2026-10-23T22:00:00.000Z')

function item(id: string, extra: Partial<InboxItem> = {}): InboxItem {
  return {
    id,
    parentId: 'sam-rivera',
    parentName: 'Sam Rivera',
    childName: 'Maya',
    room: 'Twos',
    text: 'Hello',
    route: 'looped_in',
    status: 'new',
    suggestedRole: 'Office',
    forwardedTo: null,
    isTest: false,
    createdAt: '2026-10-23T21:30:00.000Z',
    updatedAt: '2026-10-23T21:30:00.000Z',
    ...extra,
  }
}

describe('statusLabel', () => {
  it('names the forwarded role', () => {
    expect(statusLabel({ status: 'forwarded', forwardedTo: 'Office' })).toBe('Forwarded to Office')
    expect(statusLabel({ status: 'new', forwardedTo: null })).toBe('New')
    expect(statusLabel({ status: 'replied', forwardedTo: 'Kitchen' })).toBe('Replied')
  })
})

describe('inboxSummary', () => {
  it('counts new items and items from today', () => {
    const items = [
      item('a'),
      item('b', { status: 'replied' }),
      item('c', { status: 'new', createdAt: '2026-10-20T15:00:00.000Z' }),
    ]
    expect(inboxSummary(items, now)).toBe('2 new · 2 today')
  })
})

describe('earlierLine', () => {
  it('quotes the earlier question and how it was handled', () => {
    expect(
      earlierLine(
        {
          text: 'Are you closed the Friday after Thanksgiving?',
          route: 'answered',
          createdAt: '2026-10-23T15:00:00.000Z',
        },
        now,
      ),
    ).toBe('Earlier today: “Are you closed the Friday after Thanksgiving?” (answered by AI)')
  })

  it('truncates long questions', () => {
    const line = earlierLine(
      { text: 'x'.repeat(100), route: 'handed_off', createdAt: '2026-10-22T15:00:00.000Z' },
      now,
    )
    expect(line).toMatch(/^Yesterday: “x{67}…” \(sent to Dana\)$/)
  })
})

describe('newArrivals', () => {
  it('returns ids not seen before', () => {
    expect(newArrivals(new Set(['a']), [item('a'), item('b')])).toEqual(['b'])
  })
})
