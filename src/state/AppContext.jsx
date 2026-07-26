import { createContext, useContext, useCallback, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [showWizard, setShowWizard] = useState(false);
  // Result of the most recent live database validation (see App.jsx). Shape:
  // { compatible: boolean, missingCount: number, everInstalled: boolean } | null
  const [dbHealth, setDbHealth] = useState(null);
  // Whether at least one user with full_access = true exists. null = not yet
  // determined (still loading / database not compatible). false = no admin
  // exists yet → the system is uninitialized and an "admin setup needed" banner
  // must be shown on EVERY page regardless of authentication (it is the prompt
  // to create the first administrator). true = an admin exists → only
  // full_access users may see maintenance banners from then on.
  const [adminExists, setAdminExists] = useState(null);
  // refreshAdminStatus is populated by AppRoutes (which owns the database
  // connection and the checkAdmin routine). Other components — notably the
  // Register page, after creating the first administrator — call this to make
  // the "no administrator" banner disappear automatically across the whole app
  // without requiring a full page reload. null until AppRoutes registers it.
  const [refreshAdminStatus, setRefreshAdminStatus] = useState(null);

  const openSetupWizard = useCallback(() => {
    setShowWizard(true);
  }, []);

  const closeSetupWizard = useCallback(() => {
    setShowWizard(false);
  }, []);

  return (
    <AppContext.Provider value={{
      showWizard,
      setShowWizard,
      openSetupWizard,
      closeSetupWizard,
      dbHealth,
      setDbHealth,
      adminExists,
      setAdminExists,
      refreshAdminStatus,
      setRefreshAdminStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
