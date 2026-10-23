import { useEffect, useState } from 'react'

export type HealthState = 'checking' | 'ok' | 'down'

/** Scaffold-only check that the Worker API is reachable. */
export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>('checking')

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(() => !cancelled && setState('ok'))
      .catch(() => !cancelled && setState('down'))
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
