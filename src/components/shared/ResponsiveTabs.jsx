import { useState, useEffect, useRef } from 'react';
import Icon from '../ui/Icon.jsx';

export default function ResponsiveTabs({
  items,
  value,
  onChange,
  className = '',
  tabClassName = '',
  activeClass = 'active',
}) {
  const container = useRef(null);
  const [visibleItems, setVisible] = useState(items);
  const [overflowItems, setOverflow] = useState([]);
  const [open, setOpen] = useState(false);

  // Measure tab widths (simple method using refs and getBoundingClientRect)
  const measure = () => {
    if (!container.current) return;
    const containerW = container.current.getBoundingClientRect().width;
    let used = 0;
    const v = [];
    const o = [];
    items.forEach((it) => {
      const el = container.current.querySelector(`button[data-id="${it.id}"]`);
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (used + w > containerW) {
        o.push(it);
      } else {
        used += w;
        v.push(it);
      }
    });
    setVisible(v);
    setOverflow(o);
  };

  useEffect(() => {
    measure();
    const resize = new ResizeObserver(() => measure());
    if (container.current) resize.observe(container.current);
    return () => resize.disconnect();
  }, [items, value]);

  return (
    <div ref={container} className={className} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
      {visibleItems.map((it) => (
        <button
          key={it.id}
          data-id={it.id}
          className={`tab ${activeClass} ${tabClassName} ${value === it.value ? activeClass : ''}`}
          onClick={() => onChange(it.value)}
          style={{ marginRight: 4, padding: '6px 12px', fontSize: 14 }}
        >
          {it.label}
        </button>
      ))}
      {overflowItems.length > 0 && (
        <div className="dropdown" style={{ position: 'relative' }}>
          <div
            className="dropdown__trigger"
            onClick={() => setOpen((p) => !p)}
            style={{ padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
          >
            <Icon name="more-vertical" size={16} />
          </div>
          {open && (
            <div className="dropdown__menu" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: '4px 0' }}>
              {overflowItems.map((it) => (
                <button
                  key={it.id}
                  className="dropdown__item"
                  onClick={() => {
                    onChange(it.value);
                    setOpen(false);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: 'none' }}
                >
                  {it.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
