import { memo } from 'react';
import I from '../icon';

const Toast = memo(function Toast({ message, type = 'info', onClose }) {
  const icons = { success: <I.Check />, error: <I.Alert />, warning: <I.Alert />, info: <I.Info /> };
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}><I.Close /></button>
    </div>
  );
});

export const ToastContainer = memo(function ToastContainer({ toasts = [], onClose }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map((t, i) => (
        <Toast key={t.id || i} message={t.message} type={t.type} onClose={() => onClose?.(t.id || i)} />
      ))}
    </div>
  );
});

export default Toast;
