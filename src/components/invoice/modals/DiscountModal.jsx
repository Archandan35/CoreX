import { useState, useEffect } from 'react';
import Modal from '../../ui/Modal.jsx';
import Button from '../../ui/Button.jsx';
import { Field, Input } from '../../ui/Field.jsx';

export default function DiscountModal({ open, onClose, extraDiscountType, extraDiscountValue, onTypeChange, onValueChange }) {
  const [type, setType] = useState(extraDiscountType || 'percent');
  const [value, setValue] = useState(extraDiscountValue ?? 0);

  useEffect(() => {
    if (open) {
      setType(extraDiscountType || 'percent');
      setValue(extraDiscountValue ?? 0);
    }
  }, [open, extraDiscountType, extraDiscountValue]);

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
      <div className="discount-type-toggle">
        <button
          className={type === 'percent' ? 'discount-type-btn discount-type-btn--active' : 'discount-type-btn'}
          onClick={() => setType('percent')}
        >
          Percentage (%)
        </button>
        <button
          className={type === 'fixed' ? 'discount-type-btn discount-type-btn--active' : 'discount-type-btn'}
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
