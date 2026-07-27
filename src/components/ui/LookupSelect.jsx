import { useMemo, useCallback } from 'react';
import Dropdown, { DropdownItem } from './Dropdown.jsx';
import Icon from './Icon.jsx';
import Search from './Search.jsx';

export default function LookupSelect({ items, value, onChange, placeholder = 'Select...', searchPlaceholder = 'Search...', displayFn, icon, renderItem, showSearch = true, emptyMessage = 'No results.' }) {
  const display = displayFn || ((item) => item?.name || item?.label || String(item));
  const searchable = useMemo(() => {
    return (items || []).filter(Boolean);
  }, [items]);

  const renderTrigger = useCallback(() => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', minWidth: 180, fontSize: 13 }}>
      {icon && <Icon name={icon} size={14} />}
      <span style={{ flex: 1, color: value ? '#0f172a' : '#94a3b8' }}>{value ? display(value) : placeholder}</span>
      <Icon name="chevron-down" size={14} style={{ color: '#94a3b8' }} />
    </div>
  ), [value, placeholder, display, icon]);

  return (
    <Dropdown trigger={renderTrigger()}>
      {(close) => (
        <div style={{ minWidth: 240, maxHeight: 280, overflowY: 'auto' }}>
          {searchable.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: '#64748b' }}>{emptyMessage}</div>
          )}
          {searchable.map((item, i) => (
            <DropdownItem key={item.id || i} onClick={() => { onChange(item); close?.(); }}>
              {renderItem ? renderItem(item) : display(item)}
            </DropdownItem>
          ))}
        </div>
      )}
    </Dropdown>
  );
}