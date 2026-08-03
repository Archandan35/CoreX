import { useState, useCallback, useRef } from 'react';
import { notificationManager } from '../managers/NotificationManager.js';

const DEFAULT_MESSAGES = {
  saving: 'Saving...',
  saved: 'Saved successfully.',
  saveFailed: 'Failed to save.',
  validating: 'Please fix validation errors.',
  permissionDenied: 'You do not have permission to perform this action.',
};

export default function useSaveHandler(options = {}) {
  const {
    validate,
    onSave,
    onSuccess,
    onError,
    messages = {},
    requirePermission = null,
    hasPermission = null,
    optimisticUpdate = false,
  } = options;

  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const previousDataRef = useRef(null);

  const save = useCallback(async (data, saveOptions = {}) => {
    const msg = { ...DEFAULT_MESSAGES, ...messages };

    if (requirePermission && hasPermission === false) {
      notificationManager.error('Permission Denied', msg.permissionDenied);
      return { success: false, error: msg.permissionDenied };
    }

    if (validate) {
      const validation = typeof validate === 'function' ? validate(data) : { valid: true, errors: {} };
      if (!validation.valid) {
        setValidationErrors(validation.errors || {});
        const firstError = Object.values(validation.errors || {}).flat()[0];
        notificationManager.warning('Validation', firstError || msg.validating);
        return { success: false, errors: validation.errors };
      }
      setValidationErrors({});
    }

    setSaving(true);
    const loadingId = notificationManager.loading(msg.saving, 'Please wait...');

    try {
      if (optimisticUpdate) {
        previousDataRef.current = data;
      }

      const result = await onSave(data);

      notificationManager.successLoading(
        loadingId,
        saveOptions.successTitle || msg.saved,
        saveOptions.successMessage || ''
      );

      if (onSuccess) onSuccess(result, data);

      return { success: true, data: result };
    } catch (err) {
      if (optimisticUpdate && previousDataRef.current) {
        previousDataRef.current = null;
      }

      const errorMessage = err?.message || msg.saveFailed;
      notificationManager.errorLoading(
        loadingId,
        saveOptions.errorTitle || msg.saveFailed,
        errorMessage
      );

      if (onError) onError(err, data);

      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  }, [validate, onSave, onSuccess, onError, messages, requirePermission, hasPermission, optimisticUpdate]);

  const clearValidation = useCallback(() => {
    setValidationErrors({});
  }, []);

  return {
    saving,
    validationErrors,
    save,
    clearValidation,
    setValidationErrors,
  };
}
