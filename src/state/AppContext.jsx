import { createContext, useContext, useCallback, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [showWizard, setShowWizard] = useState(false);
  // Result of the most recent live database validation (see App.jsx). Shape:
  // { compatible: boolean, missingCount: number, everInstalled: boolean } | null
  const [dbHealth, setDbHealth] = useState(null);

  const openSetupWizard = useCallback(() => {
    setShowWizard(true);
  }, []);

  const closeSetupWizard = useCallback(() => {
    setShowWizard(false);
  }, []);

  return (
    <AppContext.Provider value={{ showWizard, setShowWizard, openSetupWizard, closeSetupWizard, dbHealth, setDbHealth }}>
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
