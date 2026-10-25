import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseHandbook } from '../domain/handbook'
import { bestMatchEntry, contentWords } from '../domain/match'

const kb = parseHandbook(readFileSync('data/handbook.md', 'utf8'))

describe('bestMatchEntry', () => {
  it('picks the pickup list entry for scenario #3', () => {
    expect(
      bestMatchEntry("Can my mom pick Maya up on Friday? She's not on the list.", 'Pickup', kb),
    ).toBe('pickup:signin')
  })

  it('stays within the topic', () => {
    expect(bestMatchEntry('Leo forgot his lunch today. Can someone help?', 'Meals', kb)).toMatch(
      /^meals:/,
    )
  })

  it('falls back to all entries when no entry has the topic', () => {
    expect(bestMatchEntry('tuition', 'Fees', [{ ...kb[0]!, category: 'Hours' }])).toBe(kb[0]!.id)
    expect(bestMatchEntry('anything', 'Fees', [])).toBeNull()
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
