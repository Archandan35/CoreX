import { useState, useCallback, useRef, useEffect } from 'react';
import useFieldValidation from './useFieldValidation.js';

export default function useDocumentForm({ defaults = {}, rules = {}, onSave } = {}) {
  const [data, setData] = useState({ ...defaults });
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { errors, validate, validateAll, clearErrors, markTouched, touched } = useFieldValidation();
  const initialRef = useRef({ ...defaults });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const setField = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setDirty((prev) => ({ ...prev, [field]: true }));
    if (rules[field]) validate(field, value, rules[field]);
  }, [rules, validate]);

  const setFields = useCallback((fields) => {
    setData((prev) => ({ ...prev, ...fields }));
    const dirtyUpdates = {};
    for (const key of Object.keys(fields)) dirtyUpdates[key] = true;
    setDirty((prev) => ({ ...prev, ...dirtyUpdates }));
  }, []);

  const reset = useCallback((newDefaults) => {
    const d = newDefaults || defaults;
    setData({ ...d });
    setDirty({});
    clearErrors();
    setSubmitted(false);
    initialRef.current = { ...d };
  }, [defaults, clearErrors]);

  const isDirty = Object.keys(dirty).length > 0;
  const hasUnsaved = Object.keys(dirty).some((k) => data[k] !== initialRef.current[k]);

  const submit = useCallback(async (status) => {
    if (!onSave) return null;
    setSubmitted(true);
    const valid = validateAll(data, rules);
    if (!valid) return null;
    setSaving(true);
    try {
      const result = await onSave({ ...data, status }, data);
      if (result && mountedRef.current) {
        initialRef.current = { ...data };
        setDirty({});
      }
      return result;
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [data, rules, validateAll, onSave]);

  const fieldProps = useCallback((field, overrides = {}) => ({
    value: data[field],
    onChange: (val) => setField(field, val),
    error: errors[field],
    touched: !!touched.current[field],
    onBlur: () => { markTouched(field); if (rules[field]) validate(field, data[field], rules[field]); },
    ...overrides,
  }), [data, errors, rules, validate, setField, markTouched]);

  return {
    data, setField, setFields, setData,
    dirty, isDirty, hasUnsaved,
    errors, clearErrors, validate, validateAll,
    saving, submitted, setSubmitted,
    reset, submit, fieldProps,
  };
}