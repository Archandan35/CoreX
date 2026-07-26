import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import Select from '../../components/ui/Select.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { api } from '../../services/api.js';

export default function UserCreate() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/roles')
      .then((r) => r.json())
      .then((data) => {
        if (data.roles) {
          setRoles(data.roles);
          if (data.roles.length > 0 && !form.role) {
            setForm((p) => ({ ...p, role: data.roles[0].name }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        navigate(`/users/${data.user.id}`);
      } else {
        setError(data.error || 'Failed to create user.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Create User</h1>
      </div>
      <Card>
        {error && <div className="alert alert-danger alert--mb"><Icon name="alert" size={16} />{error}</div>}
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
            <Button type="submit" loading={busy} icon="user-plus">Create User</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
