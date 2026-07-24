import { memo } from 'react';
import I from '../icon';

const Alert = memo(function Alert({ children, type = 'info', title, icon, className = '' }) {
  const icons = { success: <I.Check />, danger: <I.Alert />, warning: <I.Alert />, info: <I.Info /> };
  return (
    <div className={`alert alert-${type} ${className}`}>
      <span className="alert-icon">{icon || icons[type]}</span>
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        {children}
      </div>
    </div>
  );
});

export default Alert;
