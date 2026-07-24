import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import settingsService from '../services/SettingsService';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        const data = await settingsService.getAll();
        setSettings(data || {});
      } catch (err) {
        setSettings({});
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    initializeSettings();
  }, []);

  const refresh = async () => {
    try {
      const data = await settingsService.getAll();
      setSettings(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const value = {
    settings: settings || {},
    loading,
    error,
    refresh,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export default SettingsContext;