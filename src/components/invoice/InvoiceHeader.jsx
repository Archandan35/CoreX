import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import Dropdown, { DropdownItem } from '../ui/Dropdown.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { invoiceService } from '../../services/invoice/index.js';

export default function InvoiceHeader({
  prefix, invoiceNumber, onPrefixChange, onInvoiceNumberChange,
  onSave, onDraft, onClear, onSaveAndPrint, onSaveAndShare, onSaveAndNew,
  saving, canSave, title = 'Create Invoice',
  prefixes = []
}) {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const items = prefixes && prefixes.length > 0 ? prefixes : [];

  useEffect(() => {
    invoiceService.getCurrentCompany()
      .then((company) => {
        if (company?.name) setBusinessName(company.name);
      })
      .catch(() => {
        invoiceService.listCompanies().then((list) => {
          if (list.length > 0) setBusinessName(list[0].name || '');
        }).catch(() => {});
      });
  }, []);

  return (
    <section className="inv-topbar-section">
      <header className="inv-topbar">
        <div className="inv-topbar-left">
          <button className="inv-back-btn" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="chevron-left" size={20} />
          </button>
          <div className="inv-topbar-title">
            <h1>{title}</h1>
            <span>{businessName || 'Loading...'}</span>
          </div>
        </div>
        <div className="inv-topbar-right">
          {items.length > 0 && (
            <Dropdown
              trigger={
                <div className="inv-prefix-select">
                  {prefix} <Icon name="chevron-down" size={14} />
                </div>
              }
            >
              <DropdownItem onClick={() => onPrefixChange(prefix)}>{prefix}</DropdownItem>
              {items.filter(p => p.value !== prefix).map(p => (
                <DropdownItem key={p.value} onClick={() => onPrefixChange(p.value)}>{p.label}</DropdownItem>
              ))}
            </Dropdown>
          )}
          <input
            className="inv-number-input"
            type="text"
            value={invoiceNumber}
            onChange={(e) => onInvoiceNumberChange(e.target.value)}
            placeholder="000"
          />
          {onClear && (
            <button className="inv-btn-ghost" onClick={onClear} type="button" style={{ marginRight: 6 }}>
              <Icon name="refresh-cw" size={14} /> Clear
            </button>
          )}
          <PermissionGate permission={PERMISSIONS.INVOICE_CREATE}>
            <button className="inv-btn-save" onClick={onDraft} disabled={!canSave || saving} style={{ marginRight: 6 }}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button className="inv-btn-save" onClick={onSave} disabled={!canSave || saving} style={{ marginRight: 0 }}>
              {saving ? 'Saving...' : 'Save Invoice'}
            </button>
            <Dropdown
              trigger={
                <button className="inv-btn-save inv-btn-save--arrow" disabled={!canSave || saving}
                  style={{ marginLeft: 0, borderLeft: '1px solid rgba(255,255,255,0.2)', padding: '0 8px', minWidth: 0 }}>
                  <Icon name="chevron-down" size={14} />
                </button>
              }
            >
              {(close) => (
                <div style={{ minWidth: 200 }}>
                  <DropdownItem onClick={() => { close(); onSave(); }}>
                    <Icon name="check" size={14} /> Save & Close
                  </DropdownItem>
                  {onSaveAndPrint && (
                    <DropdownItem onClick={() => { close(); onSaveAndPrint(); }}>
                      <Icon name="printer" size={14} /> Save & Print
                    </DropdownItem>
                  )}
                  {onSaveAndShare && (
                    <DropdownItem onClick={() => { close(); onSaveAndShare(); }}>
                      <Icon name="send" size={14} /> Save & Share
                    </DropdownItem>
                  )}
                  {onSaveAndNew && (
                    <DropdownItem onClick={() => { close(); onSaveAndNew(); }}>
                      <Icon name="plus" size={14} /> Save & New
                    </DropdownItem>
                  )}
                </div>
              )}
            </Dropdown>
          </PermissionGate>
        </div>
      </header>
    </section>
  );
}
