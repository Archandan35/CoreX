import { round2 } from '../../business/invoice/calculations.js';

export default function SummaryPanel({ taxableAmount, taxTotal, discountTotal, roundOff, onRoundOff, beforeRound, grandTotal, amountPaid, balanceDue, extraDiscountValue }) {
  return (
    <div className="inv-totals-lines">
      <div className="inv-total-line"><span>Taxable Amount</span><span>₹{round2(taxableAmount)}</span></div>
      <div className="inv-total-line"><span>Total Tax</span><span>₹{round2(taxTotal)}</span></div>
      {Number(discountTotal) > 0 && (
        <div className="inv-total-line"><span>Total Discount</span><span style={{ color: '#10b981' }}>-₹{round2(discountTotal)}</span></div>
      )}
      {Number(extraDiscountValue) > 0 && (
        <div className="inv-total-line"><span>Extra Discount</span><span style={{ color: '#10b981' }}>-₹{round2(extraDiscountValue)}</span></div>
      )}
      <div className="inv-total-line inv-roundoff-line">
        <span className="inv-roundoff-label">Round Off</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        <div className="inv-total-line"><span>Paid</span><span style={{ color: '#10b981' }}>-₹{round2(amountPaid)}</span></div>
      )}
      {Number(balanceDue) > 0 && (
        <div className="inv-total-line" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
          <span style={{ fontWeight: 700 }}>Balance Due</span>
          <span style={{ fontWeight: 700, color: '#ef4444' }}>₹{round2(balanceDue)}</span>
        </div>
      )}
    </div>
  );
}