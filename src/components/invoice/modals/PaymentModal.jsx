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
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>Balance Due: <strong style={{ color: '#0f172a' }}>₹{(balanceDue || 0).toFixed(2)}</strong></span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={markFullyPaid} onChange={(e) => onMarkFullyPaid?.(e.target.checked)} />
          Mark as fully paid
        </label>
      </div>

      {(payments || []).map((pmt, i) => (
        <div key={pmt.id || i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input type="text" value={pmt.notes || ''} onChange={(e) => onUpdate?.(i, { ...pmt, notes: e.target.value })} placeholder="Notes" style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 12, outline: 'none' }} />
          </div>
          <input type="number" min="0" step="0.01" value={pmt.amount ?? ''} onChange={(e) => onUpdate?.(i, { ...pmt, amount: Number(e.target.value) || 0 })} placeholder="Amount" style={{ width: 80, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12, textAlign: 'right' }} />
          <div style={{ position: 'relative' }}>
            <input type="date" value={pmt.paymentDate || ''} onChange={(e) => onUpdate?.(i, { ...pmt, paymentDate: e.target.value })} style={{ width: 100, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12 }} />
          </div>
          <Dropdown trigger={<span style={{ cursor: 'pointer', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{PAYMENT_MODE_OPTIONS.find(m => m.value === pmt.mode)?.label || 'Mode'} <Icon name="chevron-down" size={10} /></span>}>
            {PAYMENT_MODE_OPTIONS.map(m => (
              <DropdownItem key={m.value} onClick={() => onUpdate?.(i, { ...pmt, mode: m.value })}>{m.label}</DropdownItem>
            ))}
          </Dropdown>
          <button type="button" className="inv-table-remove-btn" onClick={() => onRemove?.(i)} aria-label="Remove"><Icon name="x" size={12} /></button>
        </div>
      ))}

      {(payments || []).length === 0 && (
        <div style={{ textAlign: 'center', padding: 16, fontSize: 13, color: '#94a3b8' }}>No payments added yet.</div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, padding: 12, background: '#fff', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
        <input type="text" value={newPmt.notes} onChange={(e) => setNewPmt(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" style={{ flex: 1, border: 'none', fontSize: 12, outline: 'none', background: 'transparent' }} />
        <input type="number" min="0" step="0.01" value={newPmt.amount || ''} onChange={(e) => setNewPmt(p => ({ ...p, amount: e.target.value }))} placeholder="Amount" style={{ width: 80, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12 }} />
        <input type="date" value={newPmt.paymentDate} onChange={(e) => setNewPmt(p => ({ ...p, paymentDate: e.target.value }))} style={{ width: 100, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12 }} />
        <Dropdown trigger={<span style={{ cursor: 'pointer', fontSize: 12, color: '#64748b' }}>{newPmt.mode ? PAYMENT_MODE_OPTIONS.find(m => m.value === newPmt.mode)?.label : 'Mode'} <Icon name="chevron-down" size={10} /></span>}>
          {PAYMENT_MODE_OPTIONS.map(m => (
            <DropdownItem key={m.value} onClick={() => setNewPmt(p => ({ ...p, mode: m.value }))}>{m.label}</DropdownItem>
          ))}
        </Dropdown>
        <Button variant="secondary" size="sm" icon="plus" onClick={addPayment}>Add</Button>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', textAlign: 'right' }}>
        Total paid: <strong style={{ color: '#10b981' }}>₹{totalPaid.toFixed(2)}</strong>
        {remaining > 0 && <> · Remaining: <strong style={{ color: '#ef4444' }}>₹{remaining.toFixed(2)}</strong></>}
      </div>
    </Modal>
  );
}