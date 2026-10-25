import { ResetIcon } from '../shared/icons'

/** "Try again" under a load error. */
export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn-outline" onClick={onClick}>
      <ResetIcon size={16} />
      Try again
    </button>
  )
}
