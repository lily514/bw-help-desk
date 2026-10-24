import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ROOMS, type Room } from '../../../shared/types'
import { api } from '../shared/api'
import { ChevronLeftIcon } from '../shared/icons'
import { setParentId } from './session'

export function CreateParent({ onCreated }: { onCreated: (id: string) => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [childName, setChildName] = useState('')
  const [room, setRoom] = useState<Room>('Twos')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !childName.trim()) {
      setError("Please add your name and your child's first name.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const parent = await api.createParent({ name, childName, room })
      setParentId(parent.id)
      onCreated(parent.id)
      navigate('/parent/chat')
    } catch {
      setError("We couldn't create the parent just now. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div className="screen">
      <header className="subheader">
        <Link to="/parent" className="icon-button" aria-label="Back to sign in">
          <ChevronLeftIcon size={22} />
        </Link>
        <span className="subheader-title">New parent</span>
      </header>

      <form className="create-form" onSubmit={submit} noValidate>
        <div className="create-intro">
          <span className="badge-evaluator">For evaluators</span>
          <h1>Create a demo parent</h1>
          <p>
            You'll get a fresh, empty chat. Answers will use your child's name, and anything you
            send reaches Dana's inbox like any other parent's.
          </p>
        </div>

        <fieldset>
          <legend>You</legend>
          <div className="field">
            <label htmlFor="parent-name">Your name</label>
            <input
              id="parent-name"
              type="text"
              autoComplete="name"
              placeholder="Alex Morgan"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>Your child</legend>
          <div className="field">
            <label htmlFor="child-name">First name</label>
            <input
              id="child-name"
              type="text"
              placeholder="Jamie"
              maxLength={40}
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="child-room">Classroom</label>
            <select id="child-room" value={room} onChange={(e) => setRoom(e.target.value as Room)}>
              {ROOMS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </fieldset>

        <div className="create-actions">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block btn-cta" disabled={saving}>
            {saving ? 'Creating…' : 'Create and start chatting'}
          </button>
          <p className="footnote">Demo parents are cleared when test data is reset.</p>
        </div>
      </form>
    </div>
  )
}
