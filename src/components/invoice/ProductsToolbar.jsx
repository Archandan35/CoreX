import { useState } from 'react';
import Icon from '../ui/Icon.jsx';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import Dropdown, { DropdownItem } from '../ui/Dropdown.jsx';
import { round2 } from '../../business/invoice/calculations.js';
import { DISCOUNT_TYPE } from '../../constants/index.js';

export default function ProductsToolbar({
  category, onCategory, categories,
  productQuery, onProductQuery, products, qty, onQty,
  onAddProduct, onCreateProduct, showDescription, onToggleShowDescription,
  onDraftWithAI, aiBusy, disabledAdd, onAddNewProduct,
}) {
  return (
    <>
      <div className="inv-ps-head">
        <div className="inv-ps-title">
          Products &amp; Services <Icon name="info" size={14} />
        </div>
        <div className="inv-ps-head-right">
          <button className="inv-link-action" onClick={onAddNewProduct} style={{ marginRight: 12 }}>
            <Icon name="plus" size={14} /> Add Product
          </button>
          <label className="inv-checkbox-label">
            <input type="checkbox" checked={showDescription} onChange={(e) => onToggleShowDescription(e.target.checked)} />
            Show description
          </label>
          <button className="inv-icon-btn" onClick={onCreateProduct} aria-label="Settings">
            <Icon name="sliders-horizontal" size={14} />
          </button>
        </div>
      </div>

      <div className="inv-ps-controls">
        <Dropdown
          trigger={
            <div className="inv-select-field inv-category">
              {category ? categories.find(c => String(c.id) === String(category))?.name || 'Filter Category' : 'Filter Category'}
              <Icon name="chevron-down" size={14} />
            </div>
          }
        >
          <DropdownItem onClick={() => onCategory('')}>All Categories</DropdownItem>
          {categories.map(c => (
            <DropdownItem key={c.id} onClick={() => onCategory(c.id)}>{c.name}</DropdownItem>
          ))}
        </Dropdown>
        <div className="inv-ps-search">
          <Icon name="search" size={14} />
          <input
            type="text"
            value={productQuery}
            onChange={(e) => onProductQuery(e.target.value)}
            placeholder="Search or scan barcode for existing products"
          />
        </div>
        <input
          type="number"
          min="1"
          step="1"
          className="inv-qty-field"
          value={qty}
          onChange={(e) => onQty(Number(e.target.value) || 1)}
          placeholder="Qty"
        />
        <button className="inv-btn-fill" onClick={onAddProduct} disabled={disabledAdd}>
          <Icon name="plus" size={14} /> Add to Bill
        </button>
        <button className="inv-btn-ai" onClick={onDraftWithAI} disabled={aiBusy}>
          <Icon name="sparkles" size={14} /> Create Invoices with AI
          <span className="inv-beta-badge">BETA</span>
        </button>
      </div>
    </>
  );
}

export function InvoiceDiscount({
  items, extraDiscountType, extraDiscountValue,
  onExtraDiscountType, onExtraDiscountValue,
  additionalCharges, onAddCharge, onRemoveCharge, onUpdateCharge,
  subtotal, lineDiscountTotal, invoiceDiscount,
}) {
  const [showChargesModal, setShowChargesModal] = useState(false);
  const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  return (
    <div className="inv-ps-footer">
      <div className="inv-discount-block">
        <span className="inv-discount-label">
          Apply discount(%) to all items <Icon name="info" size={13} />
        </span>
        <div className="inv-discount-input-wrap">
          <input
            type="number"
            min="0"
            step="any"
            value={extraDiscountValue ?? ''}
            onChange={(e) => onExtraDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
          />
          <span className="inv-discount-suffix">%</span>
        </div>
      </div>
      <div className="inv-ps-footer-right">
        <div className="inv-items-summary">Items: {items.length}, Qty: {totalQty.toFixed(3)}</div>
        <button className="inv-btn-add-charges" onClick={() => setShowChargesModal(true)}>
          <Icon name="plus-circle" size={14} /> Additional Charges
        </button>
      </div>

      <Modal
        open={showChargesModal}
        onClose={() => setShowChargesModal(false)}
        title="Additional Charges"
        size="md"
        footer={<Button variant="secondary" onClick={() => setShowChargesModal(false)}>Done</Button>}
      >
        {additionalCharges.map((c, i) => (
          <div key={i} className="inv-charge-row">
            <Input
              value={c.label || ''}
              onChange={(e) => onUpdateCharge(i, { ...c, label: e.target.value })}
              placeholder="Charge name"
              style={{ flex: 1 }}
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={c.amount ?? ''}
              onChange={(e) => onUpdateCharge(i, { ...c, amount: Number(e.target.value) || 0 })}
              placeholder="Amount"
              style={{ width: 100 }}
            />
            <Checkbox
              checked={!!c.taxable}
              onChange={(v) => onUpdateCharge(i, { ...c, taxable: v })}
              label="Taxable"
            />
            <button type="button" className="inv-table-remove-btn" onClick={() => onRemoveCharge(i)} aria-label="Remove">
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
        {additionalCharges.length === 0 && (
          <div className="inv-charge-empty">No additional charges added.</div>
        )}
        <div className="inv-charge-add">
          <Button variant="secondary" icon="plus" onClick={() => onAddCharge({ label: '', amount: 0, taxable: true })}>
            Add Charge
          </Button>
        </div>
      </Modal>
    </div>
  );
}