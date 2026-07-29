import { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card.jsx';
import Icon from '../components/ui/Icon.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { usePermission } from '../identity/authorization/PermissionContext.jsx';
import { PERMISSIONS } from '../identity/rbac/permissions.js';
import { userService } from '../services/user/index.js';
import { roleService } from '../services/role/index.js';
import { invoiceService } from '../services/invoice/index.js';
import { onInvalidate } from '../services/ui-sync/index.js';

export default function Dashboard() {
  const { hasPermission } = usePermission();
  const [stats, setStats] = useState([
    { label: 'Total Users', value: null, icon: 'users', color: 'var(--primary)', permission: PERMISSIONS.USER_READ },
    { label: 'Active Roles', value: null, icon: 'shield2', color: 'var(--success)', permission: PERMISSIONS.ROLE_READ },
    { label: 'Invoices', value: null, icon: 'file-text', color: 'var(--info)', permission: PERMISSIONS.INVOICE_READ },
    { label: 'Total Revenue', value: null, icon: 'wallet', color: 'var(--warning)', permission: PERMISSIONS.INVOICE_READ },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [users, roles, invoices] = await Promise.all([
          hasPermission(PERMISSIONS.USER_READ) ? userService.listUsers().catch(() => []) : [],
          hasPermission(PERMISSIONS.ROLE_READ) ? roleService.listRoles().catch(() => []) : [],
          hasPermission(PERMISSIONS.INVOICE_READ) ? invoiceService.listInvoices().catch(() => []) : [],
        ]);
        if (cancelled) return;
        const userCount = Array.isArray(users) ? users.length : 0;
        const roleCount = Array.isArray(roles) ? roles.length : 0;
        const invoiceList = Array.isArray(invoices) ? invoices : [];
        const totalRevenue = invoiceList.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
        const formattedRevenue = totalRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
        setStats([
          { label: 'Total Users', value: String(userCount), icon: 'users', color: 'var(--primary)', permission: PERMISSIONS.USER_READ },
          { label: 'Active Roles', value: String(roleCount), icon: 'shield2', color: 'var(--success)', permission: PERMISSIONS.ROLE_READ },
          { label: 'Invoices', value: String(invoiceList.length), icon: 'file-text', color: 'var(--info)', permission: PERMISSIONS.INVOICE_READ },
          { label: 'Total Revenue', value: formattedRevenue, icon: 'wallet', color: 'var(--warning)', permission: PERMISSIONS.INVOICE_READ },
        ]);
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const unsub1 = onInvalidate('users', load);
    const unsub2 = onInvalidate('roles', load);
    const unsub3 = onInvalidate('invoices', load);
    const unsub4 = onInvalidate('settings', load);
    return () => {
      cancelled = true;
      unsub1(); unsub2(); unsub3(); unsub4();
    };
  }, [hasPermission]);

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
                <span className="stat-card__value">
                  {loading ? <Skeleton width={60} height={28} /> : (stat.value ?? '—')}
                </span>
                <span className="stat-card__label">{stat.label}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
