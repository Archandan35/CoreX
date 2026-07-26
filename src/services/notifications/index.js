export class NotificationService {
  constructor() {
    this.listeners = new Map();
  }

  subscribe(userId, callback) {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId).add(callback);
    return () => this.listeners.get(userId)?.delete(callback);
  }

  async notify(userId, notification) {
    const userListeners = this.listeners.get(userId);
    if (userListeners) {
      userListeners.forEach((cb) => {
        try { cb(notification); } catch {}
      });
    }
  }

  async broadcast(notification) {
    this.listeners.forEach((callbacks) => {
      callbacks.forEach((cb) => {
        try { cb(notification); } catch {}
      });
    });
  }

  async send({ userId, type, title, message, data }) {
    await this.notify(userId, { type, title, message, data });
  }
}
