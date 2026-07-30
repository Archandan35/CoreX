import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { ToolbarProvider } from './ToolbarContext.jsx';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const toggle = () => {
    if (window.innerWidth <= 860) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggle={toggle} />
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <div className={`app-main ${collapsed ? 'collapsed' : ''}`}>
        <ToolbarProvider>
          <Topbar onToggle={toggle} />
          <main id="main-content" className="page-area">
            <Outlet />
          </main>
        </ToolbarProvider>
      </div>
    </div>
  );
}