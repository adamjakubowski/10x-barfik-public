import type { NavItem } from '../../data/mockData'

type BottomNavProps = {
  navItems: NavItem[]
  activeSection: NavItem['id']
  onSelect: (id: NavItem['id']) => void
}

export function BottomNav({ navItems, activeSection, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Nawigacja dolna">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`bottom-nav-item ${item.id === activeSection ? 'is-active' : ''}`}
          onClick={() => onSelect(item.id)}
          aria-current={item.id === activeSection ? 'page' : undefined}
          data-testid={`nav-${item.id}`}
        >
          <span>{item.label}</span>
          <small>{item.description}</small>
        </button>
      ))}
    </nav>
  )
}
