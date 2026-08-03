import { useState, useEffect, useRef, useCallback } from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import Icon from '../ui/Icon.jsx';

const TRIGGER_ESTIMATE = 110;

export default function ResponsiveTabs({
  items,
  value,
  onChange,
  className = '',
  tabClassName = '',
  activeClass = 'active',
  overflowLabel = '... More',
}) {
  const container = useRef(null);
  const tabsRef = useRef(new Map());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [visibleItems, setVisible] = useState([]);
  const [overflowItems, setOverflow] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const measure = useCallback(() => {
    const el = container.current;
    if (!el) return;
    const containerW = el.getBoundingClientRect().width;
    const triggerEl = el.querySelector('.dropdown');
    const triggerW = triggerEl ? triggerEl.getBoundingClientRect().width + 8 : TRIGGER_ESTIMATE;

    const cur = itemsRef.current;
    // Pass 1: check if everything fits without any trigger reservation
    let used = 0;
    let allFit = true;
    for (const it of cur) {
      const tabEl = tabsRef.current.get(it.id);
      if (!tabEl) { continue; }
      used += tabEl.getBoundingClientRect().width;
      if (used > containerW) { allFit = false; break; }
    }
    if (allFit) {
      setVisible(cur);
      setOverflow([]);
      return;
    }

    // Pass 2: reserve space for trigger, push overflow items
    let used2 = 0;
    const v = [];
    const o = [];
    for (const it of cur) {
      const tabEl = tabsRef.current.get(it.id);
      if (!tabEl) { v.push(it); continue; }
      const w = tabEl.getBoundingClientRect().width;
      if (used2 + w + triggerW > containerW && v.length > 0) {
        o.push(it);
      } else {
        used2 += w;
        v.push(it);
      }
    }
    setVisible(v);
    setOverflow(o);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      measure();
      const resize = new ResizeObserver(() => measure());
      if (container.current) resize.observe(container.current);
      measure._disconnect = () => resize.disconnect();
    });
    return () => {
      cancelAnimationFrame(raf);
      if (measure._disconnect) measure._disconnect();
    };
  }, [measure]);

  // Re-measure when items content changes (e.g., loaded from API)
  const itemIdsKey = items.map((i) => i.id).join(',');
  useEffect(() => { requestAnimationFrame(() => measure()); }, [measure, itemIdsKey]);

  const handleOverflowKeyDown = useCallback((e) => {
    const o = overflowItems;
    if (!o.length) return;
    let idx = focusedIndex >= 0 && focusedIndex < o.length ? focusedIndex : 0;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      idx = idx < o.length - 1 ? idx + 1 : 0;
      setFocusedIndex(idx);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      idx = idx > 0 ? idx - 1 : o.length - 1;
      setFocusedIndex(idx);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (idx >= 0 && idx < o.length) onChange(o[idx].value);
    }
  }, [overflowItems, focusedIndex, onChange]);

  return (
    <div ref={container} className={className} role="tablist" aria-label="Document types">
      {visibleItems.map((it) => (
        <button
          key={it.id}
          data-id={it.id}
          ref={(el) => { if (el) tabsRef.current.set(it.id, el); else tabsRef.current.delete(it.id); }}
          className={`${tabClassName}${value === it.value ? ` ${activeClass}` : ''}`}
          onClick={() => onChange(it.value)}
          role="tab"
          aria-selected={value === it.value}
        >
          {it.label}
          {it.count != null && <span className="invoice-tab__count">{it.count}</span>}
        </button>
      ))}
      {overflowItems.length > 0 && (
        <Dropdown
          trigger={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '10px 12px', fontSize: 14, fontWeight: 500, color: 'var(--inv-text-sub)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {overflowLabel} <Icon name="chevron-down" size={14} />
            </span>
          }
          align="left"
        >
          {(close) => (
            <div role="menu" onKeyDown={handleOverflowKeyDown}>
              {overflowItems.map((it, i) => (
                <button
                  key={it.id}
                  className={`dropdown__item${value === it.value ? ' active' : ''}${focusedIndex === i ? ' dropdown__item--focused' : ''}`}
                  onClick={() => { onChange(it.value); close(); }}
                  onMouseEnter={() => setFocusedIndex(i)}
                  role="menuitem"
                  aria-selected={value === it.value}
                >
                  {value === it.value && <Icon name="check" size={14} style={{ marginRight: 4 }} />}
                  {value !== it.value && <span style={{ width: 18, marginRight: 4 }} />}
                  {it.label}
                </button>
              ))}
            </div>
          )}
        </Dropdown>
      )}
    </div>
  );
}
