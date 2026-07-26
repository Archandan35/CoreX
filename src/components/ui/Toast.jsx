import { useState, useEffect, useCallback } from 'react';
import { notificationManager } from '../../managers/NotificationManager.js';
import Icon from './Icon.jsx';

function ToastItem({ notification, onDismiss }) {
  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-circle',
    info: 'info',
  };

  useEffect(() => {
    if (notification.duration > 0) {
      const timer = setTimeout(() => onDismiss(notification.id), notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onDismiss]);

  return (
    <div className={`toast toast-${notification.type}`} role="alert">
      <Icon name={icons[notification.type] || 'info'} size={16} />
      <div className="toast-content">
        {notification.title && <div className="toast-title">{notification.title}</div>}
        <div className="toast-message">{notification.message}</div>
      </div>
      <button className="toast-close" onClick={() => onDismiss(notification.id)} aria-label="Dismiss">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

export default function Toast() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    return notificationManager.onChange((entry) => {
      if (entry.clear) return setNotifications([]);
      if (entry.dismiss) return setNotifications((prev) => prev.filter((n) => n.id !== entry.id));
      setNotifications((prev) => [...prev, entry]);
    });
  }, []);

  const dismiss = useCallback((id) => notificationManager.dismiss(id), []);

  if (notifications.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onDismiss={dismiss} />
      ))}
    </div>
  );
}
