// API types shared by the Worker and the React app.

export const ROOMS = ['Infants', 'Toddlers', 'Twos', 'Preschool'] as const
export type Room = (typeof ROOMS)[number]

export const CATEGORIES = [
  'Hours',
  'Fees',
  'Health',
  'Meals',
  'Pickup',
  'Program',
  'Policies',
] as const
export type Category = (typeof CATEGORIES)[number]

export type Route = 'answered' | 'looped_in' | 'handed_off' | 'urgent'
export type InquiryStatus = 'new' | 'seen' | 'forwarded' | 'replied'
export type StaffRole = 'Director' | 'Office' | 'Classroom teacher' | 'Kitchen'
export type RouterName = 'jev' | 'llm-fallback' | 'error'

export interface Parent {
  id: string
  name: string
  childName: string
  room: Room
  isDemo: boolean
  isTest: boolean
  createdAt: string
}

export interface KnowledgeEntry {
  id: string
  title: string
  category: Category
  body: string
  fromParentQuestion: boolean
  sourceInquiryId: string | null
  updatedAt: string
}

/** GET /api/knowledge/:id: the entry plus who it was saved from, for the editor's meta line. */
export interface KnowledgeEntryDetail extends KnowledgeEntry {
  sourceParentName: string | null
}

export type MessageRole = 'parent' | 'ai' | 'staff'

export interface Message {
  id: string
  parentId: string
  role: MessageRole
  text: string
  /** Knowledge entry ids (AI messages only). */
  citations: string[]
  staffName: string | null
  staffRole: string | null
  inquiryId: string | null
  isTest: boolean
  createdAt: string
}

/** What the parent's thread needs to know about each inquiry (no scores). */
export interface ThreadInquiry {
  id: string
  messageId: string
  route: Route
  status: InquiryStatus
  suggestedRole: StaffRole
  forwardedTo: StaffRole | null
  createdAt: string
  updatedAt: string
}

export interface ThreadResponse {
  messages: Message[]
  inquiries: ThreadInquiry[]
  /** Pass back as `?since=` on the next poll. */
  serverTime: string
}

/** Server-Sent Events from POST /api/chat. */
export type ChatEvent =
  | { event: 'user'; data: { message: Message } }
  | {
      event: 'route'
      data: { inquiryId: string; route: Route; status: InquiryStatus; suggestedRole: StaffRole }
    }
  | { event: 'delta'; data: { text: string } }
  | { event: 'done'; data: { message: Message; citations: string[] } }

export const SENSITIVE_KINDS = [
  'custody',
  'complaint',
  'behavior',
  'billing',
  'special_needs',
  'medical',
  'none',
] as const
export type SensitiveKind = (typeof SENSITIVE_KINDS)[number]

/** Router output, stored as JSON on each inquiry. Values are 0–1 except topic and sensitive_kind. */
export interface RouteScores {
  topic: Category
  /** Which kind of sensitive topic, for the operator's "why" line. Absent in seed data. */
  sensitive_kind?: SensitiveKind
  is_urgent: number
  is_sensitive: number
  is_child_health_today: number
  needs_staff_action: number
  answerable_from_kb: number
}

/** One row in the operator inbox (PLAN.md 4.4). */
export interface InboxItem {
  id: string
  parentId: string
  parentName: string
  childName: string
  room: Room
  /** The parent's message. */
  text: string
  route: Route
  status: InquiryStatus
  suggestedRole: StaffRole
  forwardedTo: StaffRole | null
  isTest: boolean
  createdAt: string
  updatedAt: string
}

export interface InquiryDetail {
  inquiry: InboxItem & {
    reason: string
    scores: RouteScores | null
    router: RouterName
    topic: Category
    answerable: boolean
  }
  /** This parent's previous question, for the one-line "Earlier…" context. */
  earlier: { text: string; route: Route; createdAt: string } | null
  /** What the parent already heard from the AI, if it sent an answer (not an acknowledgement). */
  aiAnswer: { text: string; citations: string[] } | null
  /** Staff replies already sent on this inquiry. */
  replies: Message[]
  /** Entries for "Save as answer". */
  knowledge: { id: string; title: string; category: Category }[]
  /** The entry "Add to existing entry" starts on (backend/domain/entrySuggestion.ts). */
  suggestedEntryId: string | null
}

export type SaveAs = { entryId: string } | { create: true }

export interface ReplyResult {
  inquiry: InboxItem
  message: Message
  savedEntry: KnowledgeEntry | null
}

/** GET /api/insights: the last 7 days, test conversations excluded (PLAN.md 4.4). */
export interface Insights {
  questionsAsked: number
  /** Whole percentages that add up to 100 (both 0 when nothing was asked). */
  answeredByAiPct: number
  sentToPersonPct: number
  /** Topics with at least one question, most asked first. */
  topTopics: { topic: Category; count: number }[]
  /** Uncovered questions grouped by wording, most asked first. */
  couldntAnswer: { question: string; topic: Category; count: number }[]
}
