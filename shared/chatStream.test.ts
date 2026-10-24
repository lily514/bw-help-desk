import { describe, expect, it } from 'vitest'
import { parseChatEventBlock, readChatEvents } from './chatStream'

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

async function collect(chunks: string[]) {
  const events = []
  for await (const e of readChatEvents(streamOf(chunks))) events.push(e)
  return events
}

describe('parseChatEventBlock', () => {
  it('parses event and JSON data', () => {
    expect(parseChatEventBlock('event: delta\ndata: {"text":"Hi"}')).toEqual({
      event: 'delta',
      data: { text: 'Hi' },
    })
  })

  it('ignores unknown events and blocks without data', () => {
    expect(parseChatEventBlock('event: ping\ndata: {}')).toBeNull()
    expect(parseChatEventBlock('event: delta')).toBeNull()
  })
})

describe('readChatEvents', () => {
  it('yields events split across chunks, including CRLF line endings', async () => {
    const events = await collect([
      'event: delta\r\ndata: {"te',
      'xt":"We open "}\r\n\r\nevent: delta\ndata: {"text":"at 6:30am."}\n\n',
      'event: done\ndata: {"citations":["hours:regular"]}',
    ])
    expect(events.map((e) => e.event)).toEqual(['delta', 'delta', 'done'])
    expect(events[0].data).toEqual({ text: 'We open ' })
  })
})
