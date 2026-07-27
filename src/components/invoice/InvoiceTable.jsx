import { useMemo, useCallback } from 'react';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import Icon from '../ui/Icon.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { computeLine, round2 } from '../../business/invoice/calculations.js';
import { TAX_RATE_OPTIONS, DISCOUNT_TYPE } from '../../constants/index.js';

function LineRow({ line, index, onChange, onRemove, showDescription, errors }) {
  const computed = useMemo(() => computeLine(line), [line]);
  const lineError = errors?.[index];

  const set = useCallback((field) => (e) => {
    let val = e.target.value;
    if (field === 'quantity' || field === 'unitPrice' || field === 'discountValue') {
      val = val === '' ? '' : Number(val);
    }
    onChange(index, { ...line, [field]: val });
  }, [onChange, index, line]);

  const setDiscountType = useCallback((val) => {
    onChange(index, { ...line, discountType: val, discountValue: val === DISCOUNT_TYPE.PERCENT ? '' : '' });
  }, [onChange, index, line]);

  const setTaxRate = useCallback((val) => {
    onChange(index, { ...line, taxRate: Number(val) });
  }, [onChange, index, line]);

  return (
    <tr className="inv-table-row">
      <td className="inv-table__num">{index + 1}</td>
      <td className="inv-table__product">
        <div className="inv-table-product-cell">
          <input
            className={`form-input inv-table-input${lineError?.name ? ' form-input--error' : ''}`}
            value={line.name || ''}
            onChange={(e) => onChange(index, { ...line, name: e.target.value })}
            placeholder="Product name"
          />
          {lineError?.name && <span className="inv-field-error-sm">{lineError.name}</span>}
          {showDescription && (
            <input
              className="form-input inv-table-input inv-table-input--desc"
              value={line.description || ''}
              onChange={(e) => onChange(index, { ...line, description: e.target.value })}
              placeholder="Description"
            />
          )}
        </div>
      </td>
      <td className="inv-table__qty">
        <input
          type="number"
          min="0"
          step="any"
          className={`form-input inv-table-input inv-table-input--sm${lineError?.quantity ? ' form-input--error' : ''}`}
          value={line.quantity ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onChange(index, { ...line, quantity: val === '' ? '' : Number(val) });
          }}
        />
        {lineError?.quantity && <span className="inv-field-error-sm">{lineError.quantity}</span>}
      </td>
      <td className="inv-table__price">
        <input
          type="number"
          min="0"
          step="0.01"
          className={`form-input inv-table-input inv-table-input--sm${lineError?.unitPrice ? ' form-input--error' : ''}`}
          value={line.unitPrice ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onChange(index, { ...line, unitPrice: val === '' ? '' : Number(val) });
          }}
        />
        {lineError?.unitPrice && <span className="inv-field-error-sm">{lineError.unitPrice}</span>}
      </td>
      <td className="inv-table__tax">
        <Select
          options={TAX_RATE_OPTIONS.map((r) => ({ value: String(r), label: `${r}%` }))}
          value={String(line.taxRate ?? 0)}
          onChange={setTaxRate}
          className="inv-table-select"
        />
      </td>
      <td className="inv-table__discount">
        <div className="inv-table-discount-cell">
          <Select
            options={[
              { value: DISCOUNT_TYPE.PERCENT, label: '%' },
              { value: DISCOUNT_TYPE.FIXED, label: 'Fixed' },
            ]}
            value={line.discountType || DISCOUNT_TYPE.PERCENT}
            onChange={setDiscountType}
            className="inv-table-select inv-table-select--sm"
          />
          <input
            type="number"
            min="0"
            step="any"
            className={`form-input inv-table-input inv-table-input--xs${lineError?.discountValue ? ' form-input--error' : ''}`}
            value={line.discountValue ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onChange(index, { ...line, discountValue: val === '' ? '' : Number(val) });
            }}
          />
        </div>
        {lineError?.discountValue && <span className="inv-field-error-sm">{lineError.discountValue}</span>}
      </td>
      <td className="inv-table__line-total">
        <span className="inv-table-amount">{round2(computed.lineTotal)}</span>
      </td>
      <td className="inv-table__actions">
        <button type="button" className="inv-table-remove" onClick={() => onRemove(index)} aria-label="Remove line">
          <Icon name="trash" size={14} />
        </button>
      </td>
    </tr>
  );
}

export default function InvoiceTable({ items, onChangeItem, onRemoveItem, showDescription, onAddNewProduct, errors }) {
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon="package"
        title="No products added"
        message="Search and add products to this invoice"
        action={
          <Button variant="primary" icon="plus" onClick={onAddNewProduct}>Add New Product</Button>
        }
      />
    );
  }

  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th className="inv-table__th--num">#</th>
            <th className="inv-table__th--product">Product Name</th>
            <th className="inv-table__th--qty">Quantity</th>
            <th className="inv-table__th--price">Unit Price</th>
            <th className="inv-table__th--tax">Tax</th>
            <th className="inv-table__th--discount">Discount</th>
            <th className="inv-table__th--total">Total Amount</th>
            <th className="inv-table__th--actions"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((line, i) => (
            <LineRow
              key={line._key || i}
              line={line}
              index={i}
              onChange={onChangeItem}
              onRemove={onRemoveItem}
              showDescription={showDescription}
              errors={errors?.lines}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}