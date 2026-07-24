import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import I from '../icon';
import Topbar from './Topbar';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(true);

  return (
    <div className="app-layout">
      <aside className={`app-sidebar ${!sidebarOpen ? 'collapsed' : ''} ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon"><I.Zap /></span>
          <span className="sidebar-brand-text">universal</span>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-title">MAIN</div>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon"><I.Dashboard /></span>
              <span className="sidebar-link-label">Dashboard</span>
            </NavLink>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-section-title">pages</div>
            <div className="sidebar-accordion">
              <button
                className={`sidebar-accordion-header ${pagesOpen ? 'open' : ''}`}
                onClick={() => setPagesOpen(!pagesOpen)}
              >
                <span className="sidebar-link-icon"><I.Folder /></span>
                <span className="sidebar-link-label">Parent pages</span>
                <span className={`sidebar-accordion-arrow ${pagesOpen ? 'open' : ''}`}>
                  <I.ChevronDown />
                </span>
              </button>
              {pagesOpen && (
                <div className="sidebar-accordion-body">
                  <NavLink
                    to="/users"
                    className={({ isActive }) => `sidebar-link sidebar-link-child ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sidebar-link-label">child pages</span>
                  </NavLink>
                  <NavLink
                    to="/roles"
                    className={({ isActive }) => `sidebar-link sidebar-link-child ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sidebar-link-label">child pages</span>
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="sidebar-status-icon"><I.Database /></span>
            <span className="sidebar-status-text">AI · DB supabase</span>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <Topbar onToggle={() => setSidebarOpen((o) => !o)} />
        <div className="app-content">
          <Outlet />
        </div>
      </main>

      {sidebarOpen && (
        <div className="overlay-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
