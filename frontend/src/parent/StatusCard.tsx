import { CENTER_PHONE, CENTER_PHONE_TEL, HANDOFF_REPLY_TIME } from '../../../shared/copy'
import type { ThreadRequest } from '../../../shared/types'
import { BellIcon, CheckIcon, PhoneIcon, UserIcon, UsersIcon } from '../shared/icons'
import { STEP_LABELS, statusCard, trackerSteps, type StepState } from './status'

const CARD_ICONS = { looped_in: UsersIcon, handed_off: UserIcon, urgent: BellIcon }

function StepDot({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <span className="step step-done">
        <CheckIcon size={12} />
      </span>
    )
  }
  return <span className={`step step-${state}`}>{state === 'current' && <span />}</span>
}

/** Status card with the Delivered → Seen → Replied tracker (PLAN.md 4.3). */
export function StatusCard({ request, childName }: { request: ThreadRequest; childName: string }) {
  const card = statusCard(request, childName)
  if (!card) return null
  const steps = trackerSteps(request.status)
  const emphasized = steps.includes('current') ? steps.indexOf('current') : steps.length - 1
  const Icon = CARD_ICONS[card.variant]

  return (
    <section aria-label="Request status" className={`status-card status-${card.variant}`}>
      <div className="status-title">
        <Icon size={18} />
        <span>{card.title}</span>
      </div>
      {card.subtitle && <p className="status-subtitle">{card.subtitle}</p>}

      <div className="tracker" aria-hidden="true">
        {steps.map((state, i) => (
          <span key={i} className="tracker-segment">
            {i > 0 && <span className={`tracker-line${state === 'done' ? ' is-done' : ''}`} />}
            <StepDot state={state} />
          </span>
        ))}
      </div>
      <div className="tracker-labels">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={[
              i === emphasized ? 'is-current' : '',
              steps[i] === 'pending' ? 'is-pending' : '',
            ].join(' ')}
          >
            {label}
          </span>
        ))}
      </div>
      <p className="sr-only">
        Status: {STEP_LABELS[emphasized]}
        {steps[emphasized] === 'current' ? ' is next' : ''}.
      </p>

      {card.showContact && (
        <div className="status-contact">
          <span>{HANDOFF_REPLY_TIME}</span>
          <a href={`tel:${CENTER_PHONE_TEL}`}>
            <PhoneIcon size={16} />
            Call the center: {CENTER_PHONE}
          </a>
        </div>
      )}
    </section>
  )
}
