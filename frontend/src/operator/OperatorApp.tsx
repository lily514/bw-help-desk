import { Link } from 'react-router'
import { Logo } from '../shared/Logo'
import { useHealth } from '../shared/useHealth'
import '../shared/shell.css'

export function OperatorApp() {
  const health = useHealth()

  return (
    <main className="placeholder">
      <section className="placeholder-card">
        <Logo />
        <h1>Front desk control center</h1>
        <p>Inbox, Knowledge and Insights arrive in Phases 5–7.</p>
        <span className="placeholder-meta">API: {health}</span>
        <Link className="placeholder-link" to="/">
          Open the parent app
        </Link>
      </section>
    </main>
  )
}
