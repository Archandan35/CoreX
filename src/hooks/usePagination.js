import { useState, useMemo } from 'react';

export function usePagination({ total = 0, defaultPageSize = 20, defaultPage = 1 } = {}) {
  const [page, setPage] = useState(defaultPage);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const goToPage = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);
  const firstPage = () => goToPage(1);
  const lastPage = () => goToPage(totalPages);

  const changePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page, pageSize, totalPages,
    setPage: goToPage,
    setPageSize: changePageSize,
    nextPage, prevPage, firstPage, lastPage,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}
