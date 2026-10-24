import { NavLink, Outlet, useLocation } from 'react-router'
import { DIRECTOR } from '../../../shared/copy'
import { initials } from '../shared/format'
import { BookIcon, ChartIcon, InboxIcon } from '../shared/icons'
import { Logo } from '../shared/Logo'
import { useInbox } from './OperatorApp'

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
          <h1>{section?.label ?? 'Inbox'}</h1>
        </header>
        <Outlet />
      </div>

      <nav className="tabbar" aria-label="Control center">
        {links}
      </nav>
    </div>
  )
}
