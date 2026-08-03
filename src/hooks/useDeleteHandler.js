import { useState, useCallback } from 'react';
import { notificationManager } from '../managers/NotificationManager.js';

export default function useDeleteHandler(options = {}) {
  const {
    onDelete,
    onSuccess,
    onError,
    _confirmMessage = 'Are you sure you want to delete this item? This action cannot be undone.',
    _confirmTitle = 'Confirm Delete',
    successMessage = 'Deleted successfully.',
    errorMessage = 'Failed to delete.',
    requirePermission = null,
    hasPermission = null,
  } = options;

  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const requestDelete = useCallback((item) => {
    if (requirePermission && hasPermission === false) {
      notificationManager.error('Permission Denied', 'You do not have permission to delete.');
      return;
    }
    setDeleteTarget(item);
  }, [requirePermission, hasPermission]);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await onDelete(deleteTarget);
      notificationManager.success('Deleted', successMessage);
      setDeleteTarget(null);
      if (onSuccess) onSuccess(deleteTarget, result);
    } catch (err) {
      notificationManager.error('Delete Failed', err?.message || errorMessage);
      if (onError) onError(err, deleteTarget);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, onDelete, onSuccess, onError, successMessage, errorMessage]);

  return {
    deleting,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
    setDeleteTarget,
  };
}
