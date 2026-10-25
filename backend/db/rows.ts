import type { TestResult } from '../../shared/testScenarios'
import type {
  Category,
  InboxItem,
  KnowledgeAddition,
  KnowledgeEntry,
  KnowledgeSource,
  Message,
  MessageRole,
  Parent,
  InquiryStatus,
  Room,
  Route,
  RouteScores,
  StaffRole,
  ThreadInquiry,
} from '../../shared/types'

// Row shapes as stored in D1 (snake_case, 0/1 booleans), and their mappers to the API types.

export interface ParentRow {
  id: string
  name: string
  child_name: string
  room: string
  is_demo: number
  is_test: number
  created_at: string
}

export interface KnowledgeRow {
  id: string
  title: string
  category: string
  body: string
  source: string
  source_inquiry_id: string | null
  updated_at: string
}

/** A `knowledge_additions` row joined with the name of the parent who asked. */
export interface KnowledgeAdditionRow {
  id: string
  entry_id: string
  text: string
  source_inquiry_id: string | null
  parent_name: string | null
  created_at: string
}

export interface MessageRow {
  id: string
  parent_id: string
  role: string
  text: string
  citations: string | null
  staff_name: string | null
  staff_role: string | null
  inquiry_id: string | null
  is_test: number
  created_at: string
}

export interface InquiryRow {
  id: string
  parent_id: string
  message_id: string
  route: string
  reason: string
  scores: string
  router: string
  suggested_role: string
  topic: string
  answerable: number
  status: string
  forwarded_to: string | null
  is_test: number
  created_at: string
  updated_at: string
}

/** An inquiry joined with its question and parent, as the inbox shows it. */
export type InboxRow = InquiryRow & {
  text: string
  parent_name: string
  child_name: string
  room: string
}

export interface TestResultRow {
  id: string
  run_id: string
  scenario_num: number
  question: string
  expected: string
  actual: string
  passed: number
  unsafe_miss: number
  learned: number
  created_at: string
}

export function toParent(r: ParentRow): Parent {
  return {
    id: r.id,
    name: r.name,
    childName: r.child_name,
    room: r.room as Room,
    isDemo: r.is_demo === 1,
    isTest: r.is_test === 1,
    createdAt: r.created_at,
  }
}

export function toKnowledgeEntry(
  r: KnowledgeRow,
  additions: KnowledgeAddition[] = [],
): KnowledgeEntry {
  return {
    id: r.id,
    title: r.title,
    category: r.category as Category,
    body: r.body,
    source: r.source as KnowledgeSource,
    sourceInquiryId: r.source_inquiry_id,
    additions,
    updatedAt: r.updated_at,
  }
}

export function toKnowledgeAddition(r: KnowledgeAdditionRow): KnowledgeAddition {
  return {
    id: r.id,
    text: r.text,
    sourceInquiryId: r.source_inquiry_id,
    sourceParentName: r.parent_name,
    createdAt: r.created_at,
  }
}

export function toMessage(r: MessageRow): Message {
  return {
    id: r.id,
    parentId: r.parent_id,
    role: r.role as MessageRole,
    text: r.text,
    citations: r.citations ? (JSON.parse(r.citations) as string[]) : [],
    staffName: r.staff_name,
    staffRole: r.staff_role,
    inquiryId: r.inquiry_id,
    isTest: r.is_test === 1,
    createdAt: r.created_at,
  }
}

export function toThreadInquiry(r: InquiryRow): ThreadInquiry {
  return {
    id: r.id,
    messageId: r.message_id,
    route: r.route as Route,
    status: r.status as InquiryStatus,
    suggestedRole: r.suggested_role as StaffRole,
    forwardedTo: r.forwarded_to as StaffRole | null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function toInboxItem(r: InboxRow): InboxItem {
  return {
    id: r.id,
    parentId: r.parent_id,
    parentName: r.parent_name,
    childName: r.child_name,
    room: r.room as Room,
    text: r.text,
    route: r.route as Route,
    status: r.status as InquiryStatus,
    suggestedRole: r.suggested_role as StaffRole,
    forwardedTo: r.forwarded_to as StaffRole | null,
    isTest: r.is_test === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function toTestResult(r: TestResultRow): TestResult {
  return {
    id: r.id,
    runId: r.run_id,
    scenarioNum: r.scenario_num,
    question: r.question,
    expected: r.expected as Route,
    actual: r.actual as Route,
    passed: r.passed === 1,
    unsafeMiss: r.unsafe_miss === 1,
    learned: r.learned === 1,
    createdAt: r.created_at,
  }
}

/** Stored scores, or null for an inquiry whose routing failed (stored as `{}`). */
export function parseScores(json: string): RouteScores | null {
  const parsed = JSON.parse(json) as Partial<RouteScores>
  return typeof parsed.is_urgent === 'number' ? (parsed as RouteScores) : null
}
