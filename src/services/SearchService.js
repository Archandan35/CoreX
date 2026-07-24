import PROVIDER from '../data-provider';

class SearchService {
  async searchAll(query, resources = [], options = {}) {
    const results = {};
    for (const resource of resources) {
      try {
        const result = await PROVIDER.findMany(resource, { search: query, pageSize: options.limit || 5 });
        if (result.data.length > 0) {
          results[resource] = result.data;
        }
      } catch {}
    }
    return results;
  }

  async globalSearch(query) {
    return this.searchAll(query, ['users', 'roles']);
  }

  getSuggestions(query, items = [], fields = []) {
    if (!query || !items?.length) return [];
    const q = query.toLowerCase();
    const scored = [];
    for (const item of items) {
      let score = 0;
      for (const field of fields) {
        const val = String(item[field] || '').toLowerCase();
        if (val === q) score += 100;
        else if (val.startsWith(q)) score += 50;
        else if (val.includes(q)) score += 10;
      }
      if (score > 0) scored.push({ ...item, _score: score });
    }
    return scored.sort((a, b) => b._score - a._score).slice(0, 10);
  }
}

const searchService = new SearchService();
export default searchService;
