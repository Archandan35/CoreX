import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'inbox', title = 'No data', message = '', action }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={48} strokeWidth={1.5} />
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
