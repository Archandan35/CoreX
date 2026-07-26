export class SortBuilder {
  constructor() {
    this.sorts = [];
    this.allowedFields = [];
  }

  allow(fields) {
    this.allowedFields = fields;
    return this;
  }

  orderBy(field, direction) {
    this.sorts.push({ field, direction: direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC' });
    return this;
  }

  build() {
    if (this.sorts.length === 0) return { clause: '', params: [] };

    const clauses = this.sorts.map((s) => {
      if (this.allowedFields.length > 0 && !this.allowedFields.includes(s.field)) {
        return null;
      }
      return `${s.field} ${s.direction}`;
    }).filter(Boolean);

    return {
      clause: clauses.length > 0 ? `ORDER BY ${clauses.join(', ')}` : '',
    };
  }
}

export function sortBuilder() {
  return new SortBuilder();
}

export function parseSort(sortString, allowed) {
  const builder = new SortBuilder().allow(allowed || []);
  if (!sortString) return builder;

  sortString.split(',').forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('-')) {
      builder.orderBy(trimmed.slice(1), 'DESC');
    } else if (trimmed.startsWith('+')) {
      builder.orderBy(trimmed.slice(1), 'ASC');
    } else {
      builder.orderBy(trimmed, 'ASC');
    }
  });

  return builder;
}
