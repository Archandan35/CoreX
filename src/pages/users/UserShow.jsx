import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PermissionGate from '../../components/ui/PermissionGate.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { userService } from '../../services/user/index.js';
export default function UserShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    userService.getUser(id).then(setUser).catch((err) => setError(err.message || 'Failed to load user.')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;
  if (error) return <div className="page"><div className="alert alert-danger"><Icon name="alert" size={16} />{error}</div></div>;
  if (!user) return null;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">{user.name}</h1>
        <div className="page__actions">
          <PermissionGate permission={PERMISSIONS.USER_UPDATE}>
            <Button icon="edit" onClick={() => navigate(`/users/${id}/edit`)}>Edit</Button>
          </PermissionGate>
        </div>
      </div>
      <Card>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-item__label">Email</span>
            <span className="detail-item__value">{user.email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">Phone</span>
            <span className="detail-item__value">{user.phone || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">Role</span>
            <span className="detail-item__value"><Badge variant="primary">{user.role}</Badge></span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">Status</span>
            <span className="detail-item__value">
              <Badge variant={user.status === 'active' ? 'success' : 'danger'}>{user.status}</Badge>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
