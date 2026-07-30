import { createContext, useContext, useState, useCallback } from 'react';

const ToolbarContext = createContext(null);

export function ToolbarProvider({ children }) {
  const [items, setItems] = useState([]);
  const setToolbarItems = useCallback((newItems) => setItems(newItems), []);
  return (
    <ToolbarContext.Provider value={{ items, setToolbarItems }}>
      {children}
    </ToolbarContext.Provider>
  );
}

export function useToolbar() {
  const ctx = useContext(ToolbarContext);
  if (!ctx) throw new Error('useToolbar must be used within ToolbarProvider');
  return ctx;
}
