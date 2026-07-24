import { memo, useState, useRef, useEffect } from 'react';

const Dropdown = memo(function Dropdown({ trigger, children, align = 'right', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <div className="dropdown-trigger" onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="dropdown-menu" style={{ [align]: 0, left: align === 'left' ? 0 : undefined }}
          onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
});

export const DropdownItem = memo(function DropdownItem({ children, icon, danger, onClick, ...props }) {
  return (
    <button className={`dropdown-item ${danger ? 'dropdown-item-danger' : ''}`} onClick={onClick} {...props}>
      {icon && <span className="dropdown-icon">{icon}</span>}
      {children}
    </button>
  );
});

export default Dropdown;

export const DropdownDivider = memo(function DropdownDivider() {
  return <div className="dropdown-divider" />;
});
