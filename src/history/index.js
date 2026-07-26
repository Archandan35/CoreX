export class HistoryService {
  constructor() {
    this.entries = [];
  }

  push(entry) {
    this.entries.push({
      ...entry,
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
    });
    if (this.entries.length > 100) this.entries.shift();
  }

  back() {
    return this.entries.pop();
  }

  peek() {
    return this.entries[this.entries.length - 1] || null;
  }

  getAll() {
    return [...this.entries];
  }

  clear() {
    this.entries = [];
  }
}

export const historyService = new HistoryService();
