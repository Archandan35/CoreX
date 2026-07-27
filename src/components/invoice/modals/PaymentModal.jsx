import { useState } from 'react';
import Modal from '../../ui/Modal.jsx';
import Button from '../../ui/Button.jsx';
import { Field, Input } from '../../ui/Field.jsx';
import Icon from '../../ui/Icon.jsx';
import Dropdown, { DropdownItem } from '../../ui/Dropdown.jsx';
import { PAYMENT_MODE_OPTIONS } from '../../../constants/index.js';

export default function PaymentModal({ open, onClose, payments, onAdd, onRemove, onUpdate, markFullyPaid, onMarkFullyPaid, balanceDue }) {
  const [newPmt, setNewPmt] = useState({ notes: '', amount: 0, paymentDate: new Date().toISOString().split('T')[0], mode: '' });

  const addPayment = () => {
    if (!newPmt.amount || Number(newPmt.amount) <= 0) return;
    onAdd?.({ ...newPmt, amount: Number(newPmt.amount), id: Date.now().toString() });
    setNewPmt({ notes: '', amount: 0, paymentDate: new Date().toISOString().split('T')[0], mode: '' });
  };

  const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, (balanceDue || 0) - totalPaid);

  return (
    <Modal open={open} onClose={onClose} title="Payments" size="md"
      footer={<Button variant="secondary" onClick={onClose}>Done</Button>}
    >
      <div className="payment-header">
        <span className="payment-header-label">Balance Due: <strong>₹{(balanceDue || 0).toFixed(2)}</strong></span>
        <label className="payment-header-checkbox">
          <input type="checkbox" checked={markFullyPaid} onChange={(e) => onMarkFullyPaid?.(e.target.checked)} />
          Mark as fully paid
        </label>
      </div>

      {(payments || []).map((pmt, i) => (
        <div key={pmt.id || i} className="payment-row">
          <input type="text" value={pmt.notes || ''} onChange={(e) => onUpdate?.(i, { ...pmt, notes: e.target.value })} placeholder="Notes" className="payment-row-input" style={{ width: '100%' }} />
          <input type="number" min="0" step="0.01" value={pmt.amount ?? ''} onChange={(e) => onUpdate?.(i, { ...pmt, amount: Number(e.target.value) || 0 })} placeholder="Amount" className="payment-row-amount" />
          <input type="date" value={pmt.paymentDate || ''} onChange={(e) => onUpdate?.(i, { ...pmt, paymentDate: e.target.value })} className="payment-row-date" />
          <Dropdown trigger={<span className="payment-row-mode-trigger">{PAYMENT_MODE_OPTIONS.find(m => m.value === pmt.mode)?.label || 'Mode'} <Icon name="chevron-down" size={10} /></span>}>
            {PAYMENT_MODE_OPTIONS.map(m => (
              <DropdownItem key={m.value} onClick={() => onUpdate?.(i, { ...pmt, mode: m.value })}>{m.label}</DropdownItem>
            ))}
          </Dropdown>
          <button type="button" className="inv-table-remove-btn" onClick={() => onRemove?.(i)} aria-label="Remove"><Icon name="x" size={12} /></button>
        </div>
      ))}

      {(payments || []).length === 0 && (
        <div className="payment-empty-state">No payments added yet.</div>
      )}

      <div className="payment-add-row">
        <input type="text" value={newPmt.notes} onChange={(e) => setNewPmt(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="payment-row-input" style={{ flex: 1 }} />
        <input type="number" min="0" step="0.01" value={newPmt.amount || ''} onChange={(e) => setNewPmt(p => ({ ...p, amount: e.target.value }))} placeholder="Amount" className="payment-row-amount" />
        <input type="date" value={newPmt.paymentDate} onChange={(e) => setNewPmt(p => ({ ...p, paymentDate: e.target.value }))} className="payment-row-date" />
        <Dropdown trigger={<span className="payment-row-mode-trigger">{newPmt.mode ? PAYMENT_MODE_OPTIONS.find(m => m.value === newPmt.mode)?.label : 'Mode'} <Icon name="chevron-down" size={10} /></span>}>
          {PAYMENT_MODE_OPTIONS.map(m => (
            <DropdownItem key={m.value} onClick={() => setNewPmt(p => ({ ...p, mode: m.value }))}>{m.label}</DropdownItem>
          ))}
        </Dropdown>
        <Button variant="secondary" size="sm" icon="plus" onClick={addPayment}>Add</Button>
      </div>

      <div className="payment-summary">
        Total paid: <strong className="payment-summary-paid">₹{totalPaid.toFixed(2)}</strong>
        {remaining > 0 && <> · Remaining: <strong className="payment-summary-remaining">₹{remaining.toFixed(2)}</strong></>}
      </div>
    </Modal>
  );
}
