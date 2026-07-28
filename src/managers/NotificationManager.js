class NotificationManager {
  constructor() {
    this.listeners = new Set();
    this.notifications = [];
    this.activeKeys = new Set();
  }

  show(notification) {
    const dedupKey = notification.key || notification.message;
    if (dedupKey && this.activeKeys.has(dedupKey)) return null;

    const entry = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      duration: notification.duration ?? 5000,
      timestamp: new Date().toISOString(),
      loading: notification.loading || false,
      key: dedupKey,
    };
    if (dedupKey) this.activeKeys.add(dedupKey);
    this.notifications.push(entry);
    if (this.notifications.length > 50) {
      const removed = this.notifications.shift();
      if (removed?.key) this.activeKeys.delete(removed.key);
    }
    this.listeners.forEach((fn) => fn(entry));

    if (entry.duration > 0 && !entry.loading) {
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

  warning(title, message) {
    return this.show({ type: 'warning', title, message });
  }

  warn(title, message) {
    return this.warning(title, message);
  }

  info(title, message) {
    return this.show({ type: 'info', title, message });
  }

  loading(title, message) {
    return this.show({ type: 'info', title, message, loading: true, duration: 0 });
  }

  resolve(loadingId, type, title, message) {
    const entry = this.notifications.find((n) => n.id === loadingId);
    if (!entry) return;
    this.dismiss(loadingId);
    this.show({ type: type || 'success', title: title || entry.title, message: message || entry.message });
  }

  successLoading(loadingId, title, message) {
    this.resolve(loadingId, 'success', title, message);
  }

  errorLoading(loadingId, title, message) {
    this.resolve(loadingId, 'error', title, message);
  }

  async promise(promise, { loading, success, error }) {
    const id = this.loading(loading?.title || 'Processing', loading?.message || 'Please wait...');
    try {
      const result = await promise;
      this.resolve(id, 'success', success?.title || 'Done', success?.message || 'Operation completed.');
      return result;
    } catch (e) {
      this.resolve(id, 'error', error?.title || 'Failed', error?.message || e?.message || 'Something went wrong.');
      throw e;
    }
  }

  dismiss(id) {
    const entry = this.notifications.find((n) => n.id === id);
    if (entry?.key) this.activeKeys.delete(entry.key);
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.listeners.forEach((fn) => fn({ id, dismiss: true }));
  }

  clear() {
    this.notifications = [];
    this.activeKeys.clear();
    this.listeners.forEach((fn) => fn({ clear: true }));
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const notificationManager = new NotificationManager();
