import { useState, useRef, useEffect } from 'react';
import Icon from '../ui/Icon.jsx';
import { useAuth } from '../../identity/auth/AuthContext.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="header__left">
        <span className="header__greeting">Welcome, {user?.name || 'User'}</span>
      </div>
      <div className="header__right">
        <div className="header__user" ref={ref}>
          <button className="header__user-btn" onClick={() => setMenuOpen((p) => !p)}>
            <div className="header__avatar">{user?.name?.charAt(0) || 'U'}</div>
            <span className="header__user-name">{user?.name || 'User'}</span>
            <Icon name="chevron-down" size={14} />
          </button>
          {menuOpen && (
            <div className="header__dropdown">
              <button className="header__dropdown-item" onClick={() => { setMenuOpen(false); logout(); }}>
                <Icon name="log-out" size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
