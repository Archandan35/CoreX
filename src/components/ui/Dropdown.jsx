import { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';

export default function Dropdown({ trigger, children, align = 'left', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <div className="dropdown__trigger" onClick={() => setOpen((p) => !p)}>
        {trigger || <Icon name="more-vertical" size={16} />}
      </div>
      {open && (
        <div className={`dropdown__menu dropdown__menu--${align}`}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, danger, disabled }) {
  return (
    <button
      className={`dropdown__item${danger ? ' dropdown__item--danger' : ''}`}
      onClick={() => { if (!disabled) onClick?.(); }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
