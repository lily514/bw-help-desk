import { describe, expect, it } from 'vitest'
import { demoParentId, entryIdBase } from '../domain/ids'

describe('entryIdBase', () => {
  it('is the category and a slug of the title', () => {
    expect(entryIdBase('Program', 'Do you offer swim lessons?')).toBe(
      'program:do_you_offer_swim_lessons',
    )
  })

  it('caps the slug at 40 characters without a trailing underscore', () => {
    const id = entryIdBase('Pickup', 'Can my mom pick Maya up on Friday? She is not on the list.')
    expect(id).toBe('pickup:can_my_mom_pick_maya_up_on_friday_she_is')
  })

  it('falls back to "entry" when the title has no letters or digits', () => {
    expect(entryIdBase('Hours', '???')).toBe('hours:entry')
  })
})

describe('demoParentId', () => {
  it('slugs the name and keeps the suffix', () => {
    expect(demoParentId('Sam Rivera', '1a2b3c4d')).toBe('demo-sam_rivera-1a2b3c4d')
  })

  it('caps the name at 24 characters', () => {
    expect(demoParentId('Alexandria Montgomery-Whitfield', 'x')).toBe(
      'demo-alexandria_montgomery_wh-x',
    )
  })

  it('falls back to "parent" when the name has no letters or digits', () => {
    expect(demoParentId('???', 'x')).toBe('demo-parent-x')
  })
})
