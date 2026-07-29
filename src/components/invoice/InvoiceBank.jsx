import { useState, useEffect } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Icon from '../ui/Icon.jsx';
import Modal from '../ui/Modal.jsx';
import { PAYMENT_MODE_OPTIONS } from '../../constants/index.js';
import { round2 } from '../../business/invoice/calculations.js';
import { validateBank } from '../../business/invoice/validation.js';

export default function InvoiceBank({
  banks,
  selectedBank,
  onSelectBank,
  onAddBank,
  onEditBank,
  onDeleteBank,
  payments,
  onAddPayment,
  onRemovePayment,
  onUpdatePayment,
  markFullyPaid,
  onMarkFullyPaid,
  grandTotal,
  balanceDue,
}) {
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', ifsc: '', branch: '', upi_id: '' });
  const [bankErrors, setBankErrors] = useState({});
  const [editingBank, setEditingBank] = useState(null);
  const [showSplitModal, setShowSplitModal] = useState(false);

  const openNewBank = () => {
    setEditingBank(null);
    setBankForm({ bank_name: '', account_number: '', ifsc: '', branch: '', upi_id: '' });
    setBankErrors({});
    setShowBankModal(true);
  };

  const openEditBank = (bank) => {
    setEditingBank(bank);
    setBankForm({ ...bank });
    setBankErrors({});
    setShowBankModal(true);
  };

  const submitBank = async () => {
    const errs = validateBank(bankForm);
    setBankErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      if (editingBank) await onEditBank(editingBank.id, bankForm);
      else await onAddBank(bankForm);
      setShowBankModal(false);
    } catch {}
  };

  return (
    <Card className="inv-card">
      <div className="inv-bank-section">
        <div className="inv-bank-selector">
          <Field label="Select Bank">
            <div className="inv-bank-row">
              <Select
                options={[
                  { value: '', label: 'Select a bank...' },
                  ...banks.map((b) => ({
                    value: b.id,
                    label: `${b.bank_name}${b.account_number ? ` - ${b.account_number}` : ''}`,
                  })),
                ]}
                value={selectedBank?.id || ''}
                onChange={(val) => onSelectBank(banks.find((b) => b.id === val) || null)}
              />
              <Button variant="secondary" icon="plus" onClick={openNewBank}>Add New Bank</Button>
            </div>
          </Field>
          {selectedBank && (
            <div className="inv-bank-details">
              <span className="inv-bank-name">{selectedBank.bank_name}</span>
              {selectedBank.account_number && <span>A/C: {selectedBank.account_number}</span>}
              {selectedBank.ifsc && <span>IFSC: {selectedBank.ifsc}</span>}
              <button type="button" className="inv-link" onClick={() => openEditBank(selectedBank)}>
                <Icon name="edit" size={14} /> Edit
              </button>
            </div>
          )}
        </div>

        <div className="inv-payment-section">
          <h4 className="inv-payment-title">Payment</h4>

          {payments.map((pmt, i) => (
            <div key={i} className="inv-payment-row">
              <Input
                value={pmt.notes || ''}
                onChange={(e) => onUpdatePayment(i, { ...pmt, notes: e.target.value })}
                placeholder="Notes"
                className="inv-payment-input"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={pmt.amount ?? ''}
                onChange={(e) => onUpdatePayment(i, { ...pmt, amount: Number(e.target.value) || 0 })}
                placeholder="Amount"
                className="inv-payment-input inv-payment-input--sm"
              />
              <Input
                type="date"
                value={pmt.paymentDate || ''}
                onChange={(e) => onUpdatePayment(i, { ...pmt, paymentDate: e.target.value })}
                className="inv-payment-input inv-payment-input--sm"
              />
              <Select
                options={PAYMENT_MODE_OPTIONS}
                value={pmt.mode || ''}
                onChange={(v) => onUpdatePayment(i, { ...pmt, mode: v })}
                className="inv-payment-input inv-payment-input--sm"
              />
              <button type="button" className="inv-chip__remove" onClick={() => onRemovePayment(i)} aria-label="Remove payment">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}

          {payments.length === 0 && (
            <div className="inv-payment-empty">No payments recorded</div>
          )}

          <div className="inv-payment-actions">
            <div className="inv-payment-mark">
              <span className="inv-payment-mark-label">Mark as Fully Paid</span>
              <input
                type="checkbox"
                checked={markFullyPaid}
                onChange={(e) => onMarkFullyPaid(e.target.checked)}
                className="inv-payment-checkbox"
              />
            </div>
            <Button variant="secondary" icon="split" onClick={() => setShowSplitModal(true)}>
              Split Payment
            </Button>
          </div>

          {payments.length > 0 && (
            <div className="inv-payment-totals">
              <div className="inv-payment-balance">
                <span>Paid: {round2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0))}</span>
                <span>Balance: {round2(balanceDue)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        title="Split Payment"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSplitModal(false)}>Cancel</Button>
            <Button icon="split" onClick={() => { setShowSplitModal(false); }}>Done</Button>
          </>
        }
      >
        <div className="inv-modal-form">
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--inv-text-sub)' }}>
            Split the balance of {round2(balanceDue)} across multiple payment modes.
          </p>
          {payments.map((pmt, i) => (
            <div key={i} className="inv-payment-row" style={{ marginBottom: 8 }}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={pmt.amount ?? ''}
                onChange={(e) => onUpdatePayment(i, { ...pmt, amount: Number(e.target.value) || 0 })}
                placeholder="Amount"
                className="inv-payment-input"
              />
              <Select
                options={PAYMENT_MODE_OPTIONS}
                value={pmt.mode || ''}
                onChange={(v) => onUpdatePayment(i, { ...pmt, mode: v })}
                className="inv-payment-input inv-payment-input--sm"
              />
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={showBankModal}
        onClose={() => setShowBankModal(false)}
        title={editingBank ? 'Edit Bank' : 'Add New Bank'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBankModal(false)}>Cancel</Button>
            <Button icon="building" onClick={submitBank}>
              {editingBank ? 'Save Changes' : 'Add Bank'}
            </Button>
          </>
        }
      >
        <form className="inv-modal-form" onSubmit={(e) => { e.preventDefault(); submitBank(); }}>
          <Field label="Bank Name" required>
            <Input
              value={bankForm.bank_name}
              onChange={(e) => setBankForm((p) => ({ ...p, bank_name: e.target.value }))}
              placeholder="Bank name"
              aria-invalid={!!bankErrors.bank_name}
            />
            {bankErrors.bank_name && <span className="inv-field-error">{bankErrors.bank_name}</span>}
          </Field>
          <div className="inv-modal-row">
            <Field label="Account Number">
              <Input
                value={bankForm.account_number}
                onChange={(e) => setBankForm((p) => ({ ...p, account_number: e.target.value }))}
                placeholder="Account number"
                aria-invalid={!!bankErrors.account_number}
              />
              {bankErrors.account_number && <span className="inv-field-error">{bankErrors.account_number}</span>}
            </Field>
            <Field label="IFSC">
              <Input
                value={bankForm.ifsc}
                onChange={(e) => setBankForm((p) => ({ ...p, ifsc: e.target.value }))}
                placeholder="IFSC code"
                aria-invalid={!!bankErrors.ifsc}
              />
              {bankErrors.ifsc && <span className="inv-field-error">{bankErrors.ifsc}</span>}
            </Field>
          </div>
          <div className="inv-modal-row">
            <Field label="Branch">
              <Input
                value={bankForm.branch}
                onChange={(e) => setBankForm((p) => ({ ...p, branch: e.target.value }))}
                placeholder="Branch name"
              />
            </Field>
            <Field label="UPI ID">
              <Input
                value={bankForm.upi_id}
                onChange={(e) => setBankForm((p) => ({ ...p, upi_id: e.target.value }))}
                placeholder="UPI ID"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </Card>
  );
}