import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { roleService } from '../../services/role/index.js';

export default function RoleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', label: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    roleService.getRole(id).then((r) => {
      setForm({ name: r.name, label: r.label, description: r.description || '' });
    }).catch((err) => setError(err.message || 'Failed to load role.'))
    .finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await roleService.updateRole(id, form);
      navigate(`/roles/${id}`);
    } catch (err) {
      setError(err.message || 'Network error.');
    } finally {
      setBusy(false);
    }
  };

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
            <Button type="button" variant="secondary" onClick={() => navigate('/roles')}>Cancel</Button>
            <Button type="submit" loading={busy} icon="shield2">Update Role</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
