import { DEBOUNCE_DELAY } from '../constants/index.js';

class SearchManager {
  constructor() {
    this._debounceTimers = new Map();
  }

  search(query, fields, data, options = {}) {
    const threshold = options.threshold || 2;
    const maxResults = options.maxResults || 20;
    const q = query.toLowerCase();

    if (q.length < threshold) return [];

    const scored = [];

    for (const item of data) {
      let score = 0;
      const matchField = options.matchField || null;

      for (const field of fields) {
        const value = String(item[field] || '').toLowerCase();
        if (value === q) score += 100;
        else if (value.startsWith(q)) score += 50;
        else if (value.includes(q)) score += 25;
        else {
          const words = q.split(/\s+/);
          const wordMatches = words.filter((w) => value.includes(w)).length;
          score += wordMatches * 10;
        }
      }

      if (score > 0 || (matchField && String(item[matchField]).toLowerCase().includes(q))) {
        scored.push({ item, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((s) => s.item);
  }

  debouncedSearch(query, fields, data, options = {}, callback) {
    const key = options.key || '_default';
    if (this._debounceTimers.has(key)) {
      clearTimeout(this._debounceTimers.get(key));
    }
    this._debounceTimers.set(key, setTimeout(() => {
      callback(this.search(query, fields, data, options));
    }, DEBOUNCE_DELAY));
  }

  cancel(key) {
    if (this._debounceTimers.has(key)) {
      clearTimeout(this._debounceTimers.get(key));
      this._debounceTimers.delete(key);
    }
  }
}

export const searchManager = new SearchManager();
