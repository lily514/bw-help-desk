import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseHandbook } from '../domain/handbook'
import { suggestEntry, contentWords } from '../domain/entrySuggestion'

const kb = parseHandbook(readFileSync('data/handbook.md', 'utf8'))

describe('suggestEntry', () => {
  it('picks the pickup list entry for scenario #3', () => {
    expect(
      suggestEntry("Can my mom pick Maya up on Friday? She's not on the list.", 'Pickup', kb),
    ).toBe('pickup:signin')
  })

  it('stays within the topic', () => {
    expect(suggestEntry('Leo forgot his lunch today. Can someone help?', 'Meals', kb)).toMatch(
      /^meals:/,
    )
  })

  it('falls back to all entries when no entry has the topic', () => {
    expect(suggestEntry('tuition', 'Fees', [{ ...kb[0]!, category: 'Hours' }])).toBe(kb[0]!.id)
    expect(suggestEntry('anything', 'Fees', [])).toBeNull()
  })
})

describe('contentWords', () => {
  it('drops filler and short words', () => {
    expect([...contentWords("Can my mom pick Maya up? She's on it.")]).toEqual([
      'mom',
      'pick',
      'maya',
    ])
  })
})
