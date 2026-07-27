import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { TAX_RATE_OPTIONS } from '../../constants/index.js';
import { validateProduct } from '../../business/invoice/validation.js';

const EMPTY = { name: '', sku: '', barcode: '', category_id: '', description: '', unit_price: '', tax_rate: '0', unit: '', hsn_code: '', is_service: false };

// Create / edit product. Uses the shared validator; server enforces auth.
export default function ProductModal({ open, mode = 'create', initial, categories, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
      setErrors({});
    }
  }, [open, initial]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateProduct(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await onSubmit(form); } finally { setBusy(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Product' : 'Create Product'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="product-form" loading={busy} icon="package">
            {mode === 'edit' ? 'Save Changes' : 'Create Product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="inv-modal-form">
        <Field label="Product Name" required>
          <Input value={form.name} onChange={set('name')} placeholder="e.g. Web Hosting (1 yr)" aria-invalid={!!errors.name} />
          {errors.name && <span className="inv-field-error">{errors.name}</span>}
        </Field>
        <div className="inv-modal-row inv-modal-row-3">
          <Field label="SKU">
            <Input value={form.sku} onChange={set('sku')} placeholder="SKU" />
          </Field>
          <Field label="Barcode">
            <Input value={form.barcode} onChange={set('barcode')} placeholder="Barcode" />
          </Field>
          <Field label="HSN/SAC">
            <Input value={form.hsn_code} onChange={set('hsn_code')} placeholder="HSN code" />
          </Field>
        </div>
        <div className="inv-modal-row inv-modal-row-3">
          <Field label="Category">
            <Select
              options={[{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              value={form.category_id}
              onChange={(v) => setForm((p) => ({ ...p, category_id: v }))}
            />
          </Field>
          <Field label="Unit Price" required>
            <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={set('unit_price')} placeholder="0.00" aria-invalid={!!errors.unitPrice} />
            {errors.unitPrice && <span className="inv-field-error">{errors.unitPrice}</span>}
          </Field>
          <Field label="GST Rate (%)">
            <Select
              options={TAX_RATE_OPTIONS.map((r) => ({ value: String(r), label: `${r}%` }))}
              value={String(form.tax_rate)}
              onChange={(v) => setForm((p) => ({ ...p, tax_rate: v }))}
            />
          </Field>
        </div>
        <Field label="Description">
          <Input value={form.description} onChange={set('description')} placeholder="Optional description" />
        </Field>
      </form>
    </Modal>
  );
}
