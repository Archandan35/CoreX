import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import Badge from '../ui/Badge.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

export default function InvoiceHeader({
  prefix, invoiceNumber, onPrefixChange, onInvoiceNumberChange,
  numberUnique, onSave, onDraft, onOpenHeaders, onOpenSettings,
  saving, canSave,
}) {
  const navigate = useNavigate();

  return (
    <section className="inv-topbar-section">
      <header className="inv-topbar">
        <div className="inv-topbar-left">
          <button className="inv-back-btn" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="chevron-left" size={20} />
          </button>
          <div className="inv-topbar-title">
            <h1>Create Invoice</h1>
            <span>MARUF DRESSES</span>
          </div>
        </div>
        <div className="inv-topbar-right">
          <div className="inv-prefix-select" onClick={() => {}}>
            {prefix} <Icon name="chevron-down" size={14} />
          </div>
          <input
            className="inv-number-input"
            type="text"
            value={invoiceNumber}
            onChange={(e) => onInvoiceNumberChange(e.target.value)}
            placeholder="000"
          />
          <PermissionGate permission={PERMISSIONS.INVOICE_CREATE}>
            <button className="inv-btn-save" onClick={onSave} disabled={!canSave || saving}>
              {saving ? 'Saving...' : 'Save Invoice'}
              <Icon name="arrow-right" size={14} />
            </button>
          </PermissionGate>
        </div>
      </header>
    </section>
  );
}