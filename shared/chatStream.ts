import type { ChatEvent } from './types'

const CHAT_EVENTS = new Set<ChatEvent['event']>(['user', 'route', 'delta', 'done'])

/** Parses one SSE block (`event:` / `data:` lines) into a chat event, or null if it isn't one. */
export function parseChatEventBlock(block: string): ChatEvent | null {
  let event = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
  }
  if (!CHAT_EVENTS.has(event as ChatEvent['event']) || data.length === 0) return null
  return { event, data: JSON.parse(data.join('\n')) } as ChatEvent
}

/** Yields chat events from a POST /api/chat response body as they arrive. */
export async function* readChatEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    let end: number
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const event = parseChatEventBlock(buffer.slice(0, end))
      buffer = buffer.slice(end + 2)
      if (event) yield event
    }
    if (done) break
  }
  const last = parseChatEventBlock(buffer.trim())
  if (last) yield last
}
