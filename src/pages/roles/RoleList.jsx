import { useState, useEffect, useCallback } from 'react';
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
import useDeleteHandler from '../../hooks/useDeleteHandler.js';
import { invalidateCache } from '../../services/ui-sync/index.js';

export default function RoleList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const {
    deleting,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useDeleteHandler({
    onDelete: (target) => roleService.deleteRole(target.id),
    onSuccess: (target) => {
      setRoles((prev) => prev.filter((r) => r.id !== target.id));
      invalidateCache('roles');
      loadRoles();
    },
    successMessage: 'Role deleted successfully.',
    errorMessage: 'Failed to delete role.',
    requirePermission: PERMISSIONS.ROLE_DELETE,
  });

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roleService.listRoles();
      setRoles(Array.isArray(data) ? data : []);
      setTotalPages(1);
    } catch {
      notificationManager.error('Failed to load roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

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
                <DropdownItem danger onClick={() => { close(); requestDelete(row); }}>Delete</DropdownItem>
              </PermissionGate>
            </>
          )}
        </Dropdown>
      ),
    },
  ];

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
        onClose={cancelDelete}
        title="Delete Role"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={cancelDelete}>Cancel</Button>
            <Button variant="primary" loading={deleting} onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p>Are you sure you want to delete role <strong>{deleteTarget?.label}</strong>?</p>
      </Modal>
    </div>
  );
}
