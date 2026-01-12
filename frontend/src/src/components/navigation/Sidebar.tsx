import type { NavItem } from '../../data/mockData'
import { useAuth } from '../../hooks/useAuth'

type SidebarProps = {
  navItems: NavItem[]
  activeSection: NavItem['id']
  onSelect: (id: NavItem['id']) => void
  onAddAnimal: () => void
}

export function Sidebar({ navItems, activeSection, onSelect }: SidebarProps) {
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar" aria-label="Nawigacja główna">
      <div className="brand">
        <div className="brand-mark">B</div>
        <div>
          <div className="brand-name">Barfik</div>
          <div className="brand-sub">plan posiłków</div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${item.id === activeSection ? 'is-active' : ''}`}
            onClick={() => onSelect(item.id)}
            aria-current={item.id === activeSection ? 'page' : undefined}
            data-testid={`nav-${item.id}`}
          >
            <div className="nav-title">{item.label}</div>
            <div className="nav-desc">{item.description}</div>
            {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">

        {user && (
          <div className="user-info">
            <div className="user-avatar" data-testid="user-menu-button">
              {user.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">
                {user.first_name && user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.username}
              </div>
              {user.email && (
                <div className="user-email">{user.email}</div>
              )}
              <button
                type="button"
                className="logout-btn"
                onClick={logout}
                aria-label="Wyloguj się"
                data-testid="logout-button"
              >
                Wyloguj
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
