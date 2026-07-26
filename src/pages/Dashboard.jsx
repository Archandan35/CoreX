import Card from '../components/ui/Card.jsx';
import Icon from '../components/ui/Icon.jsx';
import { usePermission } from '../identity/authorization/PermissionContext.jsx';
import { PERMISSIONS } from '../identity/rbac/permissions.js';

export default function Dashboard() {
  const { hasPermission } = usePermission();

  const stats = [
    { label: 'Total Users', value: '—', icon: 'users', color: 'var(--primary)', permission: PERMISSIONS.USER_READ },
    { label: 'Active Roles', value: '—', icon: 'shield2', color: 'var(--success)', permission: PERMISSIONS.ROLE_READ },
    { label: 'Reports', value: '—', icon: 'file-text', color: 'var(--info)', permission: PERMISSIONS.REPORT_READ },
  ];

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Dashboard</h1>
      </div>
      <div className="stats-grid">
        {stats.map((stat) => {
          if (stat.permission && !hasPermission(stat.permission)) return null;
          return (
            <Card key={stat.label} className="stat-card">
              <div className="stat-card__icon" style={{ color: stat.color }}>
                <Icon name={stat.icon} size={24} />
              </div>
              <div className="stat-card__info">
                <span className="stat-card__value">{stat.value}</span>
                <span className="stat-card__label">{stat.label}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
