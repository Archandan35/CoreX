import { memo } from 'react';
import I from '../icon';
import Badge from './Badge';

function SortIcon({ direction }) {
  return <span className={`sort-icon ${direction ? 'active' : ''}`}>{direction === 'asc' ? '↑' : '↓'}</span>;
}

const Table = memo(function Table({ columns, data, onSort, sortBy, sortDir, loading, emptyText = 'No data found', onRowClick, selectedIds, onSelectAll, onSelectOne, keyExtractor = (item) => item.id }) {
  if (!columns?.length) return null;

  const allSelected = data?.length > 0 && selectedIds?.length === data?.length;
  const someSelected = selectedIds?.length > 0 && selectedIds?.length < data?.length;

  return (
    <div className={`table-container ${loading ? 'table-loading' : ''}`}>
      <table className="table">
        <thead>
          <tr>
            {onSelectAll && (
              <th className="sel-col">
                <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }} onChange={onSelectAll} />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${col.sortable ? 'sortable' : ''} ${sortBy === col.key ? 'sorted' : ''}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                {col.label}
                {col.sortable && <SortIcon direction={sortBy === col.key ? sortDir : null} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(!data || data.length === 0) && (
            <tr>
              <td colSpan={columns.length + (onSelectAll ? 1 : 0)}>
                <div className="table-empty">
                  <div className="table-empty-icon"><I.Inbox /></div>
                  <div className="table-empty-text">{emptyText}</div>
                </div>
              </td>
            </tr>
          )}
          {data?.map((item) => (
            <tr key={keyExtractor(item)} className={onRowClick ? 'clickable' : ''} onClick={() => onRowClick?.(item)}>
              {onSelectOne && (
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds?.includes(item.id)} onChange={() => onSelectOne(item.id)} />
                </td>
              )}
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(item[col.key], item) : col.badge ? <Badge variant={col.badge}>{item[col.key]}</Badge> : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export const Inbox = memo(function Inbox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
});

export default Table;
