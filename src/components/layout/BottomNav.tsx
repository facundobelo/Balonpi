import type { PageId } from '../../App';

interface BottomNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const navItems: { id: PageId; label: string; icon: string }[] = [
  { id: 'home', label: 'Inicio', icon: '🏠' },
  { id: 'squad', label: 'Plantilla', icon: '👥' },
  { id: 'fixtures', label: 'Fixture', icon: '📅' },
  { id: 'world', label: 'Explorar', icon: '🌍' },
  { id: 'office', label: 'Oficina', icon: '🏢' },
];

export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`nav-item ${activePage === item.id ? 'active' : ''}`}
        >
          <span className="text-xl">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
