import { useState, useEffect, useCallback } from 'react';
import PROVIDER from '../data-provider';

export function useQuery(resource, options = {}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { immediate = true, deps = [] } = options;

  const execute = useCallback(async (queryParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await PROVIDER.findMany(resource, queryParams);
      setData(result.data);
      setTotal(result.total);
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    if (immediate) execute();
  }, [immediate, ...deps]);

  return { data, total, loading, error, execute, refetch: execute };
}

export function useFindById(resource, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    if (!id) { setData(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await PROVIDER.findById(resource, id);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [resource, id]);

  useEffect(() => { execute(); }, [execute]);

  return { data, loading, error, refetch: execute };
}

export function useCreate(resource) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const result = await PROVIDER.create(resource, data);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}

export function useUpdate(resource) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const result = await PROVIDER.update(resource, id, data);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}

export function useDelete(resource) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const result = await PROVIDER.delete(resource, id);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}
