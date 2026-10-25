import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { DIRECTOR } from '../../../shared/copy'
import { initials } from '../shared/format'
import {
  BookIcon,
  ChartIcon,
  ChevronLeftIcon,
  HomeIcon,
  InboxIcon,
  PlusIcon,
} from '../shared/icons'
import { Logo } from '../shared/Logo'
import { useInbox } from './OperatorApp'
import { TestBar, TestModeSwitch } from './TestMode'

const NAV = [
  { to: 'inbox', label: 'Inbox', Icon: InboxIcon },
  { to: 'knowledge', label: 'Knowledge', Icon: BookIcon },
  { to: 'insights', label: 'Insights', Icon: ChartIcon },
] as const

/** Sidebar on laptops, bottom tab bar below ~768px (PLAN.md 4.4). */
export function Shell() {
  const { items } = useInbox()
  const newCount = items?.filter((i) => i.status === 'new').length ?? 0
  const { pathname } = useLocation()
  const section = NAV.find((n) => pathname.startsWith(`/operator/${n.to}`))
  const title = pathname.startsWith('/operator/test') ? 'Test run results' : section?.label

  const links = NAV.map(({ to, label, Icon }) => (
    <NavLink key={to} to={`/operator/${to}`} className="nav-link">
      <Icon size={20} />
      <span className="nav-label">{label}</span>
      {to === 'inbox' && newCount > 0 && (
        <span className="nav-count" aria-label={`${newCount} new`}>
          {newCount}
        </span>
      )}
    </NavLink>
  ))

  // Back to the landing page, e.g. to switch to the parent view.
  const home = (
    <Link to="/" className="nav-link nav-home">
      <HomeIcon size={20} />
      <span className="nav-label">Demo home</span>
    </Link>
  )

  return (
    <div className="operator">
      <nav className="sidebar" aria-label="Control center">
        <div className="sidebar-brand">
          <Logo size={36} />
          <div>
            <span className="sidebar-name">Maple Grove</span>
            <span className="sidebar-sub">Front desk control center</span>
          </div>
        </div>
        <div className="sidebar-links">{links}</div>
        {home}
        <div className="sidebar-profile">
          <span className="avatar avatar-lg" aria-hidden="true">
            {initials(DIRECTOR.name)}
          </span>
          <div>
            <span className="profile-name">{DIRECTOR.name}</span>
            <span className="profile-role">{DIRECTOR.role}</span>
          </div>
        </div>
      </nav>

      <div className="operator-main">
        <header className="operator-header">
          <HeaderTitle pathname={pathname} fallback={title ?? 'Inbox'} />
          <div className="header-actions">
            {/^\/operator\/knowledge\/?$/.test(pathname) && (
              <Link to="/operator/knowledge/new" className="btn btn-primary">
                <PlusIcon size={16} />
                New entry
              </Link>
            )}
            <TestModeSwitch />
          </div>
        </header>
        <TestBar />
        <Outlet />
      </div>

      <nav className="tabbar" aria-label="Control center">
        {links}
        {home}
      </nav>
    </div>
  )
}

/** Page title, or the Knowledge editor's breadcrumb. */
function HeaderTitle({ pathname, fallback }: { pathname: string; fallback: string }) {
  const editing = pathname.match(/^\/operator\/knowledge\/(.+)$/)
  if (editing) {
    return (
      <div className="breadcrumb">
        <Link to="/operator/knowledge" className="breadcrumb-link">
          <ChevronLeftIcon size={18} />
          Knowledge
        </Link>
        <span aria-hidden="true" className="breadcrumb-sep">
          /
        </span>
        <h1>{editing[1] === 'new' ? 'New entry' : 'Edit entry'}</h1>
      </div>
    )
  }
  if (pathname.startsWith('/operator/insights')) {
    return (
      <div className="header-title">
        <h1>Insights</h1>
        <span className="muted">Last 7 days · test conversations excluded</span>
      </div>
    )
  }
  return <h1>{fallback}</h1>
}
