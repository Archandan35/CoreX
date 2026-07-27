import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { roleService } from '../../services/role/index.js';

export default function RoleCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', label: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const role = await roleService.createRole(form);
      navigate(`/roles/${role.id}`);
    } catch (err) {
      setError(err.message || 'Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Create Role</h1>
      </div>
      <Card>
        {error && <div className="alert alert-danger alert--mb"><Icon name="alert" size={16} />{error}</div>}
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
            <Button type="submit" loading={busy} icon="shield2">Create Role</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
