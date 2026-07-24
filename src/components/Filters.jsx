import { memo } from 'react';
import I from '../icon';

const Filters = memo(function Filters({ filters = [], activeFilters = {}, onChange, onClear }) {
  const handleChange = (key, value) => {
    onChange?.({ ...activeFilters, [key]: value });
  };

  const handleRemove = (key) => {
    const updated = { ...activeFilters };
    delete updated[key];
    onChange?.(updated);
  };

  const hasActive = Object.keys(activeFilters).length > 0;

  return (
    <div className="filters-bar">
      <span className="filters-label"><I.Filter /> Filters</span>
      {filters.map((filter) => (
        <select
          key={filter.key}
          className="filters-select"
          value={activeFilters[filter.key] || ''}
          onChange={(e) => handleChange(filter.key, e.target.value)}
        >
          <option value="">{filter.label}</option>
          {filter.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
      {hasActive && (
        <div className="filters-active">
          {Object.entries(activeFilters).map(([key, value]) =>
            value ? (
              <span key={key} className="filters-tag">
                {key}: {value}
                <button className="filters-tag-remove" onClick={() => handleRemove(key)}>×</button>
              </span>
            ) : null
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClear}>Clear all</button>
        </div>
      )}
    </div>
  );
});

export default Filters;
