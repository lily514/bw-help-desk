import { describe, expect, it } from 'vitest'
import { entryText } from '../../shared/knowledge'
import type { KnowledgeAddition, KnowledgeEntry } from '../../shared/types'
import { formatEntry } from '../ai/prompt'

function addition(id: string, text: string): KnowledgeAddition {
  return {
    id,
    text,
    sourceInquiryId: null,
    sourceParentName: null,
    createdAt: '2026-10-24T12:00:00.000Z',
  }
}

const signin: KnowledgeEntry = {
  id: 'pickup:signin',
  title: 'Sign-In and Sign-Out',
  category: 'Pickup',
  body: 'Sign your child in and out at the front desk.\n',
  source: 'handbook',
  sourceInquiryId: null,
  additions: [],
  updatedAt: '2026-08-01T12:00:00.000Z',
}

describe('entryText', () => {
  it('is the body alone when nothing was added', () => {
    expect(entryText(signin)).toBe('Sign your child in and out at the front desk.')
  })

  it('puts each addition after the body as its own paragraph, oldest first', () => {
    const entry = {
      ...signin,
      additions: [
        addition('a1', 'Send the office their name and number. '),
        addition('a2', 'They need photo ID.'),
      ],
    }
    expect(entryText(entry)).toBe(
      'Sign your child in and out at the front desk.\n\n' +
        'Send the office their name and number.\n\n' +
        'They need photo ID.',
    )
  })
})

describe('formatEntry', () => {
  it('includes additions so the AI answers from them', () => {
    const entry = { ...signin, additions: [addition('a1', 'Send the office their name.')] }
    expect(formatEntry(entry)).toBe(
      '[pickup:signin] Sign-In and Sign-Out (Pickup, updated 2026-08-01)\n' +
        'Sign your child in and out at the front desk.\n\n' +
        'Send the office their name.',
    )
  })
})
