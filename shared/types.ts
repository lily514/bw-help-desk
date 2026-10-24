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
export type RequestStatus = 'new' | 'seen' | 'forwarded' | 'replied'
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
  sourceRequestId: string | null
  updatedAt: string
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
  requestId: string | null
  isTest: boolean
  createdAt: string
}

/** What the parent's thread needs to know about each request (no scores). */
export interface ThreadRequest {
  id: string
  messageId: string
  route: Route
  status: RequestStatus
  suggestedRole: StaffRole
  forwardedTo: StaffRole | null
  createdAt: string
  updatedAt: string
}

export interface ThreadResponse {
  messages: Message[]
  requests: ThreadRequest[]
  /** Pass back as `?since=` on the next poll. */
  serverTime: string
}

/** Server-Sent Events from POST /api/chat. */
export type ChatEvent =
  | { event: 'user'; data: { message: Message } }
  | { event: 'route'; data: { requestId: string; route: Route; status: RequestStatus } }
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

/** Router output, stored as JSON on each request. Values are 0–1 except topic and sensitive_kind. */
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
