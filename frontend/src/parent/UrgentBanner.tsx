import { CENTER_PHONE, CENTER_PHONE_TEL } from '../../../shared/copy'
import { AlertIcon, PhoneIcon } from '../shared/icons'

export function UrgentBanner() {
  return (
    <div role="alert" className="urgent-banner">
      <div className="urgent-text">
        <AlertIcon size={22} />
        <div>
          <strong>Call the center now</strong>
          <span>Staff have been alerted. Calling is the fastest way to reach them.</span>
        </div>
      </div>
      <a href={`tel:${CENTER_PHONE_TEL}`} className="urgent-call">
        <PhoneIcon size={18} strokeWidth={2.2} />
        Call {CENTER_PHONE}
      </a>
    </div>
  )
}
