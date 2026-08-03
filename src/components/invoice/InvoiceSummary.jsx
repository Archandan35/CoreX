import { round2 } from '../../business/invoice/calculations.js';
import Icon from '../ui/Icon.jsx';
import Dropdown, { DropdownItem } from '../ui/Dropdown.jsx';
import { PAYMENT_MODE_OPTIONS } from '../../constants/index.js';

export default function InvoiceSummary({
  enableTds, onTds, enableTcs, onTcs,
  extraDiscountValue, onExtraDiscountValue,
  taxableAmount, taxTotal, discountTotal,
  roundOff, onRoundOff, beforeRound, grandTotal,
  selectedBank, banks, onSelectBank, onAddNewBank,
  payments, onAddPayment, onRemovePayment, onUpdatePayment,
  markFullyPaid, onMarkFullyPaid, _balanceDue,
  signatures, selectedSignature, onSelectSignature, onAddNewSignature,
  sigName,
}) {
  return (
    <section className="inv-totals-card">
      <div className="inv-tds-row">
        <div className="inv-tds-item">
          <button className={`inv-switch${enableTds ? ' inv-on' : ''}`} onClick={() => onTds(!enableTds)} aria-label="TDS" />
          TDS
        </div>
        <div className="inv-tds-item">
          <button className={`inv-switch${enableTcs ? ' inv-on' : ''}`} onClick={() => onTcs(!enableTcs)} aria-label="TCS" />
          TCS
        </div>
      </div>

      <div className="inv-extra-discount-row">
        <Dropdown
          trigger={
            <div className="inv-pill-select">
              Extra Discount <Icon name="chevron-down" size={12} />
            </div>
          }
        >
          <DropdownItem onClick={() => onExtraDiscountValue(extraDiscountValue)}>Extra Discount</DropdownItem>
        </Dropdown>
        <div className="inv-num-select">
          {extraDiscountValue || 0}
        </div>
      </div>

      <div className="inv-totals-lines">
        <div className="inv-total-line"><span>Taxable Amount</span><span>₹{round2(taxableAmount)}</span></div>
        <div className="inv-total-line"><span>Total Tax</span><span>₹{round2(taxTotal)}</span></div>
        <div className="inv-total-line inv-roundoff-line">
          <span className="inv-roundoff-label">Round Off</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className={`inv-switch${roundOff ? ' inv-on' : ''}`} onClick={() => onRoundOff(!roundOff)} aria-label="Round Off" />
            {roundOff ? (() => { const diff = round2(grandTotal - beforeRound); return diff >= 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`; })() : '₹0.00'}
          </span>
        </div>
      </div>

      <div className="inv-totals-divider" />

      <div className="inv-grand-total">
        <span className="inv-gt-label">Total Amount</span>
        <span className="inv-gt-amount">₹ {round2(grandTotal)}</span>
      </div>
      <div className="inv-total-discount-line">
        <span className="inv-label">Total Discount</span><span>₹{round2(discountTotal)}</span>
      </div>

      <div className="inv-panel-section-head">
        <div className="inv-panel-label">Select Bank <Icon name="info" size={13} /></div>
        <button className="inv-panel-add-link" onClick={onAddNewBank}>
          <Icon name="plus" size={12} /> Add New Bank
        </button>
      </div>
      <Dropdown
        trigger={
          <div className="inv-bank-select">
            <div className="inv-bank-left">
              <div className="inv-bank-icon"><Icon name="landmark" size={14} /></div>
              {selectedBank ? `${selectedBank.bank_name} (${selectedBank.account_number?.slice(-4) || '0000'})` : 'Select a bank...'}
            </div>
            <Icon name="chevron-down" size={14} />
          </div>
        }
      >
        {banks.length === 0 && (
          <div style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>No banks found.</div>
        )}
        {banks.map(b => (
          <DropdownItem key={b.id} onClick={() => onSelectBank(b)}>
            {b.bank_name} ({b.account_number?.slice(-4) || '0000'})
          </DropdownItem>
        ))}
      </Dropdown>

      <div className="inv-payment-header">
        <span className="inv-pay-label">Add payment (Payment Notes, Amount and Mode)</span>
        <label className="inv-mark-paid">
          <input type="checkbox" checked={markFullyPaid} onChange={(e) => onMarkFullyPaid(e.target.checked)} />
          Mark as fully paid
        </label>
      </div>

      {payments.map((pmt, i) => (
        <div key={i} className="inv-payment-table" style={{ position: 'relative' }}>
          <div className="inv-pay-headers">
            <span>Notes</span>
            <span>Amount</span>
            <span>Payment Date</span>
            <span>Payment Mode</span>
          </div>
          <div className="inv-pay-inputs">
            <div className="inv-pay-cell">
              <input
                type="text"
                value={pmt.notes || ''}
                onChange={(e) => onUpdatePayment(i, { ...pmt, notes: e.target.value })}
                placeholder="Advance received, UTR number"
              />
            </div>
            <div className="inv-pay-cell">
              <input
                type="number"
                min="0"
                step="0.01"
                value={pmt.amount ?? ''}
                onChange={(e) => onUpdatePayment(i, { ...pmt, amount: Number(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="inv-pay-cell" style={{ position: 'relative' }}>
              <span>{pmt.paymentDate || 'Select date'}</span>
              <input
                type="date"
                value={pmt.paymentDate || ''}
                onChange={(e) => onUpdatePayment(i, { ...pmt, paymentDate: e.target.value })}
                style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', left: 0, top: 0, cursor: 'pointer' }}
              />
              <Icon name="calendar" size={14} />
            </div>
            <div className="inv-pay-cell" style={{ cursor: 'pointer' }}>
              <Dropdown
                trigger={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                    <span className="inv-pay-placeholder">{pmt.mode ? PAYMENT_MODE_OPTIONS.find(m => m.value === pmt.mode)?.label || pmt.mode : 'Select mode'}</span>
                    <Icon name="chevron-down" size={14} />
                  </div>
                }
              >
                {PAYMENT_MODE_OPTIONS.map(m => (
                  <DropdownItem key={m.value} onClick={() => onUpdatePayment(i, { ...pmt, mode: m.value })}>{m.label}</DropdownItem>
                ))}
              </Dropdown>
            </div>
          </div>
          <button
            type="button"
            className="inv-table-remove-btn"
            onClick={() => onRemovePayment(i)}
            aria-label="Remove payment"
            style={{ position: 'absolute', top: 4, right: 4 }}
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}

      {payments.length === 0 && (
        <div className="inv-payment-table">
          <div className="inv-pay-headers">
            <span>Notes</span>
            <span>Amount</span>
            <span>Payment Date</span>
            <span>Payment Mode</span>
          </div>
          <div className="inv-pay-inputs">
            <div className="inv-pay-cell"><input type="text" placeholder="Advance received, UTR number" /></div>
            <div className="inv-pay-cell"><input type="text" value="0" readOnly /></div>
            <div className="inv-pay-cell" style={{ position: 'relative' }}>
              <span>{new Date().toLocaleDateString('en-GB')}</span>
              <Icon name="calendar" size={14} />
            </div>
            <div className="inv-pay-cell" style={{ cursor: 'pointer' }}>
              <span className="inv-pay-placeholder">Select mode</span>
              <Icon name="chevron-down" size={14} />
            </div>
          </div>
        </div>
      )}

      {selectedBank && (
        <div className="inv-bank-tag-row">
          <div className="inv-bank-tag">
            {selectedBank.bank_name}...
          </div>
        </div>
      )}

      <button className="inv-split-payment-link" onClick={onAddPayment}>
        <Icon name="plus" size={12} /> Split Payment
      </button>

      <div className="inv-signature-head">
        <div className="inv-sig-label">
          Select Signature <span className="inv-sig-required-dot" />
        </div>
        <button className="inv-panel-add-link" onClick={onAddNewSignature}>
          <Icon name="plus" size={12} /> Add New Signature
        </button>
      </div>
      <div className="inv-signature-grid">
        <Dropdown
          trigger={
            <div className="inv-sig-select">
              {selectedSignature?.name || 'No Signature'}
              <Icon name="chevron-down" size={14} />
            </div>
          }
        >
          {signatures.length === 0 && (
            <div style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>No signatures found.</div>
          )}
          {signatures.map(s => (
            <DropdownItem key={s.id} onClick={() => onSelectSignature(s)}>{s.name}</DropdownItem>
          ))}
        </Dropdown>
        <div className="inv-sig-preview">
          <div className="inv-sig-cap">Signature on the document</div>
          <div className="inv-sig-box">
            <span>{sigName || 'Signature'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}