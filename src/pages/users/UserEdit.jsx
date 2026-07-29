import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import Select from '../../components/ui/Select.jsx';
import { userService } from '../../services/user/index.js';
import { roleService } from '../../services/role/index.js';
import Icon from '../../components/ui/Icon.jsx';
import { notificationManager } from '../../managers/NotificationManager.js';
import useSaveHandler from '../../hooks/useSaveHandler.js';
import useUnsavedChanges from '../../hooks/useUnsavedChanges.js';
import { invalidateCache } from '../../services/ui-sync/index.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

const STATUS_OPTIONS = ['active', 'inactive'];

function validateForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Full name is required.';
  if (!form.email?.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (form.phone && !/^[\d\s+()-]{6,}$/.test(form.phone)) errors.phone = 'Enter a valid phone number.';
  if (!form.role) errors.role = 'Select a role.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export default function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '', status: 'active' });
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
    onSave: async (data) => userService.updateUser(id, data),
    onSuccess: async () => {
      notificationManager.success('User Updated', 'User updated successfully.');
      await invalidateCache('users');
      navigate(`/users/${id}`);
    },
    messages: {
      saving: 'Updating user...',
      saved: 'User updated successfully.',
      saveFailed: 'Failed to update user.',
    },
  });

  useEffect(() => {
    roleService.listRoles().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    userService.getUser(id).then((u) => {
      const f = { name: u.name, email: u.email, phone: u.phone || '', role: u.role, status: u.status };
      setForm(f);
      setOriginalForm({ ...f });
    }).catch((err) => setError(err.message || 'Failed to load user.'))
    .finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    await save(form);
  };

  const handleCancel = useCallback(() => {
    confirmNavigation(() => navigate('/users'));
  }, [confirmNavigation, navigate]);

  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Edit User</h1>
      </div>
      <Card>
        {error && <div className="alert alert-danger alert--mb"><Icon name="alert" size={16} />{error}</div>}
        <form onSubmit={submit}>
          <Field label="Full Name" required>
            <Input value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Email Address" required>
            <Input type="email" value={form.email} onChange={set('email')} required />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Role">
            <Select options={roles.map((r) => ({ value: r.name, label: r.label }))} value={form.role} onChange={(v) => setForm((p) => ({ ...p, role: v }))} />
          </Field>
          <Field label="Status">
            <Select options={STATUS_OPTIONS} value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))} />
          </Field>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button type="submit" loading={saving} icon="user-check">Update User</Button>
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
