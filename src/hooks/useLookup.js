import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';

export function useLookup(url, keepResult = false) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api(url)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && mountedRef.current) {
          const items = body?.data || body?.items || body || [];
          setData(Array.isArray(items) ? items : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled && mountedRef.current) {
          setError(err.message || 'Failed to load.');
          setLoading(false);
          if (!keepResult) setData([]);
        }
      });
    return () => { cancelled = true; };
  }, [url, keepResult]);

  return { data, loading, error };
}
