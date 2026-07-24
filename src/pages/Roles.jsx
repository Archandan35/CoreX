import { useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Input, Textarea, Checkbox } from '../components/FormControls';
import I from '../icon';
import PROVIDER from '../data-provider';
import { useNotification } from '../services/NotificationService';
import { useQuery } from '../hooks/useQuery';

const ALL_PERMISSIONS = [
  { category: 'Dashboard', perms: [{ key: 'dashboard.view', label: 'View Dashboard' }] },
  { category: 'Users', perms: [
    { key: 'user.list', label: 'List Users' },
    { key: 'user.view', label: 'View User' },
    { key: 'user.create', label: 'Create User' },
    { key: 'user.edit', label: 'Edit User' },
    { key: 'user.delete', label: 'Delete User' },
  ]},
  { category: 'Roles', perms: [
    { key: 'role.list', label: 'List Roles' },
    { key: 'role.view', label: 'View Role' },
    { key: 'role.create', label: 'Create Role' },
    { key: 'role.edit', label: 'Edit Role' },
    { key: 'role.delete', label: 'Delete Role' },
  ]},
  { category: 'Settings', perms: [
    { key: 'setting.view', label: 'View Settings' },
    { key: 'setting.edit', label: 'Edit Settings' },
  ]},
  { category: 'Audit', perms: [
    { key: 'audit.view', label: 'View Audit Logs' },
  ]},
];

export default function Roles() {
  const { data: roles, loading, refetch } = useQuery('roles');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const { success, error } = useNotification();

  const openCreate = () => { setEditingRole(null); setModalOpen(true); };
  const openEdit = (role) => { setEditingRole(role); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingRole(null); };

  const handleSubmit = async (formData) => {
    try {
      if (editingRole) {
        await PROVIDER.update('roles', editingRole.id, formData);
        success('Role updated successfully');
      } else {
        await PROVIDER.create('roles', formData);
        success('Role created successfully');
      }
      closeModal();
      refetch();
    } catch (e) {
      error(e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await PROVIDER.delete('roles', id);
      success('Role deleted');
      refetch();
    } catch (e) {
      error(e.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-header-title">Roles & Permissions</h2>
          <p className="page-header-subtitle">Manage roles and their access permissions</p>
        </div>
        <Button icon={<I.Plus />} onClick={openCreate}>Create Role</Button>
      </div>

      {loading ? (
        <div className="spinner-center"><div className="spinner spinner-lg" /></div>
      ) : (
        <div className="grid grid-3">
          {roles.map((role) => (
            <Card key={role.id}
              title={role.name}
              subtitle={role.description}
              actions={
                <div className="btn-group">
                  <Button variant="ghost" size="sm" icon={<I.Edit />} onClick={() => openEdit(role)} />
                  <Button variant="ghost" size="sm" icon={<I.Trash />} onClick={() => handleDelete(role.id)} />
                </div>
              }
            >
              <div className="flex flex-wrap gap-xs">
                {role.permissions?.length > 0 ? (
                  role.permissions[0] === '*' ? (
                    <Badge variant="primary">Full Access</Badge>
                  ) : (
                    role.permissions.slice(0, 5).map((p) => (
                      <Badge key={p} variant="secondary" size="sm">{p}</Badge>
                    ))
                  )
                ) : (
                  <span className="text-xs text-muted">No permissions</span>
                )}
                {role.permissions?.length > 5 && (
                  <Badge variant="info" size="sm">+{role.permissions.length - 5} more</Badge>
                )}
              </div>
              <div className="text-xs text-muted mt-sm">
                Created: {new Date(role.createdAt).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal}
        title={editingRole ? 'Edit Role' : 'Create Role'}
        size="lg"
      >
        <RoleForm role={editingRole} permissions={ALL_PERMISSIONS} onSubmit={handleSubmit} onCancel={closeModal} />
      </Modal>
    </div>
  );
}

function RoleForm({ role, permissions, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions || [],
  });
  const [submitting, setSubmitting] = useState(false);

  const togglePermission = (perm) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm]
    }));
  };

  const selectAllCategory = (perms, checked) => {
    setForm(f => ({
      ...f,
      permissions: checked
        ? [...new Set([...f.permissions, ...perms.map(p => p.key)])]
        : f.permissions.filter(p => !perms.map(p => p.key).includes(p))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { await onSubmit(form); }
    catch { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Role Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Manager" />
      <Textarea label="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Role description" />

      <div className="mt-md">
        <div className="form-label font-semibold mb-sm">Permissions</div>
        {permissions.map((cat) => {
          const allSelected = cat.perms.every(p => form.permissions.includes(p.key));
          const someSelected = cat.perms.some(p => form.permissions.includes(p.key)) && !allSelected;
          return (
            <div key={cat.category} className="perm-category">
              <Checkbox
                label={<strong>{cat.category}</strong>}
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={(e) => selectAllCategory(cat.perms, e.target.checked)}
              />
              <div className="perm-items">
                {cat.perms.map((p) => (
                  <Checkbox key={p.key} label={p.label} checked={form.permissions.includes(p.key)} onChange={() => togglePermission(p.key)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={submitting}>{role ? 'Update' : 'Create'} Role</Button>
      </div>
    </form>
  );
}
