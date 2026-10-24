import { Component, type ReactNode } from 'react'
import { CENTER_PHONE } from '../../../shared/copy'
import { Logo } from './Logo'

/** Last resort for a render error: a calm page with a reload button instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="crash" role="alert">
        <Logo size={56} />
        <h1>Something went wrong</h1>
        <p>Reload the page to try again. If you need the center right away, call {CENTER_PHONE}.</p>
        <button type="button" className="btn btn-primary" onClick={() => location.reload()}>
          Reload
        </button>
      </main>
    )
  }
}
