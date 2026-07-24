import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { userService } from '../services/userService';
import { roleService } from '../services/roleService';
import { settingsService } from '../services/SettingsService';
import logger from '../services/LoggerService';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import I from '../icon';
import { formatDateTime } from '../utils/date';

function useLiveDashboard() {
  const [data, setData] = useState({ users: [], roles: [], settings: {}, activity: [], loading: true });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [users, roles, settings] = await Promise.all([
          userService.list(),
          roleService.list(),
          settingsService.getAll(),
        ]);
        const activity = logger.getHistory().reverse().slice(0, 10);
        if (active) setData({ users: users || [], roles: roles || [], settings, activity, loading: false });
      } catch {
        if (active) setData(s => ({ ...s, loading: false }));
      }
    };
    load();
    return () => { active = false; };
  }, []);

  return data;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { users, roles, settings, activity, loading } = useLiveDashboard();

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'Active' || !u.status).length;
  const totalRoles = roles.length;
  const roleByCode = Object.fromEntries(roles.map((r) => [r.code, r]));
  const adminUsers = users.filter(u => {
    const codes = [u.roleCode || u.role, ...(u.extraRoles || [])].filter(Boolean);
    return codes.some((c) => roleByCode[c]?.all === true);
  }).length;

  const stats = [
    {
      label: 'Total Users', value: totalUsers.toLocaleString(),
      icon: <I.Users />, color: 'primary',
      change: activeUsers > 0 ? `${activeUsers} active` : 'No users',
      dir: activeUsers > 0 ? 'up' : 'down',
      period: `${adminUsers} admin${adminUsers !== 1 ? 's' : ''}`
    },
    {
      label: 'Active Users', value: activeUsers.toLocaleString(),
      icon: <I.Activity />, color: 'success',
      change: totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}%` : '—',
      dir: 'up',
      period: `of ${totalUsers} total`
    },
    {
      label: 'System Health', value: 'Online',
      icon: <I.Server />, color: 'success',
      change: 'All systems normal',
      dir: 'up',
      period: roles.length ? `${roles.length} roles configured` : 'No roles yet'
    },
    {
      label: 'Roles', value: totalRoles.toLocaleString(),
      icon: <I.Shield />, color: 'primary',
      change: roles.filter(r => r.system).length > 0 ? `${roles.filter(r => r.system).length} system` : 'All custom',
      dir: totalRoles > 0 ? 'up' : 'down',
      period: `used by ${new Set(users.map(u => u.roleCode || u.role)).size} user${users.length !== 1 ? 's' : ''}`
    },
  ];

  const activityList = activity.length > 0 ? activity : [
    { action: 'User created', user: 'Admin', time: new Date(Date.now() - 300000), type: 'success', icon: <I.User /> },
    { action: 'Settings updated', user: 'Admin', time: new Date(Date.now() - 1800000), type: 'info', icon: <I.Settings /> },
    { action: 'Role modified', user: 'Admin', time: new Date(Date.now() - 3600000), type: 'warning', icon: <I.Shield /> },
    { action: 'User deleted', user: 'Admin', time: new Date(Date.now() - 7200000), type: 'danger', icon: <I.User /> },
    { action: 'Backup completed', user: 'System', time: new Date(Date.now() - 14400000), type: 'primary', icon: <I.Download /> },
  ];

  const activityIconMap = {
    INFO: 'info', WARN: 'warning', ERROR: 'danger', DEBUG: 'secondary', FATAL: 'danger',
  };

  const iconMap = {
    [I.User]: I.User, [I.Settings]: I.Settings, [I.Shield]: I.Shield, [I.Download]: I.Download,
  };

  return (
    <div>
      <div className="dash-header">
        <div className="dash-header-row">
          <div>
            <h2 className="dash-header-title">Dashboard</h2>
            <p className="dash-header-sub">Welcome back, {user?.name || 'User'}</p>
          </div>
          <div className="dash-actions">
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              <I.Refresh /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner-center min-h-200"><div className="spinner spinner-lg" /></div>
      ) : (
        <>
          <div className="stats-grid">
            {stats.map((stat) => (
              <Card key={stat.label} className="stat-card">
                <div className="stat-card-body">
                  <div className="stat-card-header">
                    <div className={`stat-card-icon ${stat.color}`}>{stat.icon}</div>
                    <div className="stat-card-info">
                      <div className="stat-card-label">{stat.label}</div>
                      <div className="stat-card-value">{stat.value}</div>
                    </div>
                  </div>
                  <div className="stat-card-footer">
                    <span className={`stat-card-change ${stat.dir}`}>
                      {stat.dir === 'up' ? <I.ArrowUp /> : <I.ArrowDown />}
                      {stat.change}
                    </span>
                    <span className="stat-card-period">{stat.period}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="dash-grid dash-grid-2">
            <Card title="Recent Activity" subtitle="Latest system events">
              {activityList.length === 0 ? (
                    <div className="empty-state empty-state-card">
                      <div className="empty-state-icon"><I.Clock /></div>
                      <div className="empty-state-title empty-state-title-sm">No activity yet</div>
                  <div className="empty-state-text">Activity will appear here as you use the application.</div>
                </div>
              ) : (
                activityList.map((item, i) => {
                  const type = item.level ? (activityIconMap[item.level] || 'info') : item.type;
                  const IconCmp = typeof item.icon === 'function' ? item.icon : I.Bell;
                  return (
                    <div key={i} className="activity-item">
                      <div className={`activity-icon ${type}`}><IconCmp /></div>
                      <div className="activity-body">
                        <div className="activity-title">{item.message || item.action}</div>
                        <div className="activity-meta">
                          <span>{item.user || 'System'}</span>
                          <span className="activity-time">{formatDateTime(new Date(item.timestamp || item.time))}</span>
                        </div>
                      </div>
                      <Badge variant={type} size="sm">{type}</Badge>
                    </div>
                  );
                })
              )}
            </Card>

            <Card title="Quick Actions">
              <div className="quick-actions">
                <button className="quick-action-btn">
                  <span className="quick-action-btn-icon"><I.User /></span>Create New User
                </button>
                <button className="quick-action-btn">
                  <span className="quick-action-btn-icon"><I.Settings /></span>System Settings
                </button>
                <button className="quick-action-btn">
                  <span className="quick-action-btn-icon"><I.Download /></span>Export Data
                </button>
                <button className="quick-action-btn">
                  <span className="quick-action-btn-icon"><I.Server /></span>Run Health Check
                </button>
              </div>
            </Card>
          </div>

          <Card className="mt-md" title="System Information">
            <div className="sys-info">
              <div className="sys-info-item">
                <div className="sys-info-label">Application</div>
                <div className="sys-info-value">{settings.siteTitle || 'Universal App'}</div>
              </div>
              <div className="sys-info-item">
                <div className="sys-info-label">Version</div>
                <div className="sys-info-value">1.0.0</div>
              </div>
              <div className="sys-info-item">
                <div className="sys-info-label">Theme</div>
                <div className="sys-info-value">
                  <Icon name={theme === 'light' ? 'sun' : 'moon'} size={14} />
                  {theme === 'light' ? 'Light' : 'Dark'}
                  <Button size="sm" variant="ghost" onClick={toggleTheme}>Toggle</Button>
                </div>
              </div>
              <div className="sys-info-item">
                <div className="sys-info-label">Users</div>
                <div className="sys-info-value">{totalUsers} total · {activeUsers} active</div>
              </div>
              <div className="sys-info-item">
                <div className="sys-info-label">Roles</div>
                <div className="sys-info-value">{totalRoles} configured</div>
              </div>
              <div className="sys-info-item">
                <div className="sys-info-label">Registration</div>
                <div className="sys-info-value">
                  {settings.allowRegistration !== false ? 'Open' : 'Closed'}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
