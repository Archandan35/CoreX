/**
 * DatabaseProviderStep (Setup Wizard — Step 2)
 * --------------------------------------------
 * "Choose your database" — a curated 2-column grid of provider cards.
 *
 * Each card shows:
 *  - a brand-colored logo tile + single letter
 *  - the provider name (bold)
 *  - a one-line description
 *  - an inner divider, then a status badge:
 *      • "Recommended"  (primary) — for the recommended provider
 *      • "Validated"    (green)   — after a successful connection
 *      • "Not Configured" (gray)  — default
 *  - a selected card shows the primary border + light primary fill
 *
 * The curated grid shows 6 mainstream relational/document providers.
 * The full provider registry (incl. Oracle, MongoDB) is still used for
 * connection/validation downstream — this list just controls what is
 * presented in the picker.
 *
 * Props:
 *  - providers:        full PROVIDERS array from ProviderRegistry (looked up by id)
 *  - selectedProvider: currently selected provider id (or null)
 *  - validated:        boolean — true once the connection validated successfully
 *  - onSelect:         (providerId) => void
 *  - onBack:           () => void
 *  - onNext:           () => void
 */
import { useMemo } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import Button from '../../components/ui/Button.jsx';
import { getProvider } from '../ProviderRegistry.js';

// Provider ids surfaced in the picker, in display order.
const PICKER_ORDER = ['supabase', 'postgres', 'mysql', 'mariadb', 'sqlserver', 'sqlite'];

// Which provider carries the "Recommended" badge.
const RECOMMENDED_ID = 'supabase';

export default function DatabaseProviderStep({
  selectedProvider,
  validated,
  onSelect,
  onBack,
  onNext,
}) {
  const providers = useMemo(
    () => PICKER_ORDER.map((id) => getProvider(id)).filter(Boolean),
    []
  );

  const statusBadge = (p) => {
    if (validated && selectedProvider === p.id) {
      return (
        <span className="sw2-badge sw2-badge-validated">
          <Icon name="check-circle" size={12} />
          Validated
        </span>
      );
    }
    if (RECOMMENDED_ID === p.id) {
      return <span className="sw2-badge sw2-badge-recommended">Recommended</span>;
    }
    return <span className="sw2-badge sw2-badge-muted">Not Configured</span>;
  };

  return (
    <div className="setup-wizard-card sw2-card">
      <div className="sw2-head">
        <span className="sw2-step-no">2</span>
        <div className="sw2-head-text">
          <h1>Database Provider</h1>
          <p>Choose the database system you want to use for your application.</p>
        </div>
      </div>

      <div className="sw2-body">
        <h2 className="sw2-section-label">Select Database Provider</h2>

        <div className="sw2-grid" role="radiogroup" aria-label="Database provider">
          {providers.map((p) => {
            const selected = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`sw2-provider-card${selected ? ' selected' : ''}`}
                onClick={() => onSelect(p.id)}
              >
                <div className="sw2-provider-card-top">
                  <div
                    className="sw2-provider-logo"
                    style={{ backgroundColor: p.color }}
                    aria-hidden="true"
                  >
                    {p.logo}
                  </div>
                  <div className="sw2-provider-body">
                    <div className="sw2-provider-name">{p.name}</div>
                    <div className="sw2-provider-desc">{p.description}</div>
                  </div>
                  <span className="sw2-select-mark" aria-hidden="true">
                    {selected ? <Icon name="check-circle" size={18} /> : null}
                  </span>
                </div>

                <div className="sw2-provider-card-footer">
                  {statusBadge(p)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="setup-wizard-actions">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!selectedProvider}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
