import { Link } from 'react-router'
import { ArrowRightIcon, InboxIcon, LightbulbIcon, MessageIcon } from './shared/icons'
import { Logo } from './shared/Logo'
import './landing.css'

/** "Choose a view" landing at / (design reference screen 0). */
export function Landing() {
  return (
    <div className="landing">
      <main className="landing-main">
        <div className="landing-hero">
          <Logo size={72} />
          <span className="landing-center">Maple Grove Early Learning Center</span>
          <h1>AI Front Desk</h1>
          <p>
            Parents get answers from the center's own policies. Anything sensitive goes to a person.
            Pick a side to start.
          </p>
        </div>

        <div className="landing-cards">
          <Link to="/parent" className="landing-card">
            <span className="landing-icon">
              <MessageIcon size={26} />
            </span>
            <span className="landing-card-text">
              <span className="landing-eyebrow">Parent · best on a phone</span>
              <span className="landing-card-title">I'm a parent</span>
              <span className="landing-card-body">
                Chat with the front desk as Sam Rivera, or create your own parent and child.
              </span>
            </span>
            <span className="btn btn-primary landing-cta">
              Open parent view
              <ArrowRightIcon size={18} />
            </span>
          </Link>

          <Link to="/operator" className="landing-card">
            <span className="landing-icon">
              <InboxIcon size={26} />
            </span>
            <span className="landing-card-text">
              <span className="landing-eyebrow">Operator · best on a laptop</span>
              <span className="landing-card-title">I'm the front desk</span>
              <span className="landing-card-body">
                Work the inbox as Dana Whitfield: reply, forward, and teach the AI new answers.
              </span>
            </span>
            <span className="btn landing-cta landing-cta-outline">
              Open operator view
              <ArrowRightIcon size={18} />
            </span>
          </Link>
        </div>

        <div className="landing-tip">
          <LightbulbIcon size={22} />
          <p>
            <strong>Demo tip:</strong> open the parent view on a phone and the operator view on a
            laptop to watch them update together. Working alone? Turn on Test mode in the operator
            view and the system runs itself.
          </p>
        </div>

        <p className="landing-footer">
          A prototype for brightwheel. Maple Grove is a fictional center.
        </p>
      </main>
    </div>
  )
}
