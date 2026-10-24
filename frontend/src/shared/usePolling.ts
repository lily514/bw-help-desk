import { useEffect, useRef } from 'react'

/**
 * Calls `poll` every `intervalMs` (PLAN.md 2: cross-device updates are 2-second
 * polling). Waits for each call to finish before scheduling the next, and skips
 * ticks while the tab is hidden. With `immediate`, the first call happens right away.
 */
export function usePolling(
  poll: () => Promise<void>,
  intervalMs = 2000,
  enabled = true,
  immediate = false,
) {
  const pollRef = useRef(poll)
  useEffect(() => {
    pollRef.current = poll
  }, [poll])

  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout>
    let stopped = false

    const tick = async () => {
      if (!document.hidden) {
        try {
          await pollRef.current()
        } catch {
          // Transient network errors: try again next tick.
        }
      }
      if (!stopped) timer = setTimeout(tick, intervalMs)
    }
    timer = setTimeout(tick, immediate ? 0 : intervalMs)

    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [intervalMs, enabled, immediate])
}
