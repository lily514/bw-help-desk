import { describe, expect, it } from 'vitest'
import { parseBlocks } from './markdownBlocks'

describe('parseBlocks', () => {
  it('parses tables, then a list', () => {
    const blocks = parseBlocks(
      '| Program | Rate |\n|---|---|\n| Twos | $270 |\n| Infants | $315 |\n- Due Mondays.\n- Sibling discount.',
    )
    expect(blocks).toEqual([
      {
        type: 'table',
        header: ['Program', 'Rate'],
        rows: [
          ['Twos', '$270'],
          ['Infants', '$315'],
        ],
      },
      {
        type: 'list',
        items: [
          { text: 'Due Mondays.', children: [] },
          { text: 'Sibling discount.', children: [] },
        ],
      },
    ])
  })

  it('nests indented list items', () => {
    const [list] = parseBlocks(
      '- Upcoming closures:\n  - Thanksgiving\n  - Christmas\n- Not closed: Veterans Day',
    )
    expect(list).toEqual({
      type: 'list',
      items: [
        {
          text: 'Upcoming closures:',
          children: [
            { text: 'Thanksgiving', children: [] },
            { text: 'Christmas', children: [] },
          ],
        },
        { text: 'Not closed: Veterans Day', children: [] },
      ],
    })
  })

  it('joins wrapped lines into paragraphs and separates on blank lines', () => {
    expect(parseBlocks('Yes, she can.\nSend her name.\n\nThanks!')).toEqual([
      { type: 'paragraph', text: 'Yes, she can. Send her name.' },
      { type: 'paragraph', text: 'Thanks!' },
    ])
  })
})
