import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import { useApp } from '../../state/AppContext.jsx';

// "No administrator exists" banner — shown on EVERY page of the application
// (login, register, and inside the authenticated app alike) when the database
// is compatible but no user with full_access = true has been created yet.
//
// Visibility rules (per spec):
//   - This is the UNINITIALIZED-system state. Because no full_access user
//     exists yet, the normal "full_access-only" banner rule CANNOT apply here
//     (there is nobody to show it to). So this banner is shown to EVERYONE —
//     it IS the prompt to create the first administrator.
//   - It is NOT gated on authentication. An unauthenticated visitor on /login
//     must see it and be directed to /register.
//   - The instant the first admin (full_access = true) is created, adminExists
//     flips to true and this banner disappears automatically across the whole
//     app. From that point on, only full_access users see maintenance banners
//     (see DatabaseHealthBanner).
//
// Note on the full_access rule: we deliberately do NOT consult the current
// user's full_access flag here, because doing so would hide the very prompt
// that creates the first administrator. Role names are never used.
export default function AdminSetupBanner() {
  const { adminExists, dbHealth } = useApp();
  const navigate = useNavigate();

  // Only show when the database is confirmed compatible AND no admin exists.
  // While the database is incomplete, the Setup Wizard handles initialization
  // instead — do not double-surface a banner.
  if (adminExists !== false) return null;
  if (!dbHealth || !dbHealth.compatible) return null;

  return (
    <div className="db-health-banner admin-setup-banner" role="alert">
      <div className="db-health-banner__content">
        <Icon name="shield" size={16} />
        <span>
          This system has not been initialized yet — no administrator account exists.
          Create the first administrator account to continue.
        </span>
      </div>
      <div className="db-health-banner__actions">
        <button
          type="button"
          className="db-health-banner__action"
          onClick={() => navigate('/register')}
        >
          Create Administrator Account
        </button>
      </div>
    </div>
  );
}
