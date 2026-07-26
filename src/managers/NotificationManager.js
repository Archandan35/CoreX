class NotificationManager {
  constructor() {
    this.listeners = new Set();
    this.notifications = [];
  }

  show(notification) {
    const entry = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      duration: notification.duration || 5000,
      timestamp: new Date().toISOString(),
    };
    this.notifications.push(entry);
    if (this.notifications.length > 50) this.notifications.shift();
    this.listeners.forEach((fn) => fn(entry));

    if (entry.duration > 0) {
      setTimeout(() => this.dismiss(entry.id), entry.duration);
    }

    return entry.id;
  }

  success(title, message) {
    return this.show({ type: 'success', title, message });
  }

  error(title, message) {
    return this.show({ type: 'error', title, message });
  }

  info(title, message) {
    return this.show({ type: 'info', title, message });
  }

  warn(title, message) {
    return this.show({ type: 'warning', title, message });
  }

  dismiss(id) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.listeners.forEach((fn) => fn({ id, dismiss: true }));
  }

  clear() {
    this.notifications = [];
    this.listeners.forEach((fn) => fn({ clear: true }));
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const notificationManager = new NotificationManager();
