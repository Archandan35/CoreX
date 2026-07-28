import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Search from '../../components/ui/Search.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PermissionGate from '../../components/ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { roleService } from '../../services/role/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';

export default function RoleList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const columns = [
    { key: 'name', label: 'Name', render: (row) => <strong>{row.name}</strong> },
    { key: 'label', label: 'Label' },
    {
      key: 'permissions', label: 'Permissions',
      render: (row) => <Badge variant="secondary">{row.permissions?.length || 0} permissions</Badge>,
    },
    {
      key: 'actions', label: '', width: '60px',
      render: (row) => (
        <Dropdown align="right">
          {(close) => (
            <>
              <DropdownItem onClick={() => { close(); navigate(`/roles/${row.id}`); }}>View</DropdownItem>
              <PermissionGate permission={PERMISSIONS.ROLE_UPDATE}>
                <DropdownItem onClick={() => { close(); navigate(`/roles/${row.id}/edit`); }}>Edit</DropdownItem>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.ROLE_DELETE}>
                <DropdownItem danger onClick={() => { close(); setDeleteTarget(row); }}>Delete</DropdownItem>
              </PermissionGate>
            </>
          )}
        </Dropdown>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await roleService.deleteRole(deleteTarget.id);
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      notificationManager.success('Role deleted successfully.');
    } catch {
      notificationManager.error('Failed to delete role.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Roles</h1>
        <PermissionGate permission={PERMISSIONS.ROLE_CREATE}>
          <Button icon="plus" onClick={() => navigate('/roles/new')}>Add Role</Button>
        </PermissionGate>
      </div>
      <Card>
        <Search value={search} onChange={setSearch} placeholder="Search roles..." className="search--mb" />
        <Table columns={columns} data={roles} loading={loading} emptyMessage="No roles found." />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Role"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" loading={deleting} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p>Are you sure you want to delete role <strong>{deleteTarget?.label}</strong>?</p>
      </Modal>
    </div>
  );
}
