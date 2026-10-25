import type { Category, Route, StaffRole } from '../../shared/types'

const ROLE_BY_TOPIC: Record<Category, StaffRole> = {
  Health: 'Director',
  Policies: 'Director',
  Fees: 'Office',
  Hours: 'Office',
  Meals: 'Kitchen',
  Pickup: 'Classroom teacher',
  Program: 'Classroom teacher',
}

/** PLAN.md 3.3: urgent and sensitive go to the Director; otherwise by topic. */
export function suggestRole(route: Route, topic: Category, sensitive: boolean): StaffRole {
  if (route === 'urgent' || sensitive) return 'Director'
  return ROLE_BY_TOPIC[topic]
}
