import { useState, useCallback, useEffect, useRef } from 'react';
import { INVOICE_TABLE_COLUMNS, COLUMN_STORAGE_KEY } from '../constants/index.js';
import { invoiceService } from '../services/invoice/index.js';
import { api } from '../services/api.js';

const COLUMN_PREFS_KEY_PREFIX = 'column_visibility_';

function getDefaultKeys(columns) {
  return columns.filter((c) => c.always || c.defaultVisible).map((c) => c.key);
}

async function savePreferences(userId, keys) {
  try {
    const key = `${COLUMN_PREFS_KEY_PREFIX}${userId || 'default'}`;
    await api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ [key]: JSON.stringify(keys) }),
    });
  } catch {
  }
}

async function loadPreferences(userId) {
  try {
    const key = `${COLUMN_PREFS_KEY_PREFIX}${userId || 'default'}`;
    const res = await api('/api/settings');
    const data = await res.json();
    const settings = data?.settings || {};
    const raw = settings[key];
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  } catch {
    return null;
  }
}

export default function useColumnVisibility(userId) {
  const [columns, setColumns] = useState(INVOICE_TABLE_COLUMNS);

  const [visibleKeys, setVisibleKeysState] = useState(() => {
    try {
      const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : getDefaultKeys(INVOICE_TABLE_COLUMNS);
    } catch {
      return getDefaultKeys(INVOICE_TABLE_COLUMNS);
    }
  });

  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    invoiceService.getColumnDefinitions().then((loadedColumns) => {
      setColumns(loadedColumns);

      const savedKeys = (() => {
        try {
          const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();

      if (savedKeys && Array.isArray(savedKeys)) {
        const validKeys = savedKeys.filter((k) => loadedColumns.some((c) => c.key === k));
        const alwaysKeys = loadedColumns.filter((c) => c.always).map((c) => c.key);
        const merged = [...new Set([...alwaysKeys, ...validKeys])];
        setVisibleKeysState(merged);
      } else {
        setVisibleKeysState(getDefaultKeys(loadedColumns));
      }

      return loadPreferences(userId);
    }).then((prefs) => {
      if (prefs && Array.isArray(prefs) && prefs.length > 0) {
        setVisibleKeysState(prefs);
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(prefs));
      }
    }).catch(() => {});
  }, [userId]);

  const setVisibleKeys = useCallback((keys) => {
    const validKeys = keys.filter((k) => columns.some((c) => c.key === k));
    const defaultKeys = getDefaultKeys(columns);
    const merged = [...new Set([...defaultKeys.filter((k) => {
      const col = columns.find((c) => c.key === k);
      return col?.always;
    }), ...validKeys])];
    setVisibleKeysState(merged);
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(merged));
    savePreferences(userId, merged);
  }, [userId, columns]);

  const toggleColumn = useCallback((key) => {
    const col = columns.find((c) => c.key === key);
    if (col?.always) return;
    setVisibleKeysState((prev) => {
      let next;
      if (prev.includes(key)) {
        next = prev.filter((k) => k !== key);
      } else {
        next = [...prev, key];
      }
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
      savePreferences(userId, next);
      return next;
    });
  }, [userId, columns]);

  const allColumns = columns;

  const visibleColumns = allColumns.filter((c) => visibleKeys.includes(c.key));

  return {
    visibleKeys,
    allColumns,
    visibleColumns,
    toggleColumn,
    setVisibleKeys,
  };
}
