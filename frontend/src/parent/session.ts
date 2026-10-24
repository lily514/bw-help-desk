// The signed-in demo parent lives in localStorage (PLAN.md 4.3). Storage can be
// unavailable (private mode, blocked site data), so every access is guarded.

const KEY = 'maple-grove.parentId'

export const DEMO_PARENT_ID = 'sam-rivera'

export function getParentId(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setParentId(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Without storage the session lasts until reload; the chat still works.
  }
}

export function clearParentId(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
