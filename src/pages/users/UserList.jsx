import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Search from '../../components/ui/Search.jsx';
import Filter, { FilterItem } from '../../components/ui/Filter.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PermissionGate from '../../components/ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { usePermission } from '../../identity/authorization/PermissionContext.jsx';
import { userService } from '../../services/user/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';

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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      await userService.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      notificationManager.success('User deleted successfully.');
    } catch {
      notificationManager.error('Failed to delete user.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

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
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" loading={deleting} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
