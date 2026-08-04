import { createContext, useContext, useState, useCallback } from 'react';

const HeaderActionsCtx = createContext(null);

// Lets an active page register its page-specific handlers (search ref,
// barcode handler, notification info) so the shared Topbar can render the
// universal header-action buttons (Search / Barcode / Notifications /
// Fullscreen / Theme) on every page.
export function HeaderActionsProvider({ children }) {
  const [pageActions, setPageActions] = useState(null);

  const registerPageActions = useCallback((cfg) => {
    setPageActions(cfg || null);
  }, []);

  return (
    <HeaderActionsCtx.Provider value={{ pageActions, registerPageActions }}>
      {children}
    </HeaderActionsCtx.Provider>
  );
}

export function useHeaderActions() {
  const ctx = useContext(HeaderActionsCtx);
  if (!ctx) {
    throw new Error('useHeaderActions must be used within a HeaderActionsProvider');
  }
  return ctx;
}
