import { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';

export default function Dropdown({ trigger, children, align = 'left', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!open) return;
    const mousedownHandler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const keyHandler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', mousedownHandler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', mousedownHandler);
      document.removeEventListener('keydown', keyHandler);
    };
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
