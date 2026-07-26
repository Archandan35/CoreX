export class SearchBuilder {
  constructor() {
    this.fields = [];
    this.query = '';
    this.params = [];
    this.paramIndex = 0;
  }

  search(query, fields) {
    this.query = query;
    this.fields = fields || this.fields;
    return this;
  }

  inFields(fields) {
    this.fields = fields;
    return this;
  }

  build() {
    if (!this.query || this.fields.length === 0) {
      return { clause: '', params: [] };
    }

    const searchTerm = `%${this.query}%`;
    const conditions = this.fields.map(() => {
      this.paramIndex++;
      this.params.push(searchTerm);
      return `LOWER(${this.fields[this.paramIndex - 1]}) LIKE LOWER($${this.paramIndex})`;
    });

    return {
      clause: `(${conditions.join(' OR ')})`,
      params: this.params,
    };
  }
}

export function searchBuilder() {
  return new SearchBuilder();
}
