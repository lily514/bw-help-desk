import { describe, expect, it } from 'vitest'
import type { Message, ThreadInquiry } from '../../../shared/types'
import { roleLabel, statusCard, trackerSteps } from './status'
import { buildThreadItems } from './thread'

function msg(
  id: string,
  role: Message['role'],
  createdAt: string,
  inquiryId: string | null = null,
): Message {
  return {
    id,
    parentId: 'sam-rivera',
    role,
    text: id,
    citations: [],
    staffName: null,
    staffRole: null,
    inquiryId,
    isTest: false,
    createdAt,
  }
}

function req(
  id: string,
  route: ThreadInquiry['route'],
  extra: Partial<ThreadInquiry> = {},
): ThreadInquiry {
  return {
    id,
    messageId: `${id}-q`,
    route,
    status: 'new',
    suggestedRole: 'Director',
    forwardedTo: null,
    createdAt: '2026-10-23T21:41:00.000Z',
    updatedAt: '2026-10-23T21:41:00.000Z',
    ...extra,
  }
}

describe('trackerSteps', () => {
  it('maps statuses to Delivered → Seen → Replied', () => {
    expect(trackerSteps('new')).toEqual(['done', 'current', 'pending'])
    expect(trackerSteps('seen')).toEqual(['done', 'done', 'current'])
    expect(trackerSteps('forwarded')).toEqual(['done', 'done', 'current'])
    expect(trackerSteps('replied')).toEqual(['done', 'done', 'done'])
  })
})

describe('statusCard', () => {
  it('has no card for answered inquiries', () => {
    expect(statusCard(req('r', 'answered'), 'Maya')).toBeNull()
  })

  it('titles each route per the design', () => {
    expect(statusCard(req('r', 'looped_in'), 'Maya')?.title).toBe('Shared with the front desk')
    const handoff = statusCard(req('r', 'handed_off'), 'Maya')
    expect(handoff).toMatchObject({ title: 'Sent to Dana, Director', showContact: true })
    const urgent = statusCard(req('r', 'urgent'), 'Maya')
    expect(urgent?.title).toMatch(/^Staff alerted at \d{1,2}:\d{2} [AP]M$/)
    expect(urgent?.subtitle).toBe("Dana Whitfield and Maya's teacher")
  })

  it('names the forwarded role with the child where natural', () => {
    const forwarded = req('r', 'looped_in', {
      status: 'forwarded',
      forwardedTo: 'Classroom teacher',
    })
    expect(statusCard(forwarded, 'Maya')?.title).toBe("Forwarded to Maya's teacher")
    expect(roleLabel('Office', 'Maya')).toBe('the office')
  })
})

describe('buildThreadItems', () => {
  const now = new Date('2026-10-23T22:00:00.000Z')

  it('adds date dividers and places the card after the AI reply', () => {
    const items = buildThreadItems(
      [
        msg('old-q', 'parent', '2026-10-20T15:00:00.000Z', 'r0'),
        msg('old-a', 'ai', '2026-10-20T15:00:05.000Z', 'r0'),
        msg('q', 'parent', '2026-10-23T21:41:00.000Z', 'r1'),
        msg('a', 'ai', '2026-10-23T21:41:02.000Z', 'r1'),
        msg('staff', 'staff', '2026-10-23T21:50:00.000Z', 'r1'),
      ],
      [req('r0', 'answered'), req('r1', 'handed_off')],
      now,
    )
    expect(items.map((i) => (i.kind === 'message' ? i.message.id : i.kind))).toEqual([
      'divider',
      'old-q',
      'old-a',
      'divider',
      'q',
      'a',
      'status',
      'staff',
    ])
  })

  it('places the card after the parent message while the reply is pending', () => {
    const items = buildThreadItems(
      [msg('q', 'parent', '2026-10-23T21:41:00.000Z', 'r1')],
      [req('r1', 'urgent')],
      now,
    )
    expect(items.map((i) => i.kind)).toEqual(['divider', 'message', 'status'])
  })
})
