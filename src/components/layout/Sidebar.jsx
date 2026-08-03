import { useState, useEffect, Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_GROUPS } from '../../routes/navigation.js';
import { usePermission } from '../../identity/authorization/PermissionContext.jsx';
import { useApp } from '../../state/AppContext.jsx';
import Icon from '../ui/Icon.jsx';
import { settingsApiService } from '../../services/settings/SettingsApiService.js';
import { settingsManager } from '../../managers/SettingsManager.js';

function SidebarItem({ item, collapsed }) {
  const { hasPermission } = usePermission();
  const { openSetupWizard } = useApp();

  if (item.children) {
    return <SubmenuGroup item={item} collapsed={collapsed} hasPermission={hasPermission} />;
  }

  if (item.permission && !hasPermission(item.permission)) return null;

  if (item.action === 'setupWizard') {
    return (
      <button
        type="button"
        className="nav-item nav-item--action"
        onClick={openSetupWizard}
        title={item.label}
      >
        <span className="nav-item__icon"><Icon name={item.icon} size={18} /></span>
        <span className="nav-item__label">{item.label}</span>
      </button>
    );
  }

  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      aria-current={({ isActive }) => isActive ? 'page' : undefined}
      title={item.label}
    >
      <span className="nav-item__icon"><Icon name={item.icon} size={18} /></span>
      <span className="nav-item__label">{item.label}</span>
    </NavLink>
  );
}

function SubmenuGroup({ item, _collapsed, hasPermission }) {
  const [open, setOpen] = useState(true);
  const subId = `sub-${item.label?.replace(/\s+/g, '-').toLowerCase()}`;

  const visible = item.children.filter((c) => !c.permission || hasPermission(c.permission));
  if (visible.length === 0) return null;

  return (
    <div className="nav-submenu">
      <button
        className="nav-submenu__toggle"
        onClick={() => setOpen((o) => !o)}
        title={item.label}
        aria-expanded={open}
        aria-controls={subId}
      >
        <span className="nav-item__icon"><Icon name={item.icon} size={18} /></span>
        <span className="nav-item__label">{item.label}</span>
        <span className={`nav-submenu__arrow ${open ? 'open' : ''}`}>
          <Icon name="chevronDown" size={14} />
        </span>
      </button>
      {open && (
        <div className="nav-submenu__items" id={subId}>
          {visible.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              className={({ isActive }) => `nav-item nav-item--sub ${isActive ? 'active' : ''}`}
              aria-current={({ isActive }) => isActive ? 'page' : undefined}
              title={child.label}
            >
              <span className="nav-item__label">{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function buildSections() {
  const sections = [];
  for (let i = 0; i < NAV_GROUPS.length; i += 1) {
    const entry = NAV_GROUPS[i];
    if (entry.type === 'heading') {
      const next = NAV_GROUPS[i + 1];
      if (next && next.type !== 'heading') {
        sections.push({ heading: entry.label, group: next });
        i += 1;
      }
    } else {
      sections.push({ heading: null, group: entry });
    }
  }
  return sections;
}

export default function Sidebar({ collapsed, mobileOpen, _onToggle }) {
  const { hasPermission } = usePermission();
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    settingsApiService.getAll().then((res) => {
      const s = res?.settings;
      if (s?.logo) setLogoUrl(s.logo);
    }).catch(() => {});

    const unsub = settingsManager.onChange('logo', (url) => {
      if (url) setLogoUrl(url);
    });

    return () => {
      unsub();
    };
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar__brand">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="sidebar__logo--transparent" />
          ) : (
            <div className="sidebar__logo--transparent">
              <Icon name="home" size={22} />
            </div>
          )}
        </div>

      <nav className="sidebar__nav" aria-label="Sidebar menu">
        {buildSections().map((section, i) => {
          const { heading, group } = section;
          if (!group) return null;

          if (group.children) {
            const visible = group.children.filter((c) => !c.permission || hasPermission(c.permission));
            if (visible.length === 0) return null;
            return (
              <Fragment key={i}>
                {heading && <div className="nav-heading">{heading}</div>}
                <SidebarItem item={group} collapsed={collapsed} />
              </Fragment>
            );
          }

          const visibleItems = (group.items || []).filter((item) => {
            if (item.children) {
              return item.children.some((c) => !c.permission || hasPermission(c.permission));
            }
            return !item.permission || hasPermission(item.permission);
          });

          if (visibleItems.length === 0) return null;

          return (
            <Fragment key={i}>
              {heading && <div className="nav-heading">{heading}</div>}
              <div className="nav-group">
                {group.label && <div className="nav-group__label">{group.label}</div>}
                {visibleItems.map((item, j) => (
                  <SidebarItem key={j} item={item} collapsed={collapsed} />
                ))}
              </div>
            </Fragment>
          );
        })}
      </nav>
    </aside>
  );
}