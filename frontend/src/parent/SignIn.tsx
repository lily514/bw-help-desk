import { Link, useNavigate } from 'react-router'
import { UserPlusIcon } from '../shared/icons'
import { Logo } from '../shared/Logo'
import { DEMO_PARENT_ID, setParentId } from './session'

export function SignIn({ onSignIn }: { onSignIn: (id: string) => void }) {
  const navigate = useNavigate()

  const continueAsSam = () => {
    setParentId(DEMO_PARENT_ID)
    onSignIn(DEMO_PARENT_ID)
    navigate('/parent/chat')
  }

  return (
    <main className="signin">
      <div className="signin-hero">
        <Logo size={88} />
        <div className="signin-name">
          <h1>Maple Grove</h1>
          <p>Early Learning Center</p>
        </div>
        <p className="signin-intro">
          Ask about hours, meals, pickup or your child's day. Answers come from our own policies,
          and Dana is always close by.
        </p>
      </div>
      <div className="signin-actions">
        <button type="button" className="btn btn-primary btn-block btn-cta" onClick={continueAsSam}>
          Continue as Sam Rivera
        </button>
        <Link to="/parent/new" className="btn btn-secondary btn-block btn-cta-secondary">
          <UserPlusIcon size={18} />
          Create a new parent
        </Link>
        <p className="footnote">
          Demo sign-in. No password needed.
          <br />
          Evaluators: create your own parent and child to start with an empty thread.
        </p>
      </div>
    </main>
  )
}
