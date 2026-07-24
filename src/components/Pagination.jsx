import { memo } from 'react';
import I from '../icon';

const Pagination = memo(function Pagination({ page = 1, totalPages = 1, total = 0, pageSize = 20, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }) {
  if (totalPages <= 1 && total <= pageSize) return null;

  const getPages = () => {
    const pages = [];
    const delta = 2;
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {start} to {end} of {total} entries
      </div>
      <div className="pagination-buttons">
        <button className="pagination-btn" disabled={page <= 1} onClick={() => onPageChange(1)}><I.ChevronLeft /><I.ChevronLeft className="pagination-btn-double" /></button>
        <button className="pagination-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><I.ChevronLeft /></button>
        {getPages().map((p, i) =>
          p === '...' ? <span key={`ellipsis-${i}`} className="pagination-btn pagination-btn-ellipsis">...</span>
          : <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
        )}
        <button className="pagination-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><I.ChevronRight /></button>
        <button className="pagination-btn" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}><I.ChevronRight /><I.ChevronRight className="pagination-btn-double" /></button>
      </div>
      {onPageSizeChange && (
        <div className="pagination-size">
          Show
          <select className="pagination-size-select" value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {pageSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          per page
        </div>
      )}
    </div>
  );
});

export default Pagination;
