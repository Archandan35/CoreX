import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ALL_NAV_ITEMS } from '../../routes/navigation.js';
import { useAuth } from '../../identity/auth/AuthContext.jsx';
import Icon from '../ui/Icon.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';
import { useToolbar } from './ToolbarContext.jsx';
import { settingsApiService } from '../../services/settings/SettingsApiService.js';

export default function Topbar({ onToggle }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { items } = useToolbar();
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    settingsApiService.getAll().then((res) => {
      const s = res?.settings;
      if (s?.logo) setLogoUrl(s.logo);
      if (s?.favicon) {
        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = s.favicon;
      }
    }).catch(() => {});
  }, []);

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
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="topbar__logo" />
      ) : (
        <div className="topbar__title">{current.label}</div>
      )}
      <div className="topbar__spacer" />

      {items.map((item, i) => (
        <button key={i} className={item.className || 'topbar__qs-btn'} onClick={item.action}>
          {item.icon}
          {item.label}
        </button>
      ))}

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
