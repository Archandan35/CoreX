import Icon from './Icon.jsx';
import Button from './Button.jsx';

export default function ErrorState({ title = 'Something went wrong', message = '', onRetry }) {
  return (
    <div className="error-state">
      <Icon name="alert-circle" size={48} strokeWidth={1.5} />
      <h3 className="error-state-title">{title}</h3>
      {message && <p className="error-state-message">{message}</p>}
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
