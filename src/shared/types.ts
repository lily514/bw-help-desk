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

/** Router output, stored as JSON on each request. Values are 0–1 except topic. */
export interface RouteScores {
  topic: Category
  is_urgent: number
  is_sensitive: number
  is_child_health_today: number
  needs_staff_action: number
  answerable_from_kb: number
}
