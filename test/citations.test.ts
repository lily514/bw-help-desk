import { describe, expect, it } from 'vitest'
import { CitationStream } from '../worker/lib/citations'

const VALID = new Set(['hours:holidays', 'fees:tuition', 'hours:regular'])

function run(deltas: string[]) {
  const stream = new CitationStream(VALID)
  const shown = deltas.map((d) => stream.push(d)).join('')
  const result = stream.finish()
  return { shown: shown + result.tail, ...result }
}

describe('CitationStream', () => {
  it('forwards text and parses a trailing marker', () => {
    const r = run(['Yes, we are closed ', 'that Friday.\n', '[[cite: hours:holidays]]'])
    expect(r.shown).toBe('Yes, we are closed that Friday.\n')
    expect(r.text).toBe('Yes, we are closed that Friday.')
    expect(r.citations).toEqual(['hours:holidays'])
  })

  it('handles the marker split across two deltas', () => {
    const r = run(['It is $270 a week.\n[', '[cite: fees:tuition]]'])
    expect(r.shown).toBe('It is $270 a week.\n')
    expect(r.citations).toEqual(['fees:tuition'])
  })

  it('handles the marker split mid-token and across many deltas', () => {
    const r = run(['Open at 6:30am. [[ci', 'te: hours:reg', 'ular, fees:tu', 'ition]]'])
    expect(r.shown).toBe('Open at 6:30am. ')
    expect(r.citations).toEqual(['hours:regular', 'fees:tuition'])
  })

  it('drops unknown and duplicate ids', () => {
    const r = run(['Answer.\n[[cite: hours:holidays, made:up, hours:holidays ]]'])
    expect(r.citations).toEqual(['hours:holidays'])
  })

  it('never shows text after the marker', () => {
    const r = run(['Answer. [[cite: fees:tuition]] trailing junk'])
    expect(r.shown).toBe('Answer. ')
    expect(r.text).toBe('Answer.')
  })

  it('releases a held single bracket that was not a marker', () => {
    const stream = new CitationStream(VALID)
    expect(stream.push('Pack a [')).toBe('Pack a ')
    expect(stream.push('labeled] bag.')).toBe('[labeled] bag.')
    expect(stream.finish()).toEqual({ tail: '', text: 'Pack a [labeled] bag.', citations: [] })
  })

  it('returns held text as tail when [[ was not a cite marker', () => {
    const r = run(['See [[the lobby chart]] for details.'])
    expect(r.shown).toBe('See [[the lobby chart]] for details.')
    expect(r.citations).toEqual([])
  })

  it('works with no marker at all', () => {
    const r = run(['Plain answer.'])
    expect(r).toMatchObject({ shown: 'Plain answer.', text: 'Plain answer.', citations: [] })
  })
})
