import { useState } from 'react';
import Modal from '../../ui/Modal.jsx';
import Button from '../../ui/Button.jsx';
import { Field, Input } from '../../ui/Field.jsx';

export default function DiscountModal({ open, onClose, extraDiscountType, extraDiscountValue, onTypeChange, onValueChange }) {
  const [type, setType] = useState(extraDiscountType || 'percent');
  const [value, setValue] = useState(extraDiscountValue ?? 0);

  const apply = () => {
    onTypeChange?.(type);
    onValueChange?.(value);
    onClose?.();
  };

  return (
    <Modal open={open} onClose={onClose} title="Extra Discount" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={apply}>Apply</Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          style={{
            flex: 1, padding: '8px 16px', border: type === 'percent' ? '2px solid #3815f7' : '1px solid #e2e8f0',
            borderRadius: 6, background: type === 'percent' ? '#f0edfe' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
          onClick={() => setType('percent')}
        >
          Percentage (%)
        </button>
        <button
          style={{
            flex: 1, padding: '8px 16px', border: type === 'fixed' ? '2px solid #3815f7' : '1px solid #e2e8f0',
            borderRadius: 6, background: type === 'fixed' ? '#f0edfe' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
          onClick={() => setType('fixed')}
        >
          Fixed Amount (₹)
        </button>
      </div>
      <Field label={type === 'percent' ? 'Discount Percentage' : 'Discount Amount'} required>
        <Input
          type="number"
          min="0"
          step={type === 'percent' ? '1' : '0.01'}
          value={value === 0 ? '' : value}
          onChange={(e) => setValue(e.target.value === '' ? 0 : Number(e.target.value))}
          placeholder={type === 'percent' ? 'e.g. 10' : 'e.g. 500'}
        />
      </Field>
    </Modal>
  );
}