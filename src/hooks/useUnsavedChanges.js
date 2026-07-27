import { useState, useEffect, useCallback } from 'react';

export default function useUnsavedChanges(isDirty) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const confirmNavigation = useCallback((action) => {
    if (!isDirty) { action?.(); return; }
    setPendingAction(() => action);
    setShowConfirm(true);
  }, [isDirty]);

  const proceed = useCallback(() => {
    setShowConfirm(false);
    pendingAction?.();
    setPendingAction(null);
  }, [pendingAction]);

  const cancel = useCallback(() => {
    setShowConfirm(false);
    setPendingAction(null);
  }, []);

  return { showConfirm, confirmNavigation, proceed, cancel };
}