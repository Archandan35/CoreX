import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import Badge from '../ui/Badge.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import Icon from '../ui/Icon.jsx';
import { Input } from '../ui/Field.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { INVOICE_PREFIXES } from '../../constants/index.js';

// Top header bar: back, title, company, editable prefix + invoice number with
// uniqueness check, custom headers / settings actions, and Save buttons.
// Every protected control is gated; invoice-number uniqueness is verified via
// the service layer (server enforces the unique constraint as backstop).
export default function InvoiceHeader({
  companyName,
  prefix,
  invoiceNumber,
  onPrefixChange,
  onInvoiceNumberChange,
  onCheckNumberUnique,
  numberUnique,
  onSave,
  onDraft,
  onOpenHeaders,
  onOpenSettings,
  saving,
  canSave,
}) {
  const navigate = useNavigate();
  const [touched, setTouched] = useState(false);

  useEffect(() => { setTouched(true); }, [invoiceNumber]);

  const numberError = touched && !numberUnique ? 'Invoice number already exists' : '';

  return (
    <div className="inv-header">
      <div className="inv-header__left">
        <button
          type="button"
          className="inv-back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <Icon name="arrow-left" size={18} />
        </button>
        <div className="inv-header__title">
          <h1>Create Invoice</h1>
          {companyName && <span className="inv-header__company">{companyName}</span>}
        </div>
      </div>

      <div className="inv-header__center">
        <div className="inv-header__prefix">
          <Select
            aria-label="Invoice prefix"
            options={INVOICE_PREFIXES}
            value={prefix}
            onChange={onPrefixChange}
          />
        </div>
        <div className="inv-header__number">
          <Input
            value={invoiceNumber}
            onChange={(e) => onInvoiceNumberChange(e.target.value)}
            onBlur={onCheckNumberUnique}
            placeholder="Invoice number"
            aria-label="Invoice number"
            aria-invalid={!!numberError}
            className={numberError ? 'form-input--error' : ''}
          />
          {numberError && <span className="inv-field-error">{numberError}</span>}
        </div>
      </div>

      <div className="inv-header__right">
        <button type="button" className="inv-header__action" onClick={onOpenHeaders}>
          <Icon name="clipboard-list" size={16} />
          <span>Custom Headers</span>
        </button>
        <button type="button" className="inv-header__action" onClick={onOpenSettings} aria-label="Invoice settings">
          <Icon name="gear" size={16} />
        </button>
        <Button variant="secondary" onClick={onDraft} loading={saving} disabled={!canSave}>
          Save Draft
        </Button>
        <PermissionGate permission={PERMISSIONS.INVOICE_CREATE}>
          <Button icon="save" onClick={onSave} loading={saving} disabled={!canSave}>
            Save Invoice
          </Button>
        </PermissionGate>
        <Badge variant="primary" size="md">New</Badge>
      </div>
    </div>
  );
}
