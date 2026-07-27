import { useState, useEffect } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import Toggle from '../ui/Toggle.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Icon from '../ui/Icon.jsx';
import { round2 } from '../../business/invoice/calculations.js';
import { DISCOUNT_TYPE } from '../../constants/index.js';

export default function InvoiceSummary({
  enableTds,
  onTds,
  enableTcs,
  onTcs,
  extraDiscountType,
  extraDiscountValue,
  onExtraDiscountType,
  onExtraDiscountValue,
  taxableAmount,
  taxTotal,
  cgst,
  sgst,
  igst,
  discountTotal,
  additionalChargesTotal,
  roundOff,
  onRoundOff,
  beforeRound,
  grandTotal,
}) {
  const [showExtraDiscount, setShowExtraDiscount] = useState(!!extraDiscountValue && extraDiscountValue > 0);

  useEffect(() => {
    if (extraDiscountValue && Number(extraDiscountValue) > 0) setShowExtraDiscount(true);
  }, [extraDiscountValue]);

  return (
    <Card className="inv-card inv-summary-card">
      <div className="inv-summary">
        <div className="inv-summary-toggles">
          <div className="inv-summary-toggle-row">
            <Toggle checked={enableTds} onChange={onTds} label="TDS" />
            <span className="inv-summary-toggle-label">TDS</span>
          </div>
          <div className="inv-summary-toggle-row">
            <Toggle checked={enableTcs} onChange={onTcs} label="TCS" />
            <span className="inv-summary-toggle-label">TCS</span>
          </div>
        </div>

        <div className="inv-summary-discount">
          <span className="inv-summary-discount-label">Extra Discount</span>
          <div className="inv-summary-discount-controls">
            <Select
              options={[
                { value: DISCOUNT_TYPE.PERCENT, label: '%' },
                { value: DISCOUNT_TYPE.FIXED, label: 'Flat' },
              ]}
              value={extraDiscountType || DISCOUNT_TYPE.PERCENT}
              onChange={onExtraDiscountType}
              className="inv-summary-select"
            />
            <Input
              type="number"
              min="0"
              step="any"
              value={extraDiscountValue ?? ''}
              onChange={(e) => onExtraDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="inv-summary-discount-input"
            />
          </div>
        </div>

        <div className="inv-summary-lines">
          <div className="inv-summary-line">
            <span>Taxable Amount</span>
            <span>{round2(taxableAmount)}</span>
          </div>
          {cgst > 0 && (
            <div className="inv-summary-line">
              <span>CGST</span>
              <span>{round2(cgst)}</span>
            </div>
          )}
          {sgst > 0 && (
            <div className="inv-summary-line">
              <span>SGST</span>
              <span>{round2(sgst)}</span>
            </div>
          )}
          {igst > 0 && (
            <div className="inv-summary-line">
              <span>IGST</span>
              <span>{round2(igst)}</span>
            </div>
          )}
          <div className="inv-summary-line">
            <span>Total Tax</span>
            <span>{round2(taxTotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="inv-summary-line">
              <span>Total Discount</span>
              <span>-{round2(discountTotal)}</span>
            </div>
          )}
          {additionalChargesTotal > 0 && (
            <div className="inv-summary-line">
              <span>Additional Charges</span>
              <span>{round2(additionalChargesTotal)}</span>
            </div>
          )}
        </div>

        <div className="inv-summary-roundoff">
          <div className="inv-summary-line">
            <span>Round Off</span>
            <div className="inv-summary-roundoff-control">
              <Toggle checked={roundOff} onChange={onRoundOff} label="Round Off" />
              <span className="inv-summary-roundoff-val">{roundOff ? round2(beforeRound - Math.floor(beforeRound)) : '0.00'}</span>
            </div>
          </div>
        </div>

        <div className="inv-summary-total">
          <span>Total Amount</span>
          <span className="inv-summary-total-val">{round2(grandTotal)}</span>
        </div>
      </div>
    </Card>
  );
}