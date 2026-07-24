import { memo, useEffect, useCallback } from 'react';
import I from '../icon';

const Modal = memo(function Modal({ open, onClose, title, children, footer, size = '', closeOnOverlay = true }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const modalClass = ['modal', size ? `modal-${size}` : ''].filter(Boolean).join(' ');

  return (
    <div className="modal-overlay" onClick={(e) => { if (closeOnOverlay && e.target === e.currentTarget) onClose?.(); }}>
      <div className={modalClass}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}><I.Close /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
});

export default Modal;
