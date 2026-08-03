import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Search from '../../components/ui/Search.jsx';
import Filter, { FilterItem } from '../../components/ui/Filter.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown.jsx';
import PermissionGate from '../../components/ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { usePermission } from '../../identity/authorization/PermissionContext.jsx';
import { userService } from '../../services/user/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';
import useDeleteHandler from '../../hooks/useDeleteHandler.js';
import { invalidateCache } from '../../services/ui-sync/index.js';

const STATUS_OPTIONS = ['active', 'inactive'];

export default function UserList() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [users, setUsers] = useState([]);
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
    onDelete: (target) => userService.deleteUser(target.id),
    onSuccess: (target) => {
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      invalidateCache('users');
      loadUsers();
    },
    successMessage: 'User deleted successfully.',
    errorMessage: 'Failed to delete user.',
    requirePermission: PERMISSIONS.USER_DELETE,
    hasPermission: hasPermission(PERMISSIONS.USER_DELETE),
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.listUsers();
      setUsers(Array.isArray(data) ? data : []);
      setTotalPages(1);
    } catch {
      notificationManager.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const columns = [
    { key: 'name', label: 'Name', render: (row) => <strong>{row.name}</strong> },
    { key: 'email', label: 'Email' },
    {
      key: 'role', label: 'Role',
      render: (row) => <Badge variant="primary">{row.role}</Badge>,
    },
    {
      key: 'status', label: 'Status',
      render: (row) => <Badge variant={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge>,
    },
    {
      key: 'actions', label: '', width: '60px',
      render: (row) => (
        <Dropdown align="right">
          {(close) => (
            <>
              <DropdownItem onClick={() => { close(); navigate(`/users/${row.id}`); }}>View</DropdownItem>
              <PermissionGate permission={PERMISSIONS.USER_UPDATE}>
                <DropdownItem onClick={() => { close(); navigate(`/users/${row.id}/edit`); }}>Edit</DropdownItem>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.USER_DELETE}>
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
        <h1 className="page__title">Users</h1>
        <PermissionGate permission={PERMISSIONS.USER_CREATE}>
          <Button icon="plus" onClick={() => navigate('/users/new')}>Add User</Button>
        </PermissionGate>
      </div>
      <Card>
        <Filter>
          <FilterItem>
            <Search value={search} onChange={setSearch} placeholder="Search users..." />
          </FilterItem>
          <FilterItem label="Status">
            <select className="form-input form-input--filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FilterItem>
        </Filter>
        <Table columns={columns} data={users} loading={loading} emptyMessage="No users found." />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      <Modal
        open={!!deleteTarget}
        onClose={cancelDelete}
        title="Delete User"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={cancelDelete}>Cancel</Button>
            <Button variant="primary" loading={deleting} onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
