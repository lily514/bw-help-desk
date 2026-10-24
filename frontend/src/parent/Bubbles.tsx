import type { Message } from '../../../shared/types'
import { formatTime, initials } from '../shared/format'
import { FileIcon } from '../shared/icons'

export function ParentBubble({ message }: { message: Message }) {
  return (
    <div className="bubble bubble-parent">
      {message.isTest && <span className="bubble-test-tag">Test</span>}
      {message.text}
    </div>
  )
}

/** Plain AI bubble (greeting, acknowledgements). */
export function AiText({ text }: { text: string }) {
  return <div className="bubble bubble-ai">{text}</div>
}

interface AiAnswerProps {
  message: Message
  titles: Record<string, string>
  onOpenCitation: (id: string) => void
  /** Shown under answers that went to no one yet. */
  onAskPerson?: () => void
  askingPerson?: boolean
  streaming?: boolean
}

export function AiAnswer({
  message,
  titles,
  onOpenCitation,
  onAskPerson,
  askingPerson,
  streaming,
}: AiAnswerProps) {
  return (
    <div className="ai-answer">
      <div className={`bubble bubble-ai bubble-ai-answer${streaming ? ' is-streaming' : ''}`}>
        <p>{message.text}</p>
        {message.citations.length > 0 && (
          <div className="chips">
            {message.citations.map((id) => (
              <button key={id} type="button" className="chip" onClick={() => onOpenCitation(id)}>
                <FileIcon size={15} />
                {titles[id] ?? 'Center policy'}
              </button>
            ))}
          </div>
        )}
      </div>
      {onAskPerson && (
        <button type="button" className="ask-person" onClick={onAskPerson} disabled={askingPerson}>
          {askingPerson ? 'Sending to Dana…' : 'Ask a person'}
        </button>
      )}
    </div>
  )
}

export function StaffBubble({ message }: { message: Message }) {
  const name = message.staffName ?? 'Maple Grove staff'
  return (
    <div className="staff-message">
      <div className="staff-meta">
        <span className="avatar" aria-hidden="true">
          {initials(name)}
        </span>
        <span className="staff-name">{name}</span>
        <span className="staff-detail">
          {message.staffRole ? `${message.staffRole} · ` : ''}
          {formatTime(message.createdAt)}
        </span>
      </div>
      <div className="bubble bubble-staff">{message.text}</div>
    </div>
  )
}

export function TypingBubble() {
  return (
    <div className="bubble bubble-ai typing" role="status" aria-label="The front desk is typing">
      <span />
      <span />
      <span />
    </div>
  )
}
