import { readChatEvents } from '../../../shared/chatStream'
import type { TestResult, TestResultsResponse } from '../../../shared/testScenarios'
import type {
  ChatEvent,
  InboxItem,
  Insights,
  KnowledgeEntry,
  KnowledgeEntryDetail,
  Parent,
  ReplyResult,
  RequestDetail,
  Room,
  Route,
  SaveAs,
  StaffRole,
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

function send<T>(method: 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return send<T>('POST', path, body)
}

const enc = encodeURIComponent

export type KnowledgeInput = Pick<KnowledgeEntry, 'title' | 'category' | 'body'>

export const api = {
  getParent: (id: string) => request<Parent>(`/api/parents/${enc(id)}`),
  createParent: (input: { name: string; childName: string; room: Room; isTest?: boolean }) =>
    post<Parent>('/api/parents', input),

  listKnowledge: () => request<KnowledgeEntry[]>('/api/knowledge'),
  getKnowledge: (id: string) => request<KnowledgeEntryDetail>(`/api/knowledge/${enc(id)}`),
  createKnowledge: (input: KnowledgeInput) => send<KnowledgeEntry>('POST', '/api/knowledge', input),
  updateKnowledge: (id: string, input: KnowledgeInput) =>
    send<KnowledgeEntry>('PUT', `/api/knowledge/${enc(id)}`, input),

  thread: (parentId: string, since?: string) =>
    request<ThreadResponse>(`/api/thread/${enc(parentId)}${since ? `?since=${enc(since)}` : ''}`),
  askPerson: (requestId: string) =>
    post<ThreadRequest>(`/api/requests/${enc(requestId)}/ask-person`),

  inbox: () => request<InboxItem[]>('/api/inbox'),
  insights: () => request<Insights>('/api/insights'),
  requestDetail: (id: string) => request<RequestDetail>(`/api/requests/${enc(id)}`),
  markSeen: (id: string) => post<InboxItem>(`/api/requests/${enc(id)}/seen`),
  forward: (id: string, role: StaffRole) =>
    post<InboxItem>(`/api/requests/${enc(id)}/forward`, { role }),
  reply: (id: string, text: string, saveAs?: SaveAs) =>
    post<ReplyResult>(`/api/requests/${enc(id)}/reply`, { text, saveAs }),

  testResult: (input: { runId: string; scenarioNum: number; actual: Route; savedReply: boolean }) =>
    post<TestResult>('/api/test/result', input),
  testResults: (runId?: string) =>
    request<TestResultsResponse>(`/api/test/results${runId ? `?runId=${enc(runId)}` : ''}`),
  /** Deletes test data and restores the handbook KB; `demoParents: false` keeps demo parents. */
  testReset: (demoParents = true) => post<{ ok: true }>('/api/test/reset', { demoParents }),

  /** Streams POST /api/chat. Throws ApiError for non-2xx (e.g. 429 rate limit). */
  async *chat(parentId: string, text: string, isTest = false): AsyncGenerator<ChatEvent> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, text, isTest }),
    })
    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`)
    }
    yield* readChatEvents(res.body)
  },
}
