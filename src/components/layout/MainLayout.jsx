import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { ToolbarProvider } from './ToolbarContext.jsx';
import { FullscreenProvider, useFullscreen } from './FullscreenContext.jsx';
import { HeaderActionsProvider } from './HeaderActionsContext.jsx';

function MainLayoutContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isFullscreen, containerRef } = useFullscreen();
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const toggle = () => {
    if (isFullscreen) return;
    if (window.innerWidth <= 860) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <div className={`app-shell ${isFullscreen ? 'fullscreen' : ''}`}>
      {!isFullscreen && (
        <>
          <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggle={toggle} />
          {mobileOpen && (
            <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
          )}
        </>
      )}
        <div className={`app-main ${collapsed ? 'collapsed' : ''} ${isFullscreen ? 'fullscreen-main' : ''}`} ref={containerRef}>
          <ToolbarProvider>
            <HeaderActionsProvider>
              <Topbar onToggle={toggle} />
              <main id="main-content" className="page-area">
                <Outlet />
              </main>
            </HeaderActionsProvider>
          </ToolbarProvider>
        </div>
    </div>
  );
}

export default function MainLayout() {
  return (
    <FullscreenProvider>
      <MainLayoutContent />
    </FullscreenProvider>
  );
}