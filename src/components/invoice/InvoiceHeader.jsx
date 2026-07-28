import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import Dropdown, { DropdownItem } from '../ui/Dropdown.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { INVOICE_PREFIXES } from '../../constants/index.js';

export default function InvoiceHeader({
  prefix, invoiceNumber, onPrefixChange, onInvoiceNumberChange,
  onSave, onDraft,
  saving, canSave, title = 'Create Invoice',
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
            <h1>{title}</h1>
            <span>MARUF DRESSES</span>
          </div>
        </div>
        <div className="inv-topbar-right">
          <Dropdown
            trigger={
              <div className="inv-prefix-select">
                {prefix} <Icon name="chevron-down" size={14} />
              </div>
            }
          >
            <DropdownItem onClick={() => onPrefixChange(prefix)}>{prefix}</DropdownItem>
            {INVOICE_PREFIXES.filter(p => p.value !== prefix).map(p => (
              <DropdownItem key={p.value} onClick={() => onPrefixChange(p.value)}>{p.label}</DropdownItem>
            ))}
          </Dropdown>
          <input
            className="inv-number-input"
            type="text"
            value={invoiceNumber}
            onChange={(e) => onInvoiceNumberChange(e.target.value)}
            placeholder="000"
          />
          <PermissionGate permission={PERMISSIONS.INVOICE_CREATE}>
            <button className="inv-btn-save" onClick={onDraft} disabled={!canSave || saving} style={{ marginRight: 6 }}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
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