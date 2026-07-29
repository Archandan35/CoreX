import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import Select from '../../components/ui/Select.jsx';
import { userService } from '../../services/user/index.js';
import { roleService } from '../../services/role/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';
import useSaveHandler from '../../hooks/useSaveHandler.js';
import { invalidateCache } from '../../services/ui-sync/index.js';

const INITIAL_FORM = { name: '', email: '', phone: '', password: '', role: '' };

function validateForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Full name is required.';
  if (!form.email?.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (!form.password) errors.password = 'Password is required.';
  else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  if (form.phone && !/^[\d\s+()-]{6,}$/.test(form.phone)) errors.phone = 'Enter a valid phone number.';
  if (!form.role) errors.role = 'Select a role.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export default function UserCreate() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const { saving, save } = useSaveHandler({
    validate: validateForm,
    onSave: async (data) => userService.createUser(data),
    onSuccess: async (user) => {
      notificationManager.success('User Created', `User "${user.name}" created successfully.`);
      await invalidateCache('users');
      navigate(`/users/${user.id}`);
    },
    messages: {
      saving: 'Creating user...',
      saved: 'User created successfully.',
      saveFailed: 'Failed to create user.',
    },
  });

  useEffect(() => {
    roleService.listRoles().then((roleList) => {
      setRoles(roleList);
      if (roleList.length > 0 && !form.role) {
        setForm((p) => ({ ...p, role: roleList[0].name }));
      }
    }).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const handleClear = useCallback(() => setForm({ ...INITIAL_FORM, role: roles[0]?.name || '' }), [roles]);

  const submit = async (e) => {
    e.preventDefault();
    await save(form);
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Create User</h1>
      </div>
      <Card>
        <form onSubmit={submit}>
          <Field label="Full Name" required>
            <Input value={form.name} onChange={set('name')} placeholder="Enter full name" required />
          </Field>
          <Field label="Email Address" required>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="Enter email" required />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set('phone')} placeholder="Enter phone" />
          </Field>
          <Field label="Password" required>
            <PasswordInput value={form.password} onChange={set('password')} placeholder="Enter password" required />
          </Field>
          <Field label="Role">
            <Select options={roles.map((r) => ({ value: r.name, label: r.label }))} value={form.role} onChange={(v) => setForm((p) => ({ ...p, role: v }))} />
          </Field>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => navigate('/users')}>Cancel</Button>
            <Button type="button" variant="secondary" onClick={handleClear}>Clear</Button>
            <Button type="submit" loading={saving} icon="user-plus">Create User</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
