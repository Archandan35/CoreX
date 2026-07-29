import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { roleService } from '../../services/role/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';
import useSaveHandler from '../../hooks/useSaveHandler.js';
import { invalidateCache } from '../../services/ui-sync/index.js';

const INITIAL_FORM = { name: '', label: '', description: '' };

function validateForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Role name is required.';
  else if (!/^[a-z0-9_-]+$/.test(form.name)) errors.name = 'Use only lowercase letters, numbers, hyphens, and underscores.';
  if (!form.label?.trim()) errors.label = 'Display label is required.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export default function RoleCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const { saving, save } = useSaveHandler({
    validate: validateForm,
    onSave: async (data) => roleService.createRole(data),
    onSuccess: async (role) => {
      notificationManager.success('Role Created', `Role "${role.label}" created successfully.`);
      await invalidateCache('roles');
      navigate(`/roles/${role.id}`);
    },
    messages: {
      saving: 'Creating role...',
      saved: 'Role created successfully.',
      saveFailed: 'Failed to create role.',
    },
  });

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const handleClear = useCallback(() => setForm({ ...INITIAL_FORM }), []);

  const submit = async (e) => {
    e.preventDefault();
    await save(form);
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Create Role</h1>
      </div>
      <Card>
        <form onSubmit={submit}>
          <Field label="Role Name" required>
            <Input value={form.name} onChange={set('name')} placeholder="e.g. editor" required />
          </Field>
          <Field label="Display Label" required>
            <Input value={form.label} onChange={set('label')} placeholder="e.g. Editor" required />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={set('description')} placeholder="Optional description" />
          </Field>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => navigate('/roles')}>Cancel</Button>
            <Button type="button" variant="secondary" onClick={handleClear}>Clear</Button>
            <Button type="submit" loading={saving} icon="shield2">Create Role</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
