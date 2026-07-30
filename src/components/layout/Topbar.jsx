import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ALL_NAV_ITEMS } from '../../routes/navigation.js';
import { useAuth } from '../../identity/auth/AuthContext.jsx';
import Icon from '../ui/Icon.jsx';
import { useToolbar } from './ToolbarContext.jsx';
import { settingsApiService } from '../../services/settings/SettingsApiService.js';
import { settingsManager } from '../../managers/SettingsManager.js';
import { themeManager } from '../../managers/ThemeManager.js';
import { Minimize2 } from 'lucide-react';
import { useFullscreen } from './FullscreenContext.jsx';

export default function Topbar({ onToggle }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { items } = useToolbar();
  const [logoUrl, setLogoUrl] = useState(null);
  const isDark = themeManager.isDark();
  const { isFullscreen, exitFullscreen } = useFullscreen();

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

    const unsubLogo = settingsManager.onChange('logo', (url) => {
      if (url) setLogoUrl(url);
    });

    const unsubFavicon = settingsManager.onChange('favicon', (url) => {
      if (url) {
        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = url;
      }
    });

    return () => {
      unsubLogo();
      unsubFavicon();
    };
  }, []);

  const current = ALL_NAV_ITEMS.find((i) => (i.end ? i.to === pathname : pathname.startsWith(i.to) && i.to !== '/')) ||
    ALL_NAV_ITEMS.find((i) => i.to === pathname) || { label: 'Dashboard' };

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const tabs = items.filter(i => i.type === 'tab');
  const actions = items.filter(i => i.type !== 'tab');

  return (
    <header className="topbar">
      {!isFullscreen && (
        <button className="topbar__toggle" onClick={onToggle} aria-label="Toggle sidebar">
          <Icon name="menu" size={18} />
        </button>
      )}

      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="topbar__logo" />
      ) : (
        <div className="topbar__title">{isFullscreen ? 'POS' : current.label}</div>
      )}

      {isFullscreen && (
        <button className="topbar__qs-btn qs-btn-outline topbar__exit-fs" onClick={exitFullscreen} aria-label="Exit fullscreen">
          <Minimize2 size={16} /> ESC Exit
        </button>
      )}

      {tabs.length > 0 && !isFullscreen && (
        <nav className="topbar__tabs">
          {tabs.map((tab, i) => (
            <button key={i} className={tab.className || 'topbar__tab'} onClick={tab.action}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>
      )}

      <div className="topbar__spacer" />

      {actions.map((item, i) => (
        <button key={i} className={item.className || 'topbar__qs-btn'} onClick={item.action}>
          {item.icon}
          {item.label}
        </button>
      ))}

      <button className="topbar__theme-toggle" onClick={() => themeManager.toggle()} aria-label="Toggle theme">
        <div className={`topbar__theme-track ${isDark ? 'dark' : ''}`}>
          <Icon name="sun" size={14} />
          <div className="topbar__theme-thumb">
            <Icon name={isDark ? 'moon' : 'sun'} size={12} />
          </div>
          <Icon name="moon" size={14} />
        </div>
      </button>

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