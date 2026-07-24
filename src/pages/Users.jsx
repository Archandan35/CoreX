import { useState, useEffect } from 'react';
import CRUDManager from '../components/CRUDManager';
import Badge from '../components/Badge';
import { Input, Select } from '../components/FormControls';
import Button from '../components/Button';
import PROVIDER from '../data-provider';
import { useNotification } from '../services/NotificationService';

const USER_COLUMNS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  {
    key: 'role', label: 'Role', sortable: true,
    render: (val) => <Badge variant="primary">{val}</Badge>
  },
  {
    key: 'status', label: 'Status', sortable: true,
    render: (val) => <Badge variant={val === 'active' ? 'success' : 'secondary'}>{val}</Badge>
  },
  { key: 'createdAt', label: 'Created', sortable: true, render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export default function Users() {
  const [roles, setRoles] = useState([]);
  const { success, error } = useNotification();

  useEffect(() => {
    PROVIDER.findMany('roles', { pageSize: 100 }).then(r => setRoles(r.data));
  }, []);

  const handleCreate = (data) => success(`User ${data.name} created`);
  const handleEdit = (data) => success(`User ${data.name} updated`);
  const handleDelete = (id) => success('User deleted');

  return (
    <div>
      <CRUDManager
        resource="users"
        title="User"
        formTitle="User"
        columns={USER_COLUMNS}
        showFilters={true}
        filterConfig={[
          { key: 'role', label: 'Role', options: roles.map(r => ({ value: r.name, label: r.name })) },
          { key: 'status', label: 'Status', options: STATUS_OPTIONS },
        ]}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderForm={({ item, onSubmit, onCancel, isEdit }) => (
          <UserForm
            item={item}
            roles={roles}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        )}
        searchPlaceholder="Search users by name or email..."
        emptyText="No users found"
      />
    </div>
  );
}

function UserForm({ item, roles, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    email: item?.email || '',
    role: item?.role || '',
    status: item?.status || 'active',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Full Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter full name" />
      <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Enter email address" />
      <Select label="Role" required value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
        options={roles.map(r => ({ value: r.name, label: r.name }))}
        placeholder="Select role"
      />
      <Select label="Status" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
        options={STATUS_OPTIONS}
      />
      {!isEdit && (
        <Input label="Password" type="password" required={!isEdit} value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Enter password" />
      )}
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={submitting}>{isEdit ? 'Update' : 'Create'} User</Button>
      </div>
    </form>
  );
}
