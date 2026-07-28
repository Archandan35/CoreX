import { useMemo } from 'react';
import Icon from '../ui/Icon.jsx';
import Search from '../ui/Search.jsx';
import Dropdown, { DropdownItem } from '../ui/Dropdown.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

export default function InvoiceDetails({
  customers, customerQuery, onCustomerQuery, selectedCustomer,
  onSelectCustomer, onEditCustomer, invoiceDate, dueDate,
  onInvoiceDate, onDueDate, reference, onReference, dueDateOffset,
  onAutoDueDate, onOpenCreateCustomer, errors,
}) {
  const debounced = useDebounce(customerQuery, 300);
  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((c) =>
      [c.name, c.company, c.email, c.phone, c.gstin].some((v) => v?.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [customers, debounced]);

  const bal = Number(selectedCustomer?.outstanding_balance) || 0;
  const limit = Number(selectedCustomer?.credit_limit) || 0;

  return (
    <section className="inv-card inv-customer-card-layout">
      <div className="inv-customer-left">
        <div className="inv-row-head">
          <h2>Select Customer</h2>
          <PermissionGate permission={PERMISSIONS.CUSTOMER_CREATE}>
            <a className="inv-create-customer-link" onClick={onOpenCreateCustomer}>
              + Create Customer
            </a>
          </PermissionGate>
        </div>

        <Dropdown
          trigger={
            <div className="inv-search-input-wrap">
              <Icon name="search" size={14} />
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => onCustomerQuery(e.target.value)}
                placeholder="Search customers by name, company, GSTIN, tags..."
              />
            </div>
          }
        >
          {(close) => (
            <div style={{ minWidth: 280, maxHeight: 260, overflowY: 'auto' }}>
              {filtered.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: 'var(--inv-text-sub)' }}>
                  No customers found
                </div>
              )}
              {filtered.map((c) => (
                <DropdownItem key={c.id} onClick={() => { close(); onSelectCustomer(c); }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--inv-text-main)' }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--inv-text-sub)' }}>
                      {[c.company, c.phone, c.gstin].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </DropdownItem>
              ))}
            </div>
          )}
        </Dropdown>

        {selectedCustomer && (
          <div className="inv-selected-customer">
            <span className="inv-cust-name">{selectedCustomer.name}</span>
            <PermissionGate permission={PERMISSIONS.CUSTOMER_UPDATE}>
              <button className="inv-cust-edit" onClick={onEditCustomer}>
                <Icon name="edit" size={12} /> Edit
              </button>
            </PermissionGate>
          </div>
        )}
        {selectedCustomer && (
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--inv-text-sub)' }}>
            {bal > 0 && <span style={{ color: 'var(--inv-red-dot)' }}>Due: ₹{bal.toFixed(2)}</span>}
            {!!limit && <span>Limit: ₹{limit.toFixed(2)}</span>}
            {limit > 0 && bal >= limit && (
              <span style={{ color: 'var(--inv-red-dot)', fontWeight: 600 }}>Credit limit reached!</span>
            )}
          </div>
        )}
        {errors?.customer && <span className="inv-field-error">{errors.customer}</span>}
      </div>

      <div className="inv-customer-right">
        <div className="inv-field-block">
          <span className="inv-label">Invoice Date</span>
          <div className="inv-date-input" style={{ position: 'relative' }}>
            <span>{invoiceDate || 'Select date'}</span>
            <input
              type="date"
              value={invoiceDate || ''}
              onChange={(e) => { onInvoiceDate(e.target.value); onAutoDueDate(e.target.value); }}
              style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', left: 0, top: 0, cursor: 'pointer' }}
            />
            <Icon name="calendar" size={14} />
          </div>
        </div>
        <div className="inv-field-block">
          <span className="inv-label">Due Date</span>
          <div className="inv-date-input" style={{ position: 'relative' }}>
            <span>{dueDate || 'Select date'}</span>
            <input
              type="date"
              value={dueDate || ''}
              onChange={(e) => onDueDate(e.target.value)}
              style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', left: 0, top: 0, cursor: 'pointer' }}
            />
            <Icon name="calendar" size={14} />
          </div>
          {errors?.dueDate && <span className="inv-field-error">{errors.dueDate}</span>}
        </div>
        <div className="inv-field-block">
          <span className="inv-label">Reference <span className="inv-opt">(Optional)</span></span>
          <div className="inv-text-field">
            <input
              type="text"
              value={reference || ''}
              onChange={(e) => onReference(e.target.value)}
              placeholder="Reference, e.g. PO Number, Sales Person names, Shipment Number etc..."
            />
          </div>
        </div>
      </div>

    </section>
  );
}