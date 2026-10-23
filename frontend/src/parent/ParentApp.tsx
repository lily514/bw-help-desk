import { Link } from 'react-router'
import { Logo } from '../shared/Logo'
import { useHealth } from '../shared/useHealth'
import '../shared/shell.css'

export function ParentApp() {
  const health = useHealth()

  return (
    <main className="placeholder">
      <section className="placeholder-card">
        <Logo />
        <h1>Maple Grove</h1>
        <p>Front desk for parents. The chat arrives in Phase 4.</p>
        <span className="placeholder-meta">API: {health}</span>
        <Link className="placeholder-link" to="/operator">
          Open the operator control center
        </Link>
      </section>
    </main>
  )
}
