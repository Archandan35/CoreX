import Icon from './Icon.jsx';

export default function SuccessState({ title = 'Success', message = '', action }) {
  return (
    <div className="success-state">
      <Icon name="check-circle" size={48} strokeWidth={1.5} />
      <h3 className="success-state-title">{title}</h3>
      {message && <p className="success-state-message">{message}</p>}
      {action && <div className="success-state-action">{action}</div>}
    </div>
  );
}
