import type { Route } from '../../../shared/types'
import { ExclamationIcon } from '../shared/icons'
import { ROUTE_LABELS } from './model'

export function RouteBadge({ route, large }: { route: Route; large?: boolean }) {
  return (
    <span className={`route-badge route-${route}${large ? ' route-badge-lg' : ''}`}>
      {route === 'urgent' && <ExclamationIcon size={12} />}
      {ROUTE_LABELS[route]}
    </span>
  )
}

export function TestBadge() {
  return <span className="test-badge">Test</span>
}
