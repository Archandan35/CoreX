import { useState, useEffect } from 'react';
import Icon from '../ui/Icon.jsx';
import { useAuth } from '../../identity/auth/AuthContext.jsx';
import { useApp } from '../../state/AppContext.jsx';

export default function DatabaseHealthBanner() {
  const { hasFullAccess } = useAuth();
  const { adminExists, dbHealth, openSetupWizard } = useApp();
  const [dismissed, setDismissed] = useState(false);

  // Dismissing only hides the banner visually — it never clears the
  // underlying warning state, so it reappears on the next navigation/reload
  // for as long as the database actually remains inconsistent.
  useEffect(() => { setDismissed(false); }, [dbHealth?.missingCount]);

  // Visibility is gated exclusively on user.full_access === true. Role
  // names (Admin, Owner, System Administrator, etc.) must never be used to
  // decide whether this banner is shown.
  // Suppress when no admin exists yet — AdminSetupBanner takes precedence
  // in that case to avoid showing two banners at once.
  if (!hasFullAccess) return null;
  if (!dbHealth || dbHealth.compatible) return null;
  if (adminExists === false) return null;
  if (dismissed) return null;

  const count = dbHealth.missingCount || 0;

  return (
    <div className="db-health-banner" role="alert">
      <div className="db-health-banner__content">
        <Icon name="alert" size={16} />
        <span>
          {count} missing or incompatible database {count === 1 ? 'object' : 'objects'} detected
        </span>
      </div>
      <div className="db-health-banner__actions">
        <button type="button" className="db-health-banner__action" onClick={openSetupWizard}>
          Run Setup Wizard
        </button>
        <button
          type="button"
          className="db-health-banner__close"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss warning"
          title="Dismiss"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}
