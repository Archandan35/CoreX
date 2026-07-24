import { memo } from 'react';

const Tabs = memo(function Tabs({ tabs = [], active, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange?.(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="tab-badge badge badge-secondary badge-sm">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
});

export default Tabs;
