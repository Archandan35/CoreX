import { round2 } from '../../business/invoice/calculations.js';

export default function SummaryPanel({ taxableAmount, taxTotal, discountTotal, roundOff, onRoundOff, beforeRound, grandTotal, amountPaid, balanceDue, extraDiscountValue }) {
  return (
    <div className="inv-totals-lines">
      <div className="inv-total-line"><span>Taxable Amount</span><span>₹{round2(taxableAmount)}</span></div>
      <div className="inv-total-line"><span>Total Tax</span><span>₹{round2(taxTotal)}</span></div>
      {Number(discountTotal) > 0 && (
        <div className="inv-total-line"><span>Total Discount</span><span className="summary-amount-positive">-₹{round2(discountTotal)}</span></div>
      )}
      {Number(extraDiscountValue) > 0 && (
        <div className="inv-total-line"><span>Extra Discount</span><span className="summary-amount-positive">-₹{round2(extraDiscountValue)}</span></div>
      )}
      <div className="inv-total-line inv-roundoff-line">
        <span className="inv-roundoff-label">Round Off</span>
        <span className="summary-roundoff-toggle">
          <button className={`inv-switch${roundOff ? ' inv-on' : ''}`} onClick={() => onRoundOff?.(!roundOff)} aria-label="Round Off" />
          ₹{roundOff ? round2(beforeRound - Math.floor(beforeRound)) : '0.00'}
        </span>
      </div>
      <div className="inv-totals-divider" />
      <div className="inv-grand-total">
        <span className="inv-gt-label">Grand Total</span>
        <span className="inv-gt-amount">₹ {round2(grandTotal)}</span>
      </div>
      {Number(amountPaid) > 0 && (
        <div className="inv-total-line"><span>Paid</span><span className="summary-amount-positive">-₹{round2(amountPaid)}</span></div>
      )}
      {Number(balanceDue) > 0 && (
        <div className="inv-total-line summary-balance-due-line">
          <span className="summary-amount-bold">Balance Due</span>
          <span className="summary-amount-bold summary-amount-negative">₹{round2(balanceDue)}</span>
        </div>
      )}
    </div>
  );
}
