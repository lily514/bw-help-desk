import { readChatEvents } from '../../../shared/chatStream'
import type {
  ChatEvent,
  KnowledgeEntry,
  Parent,
  Room,
  ThreadRequest,
  ThreadResponse,
} from '../../../shared/types'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const enc = encodeURIComponent

export const api = {
  getParent: (id: string) => request<Parent>(`/api/parents/${enc(id)}`),
  createParent: (input: { name: string; childName: string; room: Room }) =>
    post<Parent>('/api/parents', input),

  listKnowledge: () => request<KnowledgeEntry[]>('/api/kb'),
  getKnowledge: (id: string) => request<KnowledgeEntry>(`/api/kb/${enc(id)}`),

  thread: (parentId: string, since?: string) =>
    request<ThreadResponse>(`/api/thread/${enc(parentId)}${since ? `?since=${enc(since)}` : ''}`),
  askPerson: (requestId: string) =>
    post<ThreadRequest>(`/api/requests/${enc(requestId)}/ask-person`),

  /** Streams POST /api/chat. Throws ApiError for non-2xx (e.g. 429 rate limit). */
  async *chat(parentId: string, text: string): AsyncGenerator<ChatEvent> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, text }),
    })
    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`)
    }
    yield* readChatEvents(res.body)
  },
}
