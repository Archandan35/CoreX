import { memo } from 'react';
import I from '../icon';
import Button from './Button';

const EmptyState = memo(function EmptyState({ icon = <I.Inbox />, title = 'No data found', description = '', action, actionLabel = '', onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-text">{description}</p>}
      {action && <Button onClick={onAction}>{actionLabel || action}</Button>}
    </div>
  );
});

export default EmptyState;
