import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { categoryForId, parseHandbook } from '../domain/handbook'
import { buildSeedSql, easternTime, sqlValue } from '../seed/seed'
import { SEED_QUESTIONS } from '../seed/seed-data'
import { slugify } from '../domain/slug'

const handbook = readFileSync('data/handbook.md', 'utf8')

describe('parseHandbook', () => {
  const entries = parseHandbook(handbook)

  it('yields all 29 entries with unique ids', () => {
    expect(entries).toHaveLength(29)
    expect(new Set(entries.map((e) => e.id)).size).toBe(29)
  })

  it('parses id, title, category and date from the heading', () => {
    const tuition = entries.find((e) => e.id === 'fees:tuition')
    expect(tuition).toMatchObject({
      title: 'Weekly Tuition',
      category: 'Fees',
      updatedAt: '2026-08-01T12:00:00.000Z',
      fromParentQuestion: false,
    })
    expect(tuition?.body).toContain('| Twos | $270 |')
    expect(entries.find((e) => e.id === 'meals:menu')?.updatedAt).toBe('2026-10-19T12:00:00.000Z')
  })

  it('keeps each body to its own section', () => {
    const contact = entries.find((e) => e.id === 'center:contact')!
    expect(contact.body.startsWith('- Maple Grove Early Learning Center')).toBe(true)
    expect(contact.body).not.toContain('##')
    expect(contact.body).not.toContain('Hours of Operation')
  })

  it('maps every handbook prefix to a category', () => {
    const byCategory = Object.fromEntries(entries.map((e) => [e.id, e.category]))
    expect(byCategory).toMatchObject({
      'center:contact': 'Policies',
      'policy:safety': 'Policies',
      'ratios:staff': 'Policies',
      'hours:holidays': 'Hours',
      'health:illness': 'Health',
      'meals:menu': 'Meals',
      'pickup:signin': 'Pickup',
      'enroll:process': 'Program',
      'daily:supplies': 'Program',
      'program:curriculum': 'Program',
    })
    expect(() => categoryForId('unknown:thing')).toThrow()
  })

  it('rejects a malformed heading', () => {
    expect(() => parseHandbook('## Not an entry')).toThrow(/Malformed/)
  })
})

describe('seed history', () => {
  const kbIds = new Set(parseHandbook(handbook).map((e) => e.id))

  it('only cites real KB entries', () => {
    for (const q of SEED_QUESTIONS) for (const id of q.citations ?? []) expect(kbIds).toContain(id)
  })

  it('has ~20 answered questions and the uncovered questions from the plan', () => {
    const count = (kind: string) => SEED_QUESTIONS.filter((q) => q.kind === kind).length
    expect(count('answered')).toBeGreaterThanOrEqual(18)
    const uncovered = SEED_QUESTIONS.filter((q) => q.kind === 'uncovered').map((q) => q.question)
    expect(uncovered.filter((q) => q === 'Do you offer swim lessons?')).toHaveLength(3)
    expect(uncovered.filter((q) => q === 'Is there a photo day this fall?')).toHaveLength(2)
    expect(uncovered.filter((q) => q === 'Where should I park at pickup?')).toHaveLength(2)
    expect(uncovered.filter((q) => q === 'Can kids wear Halloween costumes?')).toHaveLength(1)
  })

  it('stays inside the last 7 days', () => {
    for (const q of SEED_QUESTIONS) {
      expect(q.daysAgo).toBeGreaterThanOrEqual(1)
      expect(q.daysAgo).toBeLessThanOrEqual(6)
    }
  })

  it('does not teach the system how to add a pickup adult (scenario #3 needs Dana)', () => {
    expect(handbook.toLowerCase()).not.toMatch(/add (a|an|someone|them) to .*pickup list/)
  })

  it('builds SQL with one statement per line and escaped quotes', () => {
    const sql = buildSeedSql(handbook, new Date('2026-10-23T16:00:00Z'))
    expect(sql).toContain(
      "INSERT INTO parents (id, name, child_name, room, is_demo, is_test, created_at) VALUES ('sam-rivera', 'Sam Rivera', 'Maya', 'Twos', 0, 0,",
    )
    expect(sql.match(/INSERT INTO knowledge_entries/g)).toHaveLength(29)
    expect(sql.match(/INSERT INTO requests/g)).toHaveLength(SEED_QUESTIONS.length)
    expect(sql).toContain("'What''s for lunch on Thursday?'")
  })
})

describe('helpers', () => {
  it('escapes SQL values', () => {
    expect(sqlValue("Maya's")).toBe("'Maya''s'")
    expect(sqlValue(null)).toBe('NULL')
    expect(sqlValue(3)).toBe('3')
  })

  it('places seed times in Eastern (EDT) on the right day', () => {
    expect(easternTime(new Date('2026-10-23T16:00:00Z'), 2, '07:30')).toBe(
      '2026-10-21T11:30:00.000Z',
    )
  })

  it('slugifies titles', () => {
    expect(slugify('Do you offer swim lessons?')).toBe('do_you_offer_swim_lessons')
    expect(slugify('???')).toBe('entry')
  })
})
