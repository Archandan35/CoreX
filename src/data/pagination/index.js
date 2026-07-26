export class Paginator {
  constructor(page = 1, perPage = 20) {
    this.page = Math.max(1, page);
    this.perPage = Math.max(1, Math.min(100, perPage));
    this.offset = (this.page - 1) * this.perPage;
  }

  apply(query) {
    return `${query} LIMIT ${this.perPage} OFFSET ${this.offset}`;
  }

  buildMeta(total) {
    return {
      page: this.page,
      perPage: this.perPage,
      total,
      totalPages: Math.ceil(total / this.perPage),
      hasNext: this.page * this.perPage < total,
      hasPrev: this.page > 1,
    };
  }
}

export function paginate(page, perPage) {
  return new Paginator(page, perPage);
}

export function paginatedResponse(data, total, page, perPage) {
  const p = new Paginator(page, perPage);
  return { data, meta: p.buildMeta(total) };
}
