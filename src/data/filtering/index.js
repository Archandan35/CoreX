export class FilterBuilder {
  constructor() {
    this.conditions = [];
    this.params = [];
    this.paramIndex = 0;
  }

  where(field, operator, value) {
    this.paramIndex++;
    this.params.push(value);
    this.conditions.push(`${field} ${operator} $${this.paramIndex}`);
    return this;
  }

  whereIn(field, values) {
    if (!values || values.length === 0) return this;
    const placeholders = values.map(() => {
      this.paramIndex++;
      this.params.push(undefined);
      return `$${this.paramIndex}`;
    });
    values.forEach((v, i) => {
      this.params[this.paramIndex - values.length + i] = v;
    });
    this.conditions.push(`${field} IN (${placeholders.join(', ')})`);
    return this;
  }

  whereLike(field, value) {
    this.paramIndex++;
    this.params.push(`%${value}%`);
    this.conditions.push(`${field} LIKE $${this.paramIndex}`);
    return this;
  }

  whereBetween(field, from, to) {
    this.paramIndex++;
    this.params.push(from);
    this.paramIndex++;
    this.params.push(to);
    this.conditions.push(`${field} BETWEEN $${this.paramIndex - 1} AND $${this.paramIndex}`);
    return this;
  }

  whereNull(field) {
    this.conditions.push(`${field} IS NULL`);
    return this;
  }

  whereNotNull(field) {
    this.conditions.push(`${field} IS NOT NULL`);
    return this;
  }

  build() {
    return {
      clause: this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '',
      params: this.params,
    };
  }
}

export function filterBuilder() {
  return new FilterBuilder();
}
