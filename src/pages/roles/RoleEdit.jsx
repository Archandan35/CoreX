import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { roleService } from '../../services/role/index.js';
import Icon from '../../components/ui/Icon.jsx';
import { notificationManager } from '../../managers/NotificationManager.js';
import useSaveHandler from '../../hooks/useSaveHandler.js';
import useUnsavedChanges from '../../hooks/useUnsavedChanges.js';
import { invalidateCache } from '../../services/ui-sync/index.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

function validateForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Role name is required.';
  else if (!/^[a-z0-9_-]+$/.test(form.name)) errors.name = 'Use only lowercase letters, numbers, hyphens, and underscores.';
  if (!form.label?.trim()) errors.label = 'Display label is required.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export default function RoleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', label: '', description: '' });
  const [originalForm, setOriginalForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isFormDirty = useMemo(() => {
    if (!originalForm) return false;
    return JSON.stringify(form) !== JSON.stringify(originalForm);
  }, [form, originalForm]);

  const { showConfirm, confirmNavigation, proceed, cancel } = useUnsavedChanges(isFormDirty);

  const { saving, save } = useSaveHandler({
    validate: validateForm,
    onSave: async (data) => roleService.updateRole(id, data),
    onSuccess: async () => {
      notificationManager.success('Role Updated', 'Role updated successfully.');
      await invalidateCache('roles');
      navigate(`/roles/${id}`);
    },
    messages: {
      saving: 'Updating role...',
      saved: 'Role updated successfully.',
      saveFailed: 'Failed to update role.',
    },
  });

  useEffect(() => {
    roleService.getRole(id).then((r) => {
      const f = { name: r.name, label: r.label, description: r.description || '' };
      setForm(f);
      setOriginalForm({ ...f });
    }).catch((err) => setError(err.message || 'Failed to load role.'))
    .finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    await save(form);
  };

  const handleCancel = useCallback(() => {
    confirmNavigation(() => navigate('/roles'));
  }, [confirmNavigation, navigate]);

  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Edit Role</h1>
      </div>
      <Card>
        {error && <div className="alert alert-danger alert--mb"><Icon name="alert" size={16} />{error}</div>}
        <form onSubmit={submit}>
          <Field label="Role Name" required>
            <Input value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Display Label" required>
            <Input value={form.label} onChange={set('label')} required />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={set('description')} />
          </Field>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button type="submit" loading={saving} icon="shield2">Update Role</Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        onClose={cancel}
        onConfirm={proceed}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave this page?"
        confirmText="Leave"
        cancelText="Stay"
        variant="danger"
      />
    </div>
  );
}
