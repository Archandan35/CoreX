import { useMemo, useCallback } from 'react';
import Dropdown, { DropdownItem } from './Dropdown.jsx';
import Icon from './Icon.jsx';

export default function LookupSelect({ items, value, onChange, placeholder = 'Select...', searchPlaceholder = 'Search...', displayFn, icon, renderItem, showSearch = true, emptyMessage = 'No results.' }) {
  const display = displayFn || ((item) => item?.name || item?.label || String(item));
  const searchable = useMemo(() => {
    return (items || []).filter(Boolean);
  }, [items]);

  const renderTrigger = useCallback(() => (
    <div className="lookup-select-trigger">
      {icon && <Icon name={icon} size={14} />}
      <span className={value ? 'lookup-select-label' : 'lookup-select-label lookup-select-label--placeholder'}>{value ? display(value) : placeholder}</span>
      <Icon name="chevron-down" size={14} className="lookup-select-chevron" />
    </div>
  ), [value, placeholder, display, icon]);

  return (
    <Dropdown trigger={renderTrigger()}>
      {(close) => (
        <div className="lookup-select-dropdown">
          {searchable.length === 0 && (
            <div className="lookup-select-empty">{emptyMessage}</div>
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
