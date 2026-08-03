import Modal from '../../ui/Modal.jsx';
import Button from '../../ui/Button.jsx';
import { Input } from '../../ui/Field.jsx';
import Checkbox from '../../ui/Checkbox.jsx';
import Icon from '../../ui/Icon.jsx';

export default function ChargesModal({ open, onClose, charges, onAdd, onRemove, onUpdate }) {
  return (
    <Modal open={open} onClose={onClose} title="Additional Charges" size="md"
      footer={<Button variant="secondary" onClick={onClose}>Done</Button>}
    >
      {(charges || []).map((c, i) => (
        <div key={i} className="charge-row">
          <Input
            value={c.label || ''}
            onChange={(e) => onUpdate?.(i, { ...c, label: e.target.value })}
            placeholder="Charge name"
            className="charge-row-input"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={c.amount ?? ''}
            onChange={(e) => onUpdate?.(i, { ...c, amount: Number(e.target.value) || 0 })}
            placeholder="Amount"
            className="charge-row-amount"
          />
          <Checkbox
            checked={!!c.taxable}
            onChange={(v) => onUpdate?.(i, { ...c, taxable: v })}
            label="Taxable"
          />
          <button type="button" className="inv-table-remove-btn" onClick={() => onRemove?.(i)} aria-label="Remove">
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}
      {(charges || []).length === 0 && (
        <div className="charge-empty-state">No additional charges added.</div>
      )}
      <div className="charge-add-btn">
        <Button variant="secondary" icon="plus" onClick={() => onAdd?.({ label: '', amount: 0, taxable: true })}>
          Add Charge
        </Button>
      </div>
    </Modal>
  );
}
