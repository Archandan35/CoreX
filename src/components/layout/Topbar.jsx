import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ALL_NAV_ITEMS } from '../../routes/navigation.js';
import { useAuth } from '../../identity/auth/AuthContext.jsx';
import Icon from '../ui/Icon.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';

export default function Topbar({ onToggle }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const current = ALL_NAV_ITEMS.find((i) => (i.end ? i.to === pathname : pathname.startsWith(i.to) && i.to !== '/')) ||
    ALL_NAV_ITEMS.find((i) => i.to === pathname) || { label: 'Dashboard' };

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="topbar">
      <button className="topbar__toggle" onClick={onToggle} aria-label="Toggle sidebar">
        <Icon name="menu" size={18} />
      </button>
      <div className="topbar__title">{current.label}</div>
      <div className="topbar__spacer" />

      <ThemeToggle />
      <div className="usermenu" ref={menuRef}>
        <button className="topbar__avatar" onClick={() => setMenuOpen((o) => !o)} title={user?.name} aria-label={`User menu: ${user?.name}`} aria-haspopup="true" aria-expanded={menuOpen}>{initials}</button>
        {menuOpen && (
          <div className="usermenu__panel">
            <div className="usermenu__head">
              <div className="usermenu__name">{user?.name}</div>
              <div className="usermenu__meta">{user?.email || user?.username}</div>
            </div>
            <button className="usermenu__item usermenu__item--danger" onClick={logout}>
              <Icon name="close" size={15} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}