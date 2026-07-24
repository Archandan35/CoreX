import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

export default function CommandBar({ open, onClose }) {
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd" onClick={(e) => e.stopPropagation()}>
        <div className="cmd__header">
          <Icon name="search" size={16} />
          <input className="cmd__input" placeholder="Search cases, drafts, citations…" autoFocus />
        </div>
        <div className="cmd__body">
          <div className="cmd__empty">Type to search</div>
        </div>
      </div>
    </div>
  );
}