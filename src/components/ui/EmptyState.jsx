import Icon from './Icon.jsx';

const SIZE_MAP = { sm: 32, md: 48, lg: 64 };

export default function EmptyState({ icon = 'inbox', title = 'No data', message = '', action, size = 'md' }) {
  const iconSize = SIZE_MAP[size] || 48;
  return (
    <div className="empty-state">
      <Icon name={icon} size={iconSize} strokeWidth={1.5} />
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export function TableEmptyState({ colSpan, icon, title, message, action }) {
  return (
    <tr>
      <td colSpan={colSpan || 8} style={{ textAlign: 'center', padding: '40px 20px' }}>
        <EmptyState icon={icon} title={title} message={message} action={action} />
      </td>
    </tr>
  );
}