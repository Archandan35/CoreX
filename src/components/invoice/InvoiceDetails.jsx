import { useMemo } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Search from '../ui/Search.jsx';
import Dropdown, { DropdownItem } from '../ui/Dropdown.jsx';
import { Field, Input } from '../ui/Field.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import Icon from '../ui/Icon.jsx';
import CustomerModal from './CustomerModal.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

// Invoice details: customer live search + select + auto-fill, create/edit
// customer modal, invoice date, due date (auto from offset), reference.
export default function InvoiceDetails({
  customers,
  customerQuery,
  onCustomerQuery,
  selectedCustomer,
  onSelectCustomer,
  onEditCustomer,
  invoiceDate,
  dueDate,
  onInvoiceDate,
  onDueDate,
  reference,
  onReference,
  dueDateOffset,
  onAutoDueDate,
  customerModal,
  onOpenCreateCustomer,
  onCloseCustomerModal,
  onSubmitCustomer,
  errors,
}) {
  const debounced = useDebounce(customerQuery, 300);
  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((c) =>
      [c.name, c.company, c.email, c.phone, c.gstin].some((v) => v?.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [customers, debounced]);

  return (
    <Card className="inv-card">
      <div className="inv-grid-2">
        <Field label="Customer" required>
          <div className="inv-customer-row">
            <Dropdown
              trigger={
                <div className="inv-customer-trigger">
                  <Search
                    value={customerQuery}
                    onChange={onCustomerQuery}
                    placeholder="Search customer by name, phone, GSTIN..."
                    className="inv-customer-search"
                  />
                  <Icon name="chevron-down" size={16} className="inv-customer-caret" />
                </div>
              }
            >
              {(close) => (
                <div className="inv-customer-menu">
                  {filtered.length === 0 && (
                    <div className="inv-customer-empty">No customers found</div>
                  )}
                  {filtered.map((c) => (
                    <DropdownItem key={c.id} onClick={() => { close(); onSelectCustomer(c); }}>
                      <div className="inv-customer-option">
                        <span className="inv-customer-option__name">{c.name}</span>
                        <span className="inv-customer-option__meta">
                          {[c.company, c.phone, c.gstin].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    </DropdownItem>
                  ))}
                </div>
              )}
            </Dropdown>
            <PermissionGate permission={PERMISSIONS.CUSTOMER_CREATE}>
              <Button variant="secondary" icon="user-plus" onClick={onOpenCreateCustomer}>
                Create
              </Button>
            </PermissionGate>
          </div>

          {selectedCustomer && (
            <div className="inv-customer-card">
              <div className="inv-customer-card__head">
                <strong>{selectedCustomer.name}</strong>
                <PermissionGate permission={PERMISSIONS.CUSTOMER_UPDATE}>
                  <button type="button" className="inv-link" onClick={onEditCustomer}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                </PermissionGate>
              </div>
              <div className="inv-customer-card__body">
                {selectedCustomer.company && <span>{selectedCustomer.company}</span>}
                {selectedCustomer.email && <span>{selectedCustomer.email}</span>}
                {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                {selectedCustomer.gstin && <span>GSTIN: {selectedCustomer.gstin}</span>}
                {selectedCustomer.billing_address && <span>{selectedCustomer.billing_address}</span>}
              </div>
            </div>
          )}
          {errors?.customer && <span className="inv-field-error">{errors.customer}</span>}
        </Field>

        <div className="inv-grid-3">
          <Field label="Invoice Date" required>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => { onInvoiceDate(e.target.value); onAutoDueDate(e.target.value); }}
            />
          </Field>
          <Field label={`Due Date${dueDateOffset ? ` (auto +${dueDateOffset}d)` : ''}`}>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => onDueDate(e.target.value)}
              aria-invalid={!!errors?.dueDate}
              className={errors?.dueDate ? 'form-input--error' : ''}
            />
            {errors?.dueDate && <span className="inv-field-error">{errors.dueDate}</span>}
          </Field>
          <Field label="Reference">
            <Input
              value={reference}
              onChange={(e) => onReference(e.target.value)}
              placeholder="PO / reference no."
            />
          </Field>
        </div>
      </div>

      <CustomerModal
        open={customerModal.open}
        mode={customerModal.mode}
        initial={customerModal.customer}
        onClose={onCloseCustomerModal}
        onSubmit={onSubmitCustomer}
      />
    </Card>
  );
}
