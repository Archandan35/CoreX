import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import Select from '../../components/ui/Select.jsx';
import { userService } from '../../services/user/index.js';
import { roleService } from '../../services/role/index.js';
import Icon from '../../components/ui/Icon.jsx';
import { notificationManager } from '../../managers/NotificationManager.js';

const STATUS_OPTIONS = ['active', 'inactive'];

export default function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '', status: 'active' });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    roleService.listRoles().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    userService.getUser(id).then((u) => {
      setForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, status: u.status });
    }).catch((err) => setError(err.message || 'Failed to load user.'))
    .finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await userService.updateUser(id, form);
      navigate(`/users/${id}`);
    } catch (err) {
      notificationManager.error(err.message || 'Network error.');
    } finally {
      setBusy(false);
    }
  };

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
            <Button type="button" variant="secondary" onClick={() => navigate('/users')}>Cancel</Button>
            <Button type="submit" loading={busy} icon="user-check">Update User</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
