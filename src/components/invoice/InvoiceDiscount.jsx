import { useState } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Icon from '../ui/Icon.jsx';
import Modal from '../ui/Modal.jsx';
import Toggle from '../ui/Toggle.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import { DISCOUNT_TYPE } from '../../constants/index.js';
import { round2 } from '../../business/invoice/calculations.js';

export default function InvoiceDiscount({
  extraDiscountType,
  extraDiscountValue,
  onExtraDiscountType,
  onExtraDiscountValue,
  additionalCharges,
  onAddCharge,
  onRemoveCharge,
  onUpdateCharge,
  subtotal,
  lineDiscountTotal,
  invoiceDiscount,
  discountTotal,
}) {
  const [showChargesModal, setShowChargesModal] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  return (
    <Card className="inv-card">
      <div className="inv-discount-area">
        <div className="inv-discount-row">
          <Toggle
            checked={showDiscountInput}
            onChange={setShowDiscountInput}
            label="Apply Discount"
          />
          <span className="inv-discount-label">Apply Discount (%)</span>
        </div>

        {showDiscountInput && (
          <div className="inv-discount-row inv-discount-row--input">
            <Select
              options={[
                { value: DISCOUNT_TYPE.PERCENT, label: 'Percentage (%)' },
                { value: DISCOUNT_TYPE.FIXED, label: 'Fixed Amount' },
              ]}
              value={extraDiscountType || DISCOUNT_TYPE.PERCENT}
              onChange={onExtraDiscountType}
              className="inv-discount-select"
            />
            <Input
              type="number"
              min="0"
              step="any"
              value={extraDiscountValue ?? ''}
              onChange={(e) => onExtraDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={extraDiscountType === DISCOUNT_TYPE.FIXED ? '0.00' : '0'}
              className="inv-discount-input"
            />
          </div>
        )}

        <div className="inv-discount-charges">
          <Button variant="secondary" icon="plus" onClick={() => setShowChargesModal(true)}>
            Additional Charges
          </Button>
        </div>

        <div className="inv-discount-summary">
          <div className="inv-discount-summary-row">
            <span>Subtotal</span>
            <span>{round2(subtotal)}</span>
          </div>
          {lineDiscountTotal > 0 && (
            <div className="inv-discount-summary-row">
              <span>Line Discounts</span>
              <span>-{round2(lineDiscountTotal)}</span>
            </div>
          )}
          {invoiceDiscount > 0 && (
            <div className="inv-discount-summary-row">
              <span>Extra Discount</span>
              <span>-{round2(invoiceDiscount)}</span>
            </div>
          )}
          {additionalCharges.length > 0 && (
            <div className="inv-discount-summary-row">
              <span>Additional Charges</span>
              <span>{round2(additionalCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0))}</span>
            </div>
          )}
        </div>
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
              className="inv-charge-input"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={c.amount ?? ''}
              onChange={(e) => onUpdateCharge(i, { ...c, amount: Number(e.target.value) || 0 })}
              placeholder="Amount"
              className="inv-charge-input inv-charge-input--sm"
            />
            <Checkbox
              checked={!!c.taxable}
              onChange={(v) => onUpdateCharge(i, { ...c, taxable: v })}
              label="Taxable"
            />
            <button type="button" className="inv-chip__remove" onClick={() => onRemoveCharge(i)} aria-label="Remove charge">
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
        {additionalCharges.length === 0 && (
          <p className="inv-charge-empty">No additional charges added.</p>
        )}
        <div className="inv-charge-add">
          <Button variant="secondary" icon="plus" onClick={() => onAddCharge({ label: '', amount: 0, taxable: true })}>
            Add Charge
          </Button>
        </div>
      </Modal>
    </Card>
  );
}