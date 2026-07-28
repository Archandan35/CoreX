import { useEffect, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { validateCustomer } from '../../business/invoice/validation.js';

const EMPTY = { name: '', company: '', email: '', phone: '', gstin: '', state: '', city: '', postal_code: '', billing_address: '' };

export default function AddCustomerPanel({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setErrors({});
    }
  }, [open]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateCustomer(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await onSubmit(form);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="ds-overlay" onClick={onClose}>
      <div className="ds-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ds-header">
          <div className="ds-header-left">
            <button className="ds-close-btn" onClick={onClose}><Icon name="x" size={18} /></button>
            <h2>Add Customer</h2>
          </div>
          <button type="submit" form="acp-form" className="ds-btn ds-btn-primary" disabled={busy}>
            {busy ? 'Creating...' : 'Create Customer'}
          </button>
        </div>

        <div className="ds-body">
          <form id="acp-form" onSubmit={submit} className="inv-modal-form">
            <Field label="Customer Name" required>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Acme Pvt Ltd" aria-invalid={!!errors.name} />
              {errors.name && <span className="inv-field-error">{errors.name}</span>}
            </Field>
            <div className="inv-modal-row">
              <Field label="Company">
                <Input value={form.company} onChange={set('company')} placeholder="Company name" />
              </Field>
              <Field label="GSTIN">
                <Input value={form.gstin} onChange={set('gstin')} placeholder="15-digit GSTIN" aria-invalid={!!errors.gstin} />
                {errors.gstin && <span className="inv-field-error">{errors.gstin}</span>}
              </Field>
            </div>
            <div className="inv-modal-row">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" aria-invalid={!!errors.email} />
                {errors.email && <span className="inv-field-error">{errors.email}</span>}
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={set('phone')} placeholder="Phone number" aria-invalid={!!errors.phone} />
                {errors.phone && <span className="inv-field-error">{errors.phone}</span>}
              </Field>
            </div>
            <div className="inv-modal-row inv-modal-row-3">
              <Field label="State">
                <Input value={form.state} onChange={set('state')} placeholder="State" />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={set('city')} placeholder="City" />
              </Field>
              <Field label="Postal Code">
                <Input value={form.postal_code} onChange={set('postal_code')} placeholder="PIN" />
              </Field>
            </div>
            <Field label="Billing Address">
              <Input value={form.billing_address} onChange={set('billing_address')} placeholder="Billing address" />
            </Field>
          </form>
        </div>

        <div className="ds-footer">
          <button type="submit" form="acp-form" className="ds-btn ds-btn-primary" disabled={busy}>
            {busy ? 'Creating...' : 'Create Customer'}
          </button>
          <button className="ds-btn ds-btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
