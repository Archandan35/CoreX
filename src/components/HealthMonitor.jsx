import { useState, useEffect, useCallback } from 'react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import I from '../icon';
import PROVIDER from '../data-provider';

const METRICS = {
  cpu: { label: 'CPU', icon: <I.Server />, getValue: (h) => h.cpu || h.health?.cpu || '—' },
  memory: { label: 'Memory', icon: <I.Database />, getValue: (h) => h.memory || h.health?.memory || '—' },
  storage: { label: 'Storage', icon: <I.HardDrive />, getValue: (h) => h.storage || h.health?.storage || '—' },
  uptime: { label: 'Uptime', icon: <I.Clock />, getValue: (h) => h.uptime || h.health?.uptime || '—' },
};

export default function HealthMonitor({ variant = 'card', onRefresh } = {}) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await PROVIDER.health();
      setHealth(result);
      onRefresh?.(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => { check(); }, [check]);

  const status = health?.status || (error ? 'unhealthy' : 'unknown');
  const statusVariant = status === 'healthy' ? 'success' : status === 'unhealthy' ? 'danger' : 'warning';

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-sm">
        <Badge variant={statusVariant} dot />
        <span className="text-sm text-muted">{status}</span>
        <Button size="sm" variant="ghost" icon={<I.Refresh />} onClick={check} loading={loading} />
      </div>
    );
  }

  return (
    <Card
      title="System Health"
      subtitle={`Last checked: ${health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}`}
      actions={<Button size="sm" variant="ghost" icon={<I.Refresh />} onClick={check} loading={loading} />}
    >
      {error && <div className="alert alert-danger mb-sm"><I.Alert /> {error}</div>}
      <div className="flex items-center gap-sm mb">
        <Badge variant={statusVariant} size="lg">{status}</Badge>
        <span className="text-sm text-muted">Provider: {health?.provider || '—'}</span>
      </div>
      <div className="grid grid-2">
        {Object.entries(METRICS).map(([key, metric]) => (
          <div key={key} className="flex items-center gap-sm">
            <span className="stat-card-icon stat-card-icon-sm primary">{metric.icon}</span>
            <div>
              <div className="text-xs text-muted">{metric.label}</div>
              <div className="font-medium">{metric.getValue(health)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
