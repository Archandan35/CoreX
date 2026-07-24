import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import CommandBar from '@/components/CommandBar';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationsBell from '@/components/NotificationsBell';
import { ALL_NAV_ITEMS } from '@/routes/navigation';
import { useAuth } from '@/auth/AuthContext';
import { useSettings } from '@/auth/SettingsContext';

export default function Topbar({ onToggle }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, signOut, canViewModule } = useAuth();
  const { settings } = useSettings();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const current = ALL_NAV_ITEMS.find((i) => (i.end ? i.to === pathname : pathname.startsWith(i.to) && i.to !== '/')) ||
    ALL_NAV_ITEMS.find((i) => i.to === pathname) || { label: settings.siteTitle };

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((o) => !o); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const roleName = user?.roleCode || '';
  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="topbar">
      <button className="topbar__toggle" onClick={onToggle} aria-label="Toggle sidebar">
        <Icon name="menu" size={18} />
      </button>
      {settings?.logoUrl && (
        <img src={settings.logoUrl} alt={settings.siteTitle} className="topbar__logo" />
      )}
      <div>
        <div className="topbar__title">{current.label}</div>
        <div className="topbar__crumb">{settings?.siteTitle}{settings?.tagline ? ` · ${settings.tagline}` : ''}</div>
      </div>
      <div className="topbar__spacer" />

      <button className="topbar__search topbar__search--btn" onClick={() => setCmdOpen(true)}>
        <Icon name="search" size={16} />
        <span className="topbar__search-text">Search cases, drafts, citations…</span>
        <kbd className="cmd__kbd">⌘K</kbd>
      </button>

      <ThemeToggle />
      <NotificationsBell />

      <div className="usermenu" ref={menuRef}>
        <button className="topbar__avatar" onClick={() => setMenuOpen((o) => !o)} title={user?.name}
          aria-label={`User menu: ${user?.name}`} aria-haspopup="true" aria-expanded={menuOpen}>{initials}</button>
        {menuOpen && (
          <div className="usermenu__panel">
            <div className="usermenu__head">
              <div className="usermenu__name">{user?.name}</div>
              <div className="usermenu__meta">{user?.email || user?.username}</div>
              <div className="badge badge--admin topbar__role-badge">{roleName}</div>
            </div>
            {canViewModule?.('users') && (
              <button className="usermenu__item" onClick={() => { setMenuOpen(false); nav(`/admin/users/${user?.id}`); }}>
                <Icon name="user" size={15} /> My profile
              </button>
            )}
            <button className="usermenu__item usermenu__item--danger" onClick={signOut}>
              <Icon name="x" size={15} /> Sign out
            </button>
          </div>
        )}
      </div>

      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </header>
  );
}