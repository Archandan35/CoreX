import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PermissionGate from '../../components/ui/PermissionGate.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { api } from '../../services/api.js';

export default function RoleShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/roles/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.role) setRole(data.role);
        else setError('Role not found.');
      })
      .catch(() => setError('Failed to load role.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;
  if (error) return <div className="page"><div className="alert alert-danger"><Icon name="alert" size={16} />{error}</div></div>;
  if (!role) return null;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">{role.label}</h1>
        <div className="page__actions">
          <PermissionGate permission={PERMISSIONS.ROLE_UPDATE}>
            <Button icon="edit" onClick={() => navigate(`/roles/${id}/edit`)}>Edit</Button>
          </PermissionGate>
        </div>
      </div>
      <Card>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-item__label">Name</span>
            <span className="detail-item__value"><Badge variant="primary">{role.name}</Badge></span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">Label</span>
            <span className="detail-item__value">{role.label}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">Description</span>
            <span className="detail-item__value">{role.description || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">Permissions</span>
            <span className="detail-item__value">{role.permissions?.length || 0} assigned</span>
          </div>
        </div>
      </Card>
      {role.permissions && role.permissions.length > 0 && (
        <Card title="Assigned Permissions" className="card--mt">
          <div className="permission-list">
            {role.permissions.map((perm) => (
              <Badge key={perm} variant="secondary">{perm}</Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
