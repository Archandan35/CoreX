import { useMemo, useCallback, memo } from 'react';
import Icon from '../ui/Icon.jsx';
import Badge from '../ui/Badge.jsx';
import { computeLine, round2 } from '../../business/invoice/calculations.js';
import { TAX_RATE_OPTIONS, DISCOUNT_TYPE } from '../../constants/index.js';

const EMPTY_ICON = 'package';

const LineRow = memo(function LineRow({ line, index, onChange, onRemove }) {
  const computed = useMemo(() => computeLine(line), [line]);
  const stockWarning = line.product_id && line.stock_quantity > 0 && (Number(line.quantity) || 0) > line.stock_quantity;

  const setField = useCallback((field) => (e) => {
    let val = e.target.value;
    if (field === 'quantity' || field === 'unitPrice' || field === 'discountValue') {
      val = val === '' ? '' : Number(val);
    }
    onChange(index, { ...line, [field]: val });
  }, [onChange, index, line]);

  const setTaxRate = useCallback((val) => {
    onChange(index, { ...line, taxRate: Number(val) });
  }, [onChange, index, line]);

  const setDiscountType = useCallback((e) => {
    const val = e.target.value;
    onChange(index, { ...line, discountType: val, discountValue: val === DISCOUNT_TYPE.PERCENT ? 0 : 0 });
  }, [onChange, index, line]);

  return (
    <tr>
      <td style={{ textAlign: 'center', color: 'var(--inv-text-sub)', fontSize: 12, fontWeight: 500 }}>{index + 1}</td>
      <td className="inv-table-product-name">
        <input
          value={line.name || ''}
          onChange={(e) => onChange(index, { ...line, name: e.target.value })}
          placeholder="Product name"
        />
        {stockWarning && (
          <div style={{ fontSize: 10, color: 'var(--inv-red-dot)', marginTop: 2 }}>
            Only {line.stock_quantity} in stock
          </div>
        )}
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="any"
          className="inv-table-input"
          value={line.quantity ?? ''}
          onChange={setField('quantity')}
          placeholder="0"
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          className="inv-table-input"
          value={line.unitPrice ?? ''}
          onChange={setField('unitPrice')}
          placeholder="0.00"
        />
      </td>
      <td>
        <select className="inv-table-select" value={String(line.taxRate ?? 0)} onChange={(e) => setTaxRate(e.target.value)}>
          {TAX_RATE_OPTIONS.map((r) => (
            <option key={r} value={String(r)}>{r}%</option>
          ))}
        </select>
      </td>
      <td>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <select
            className="inv-table-select"
            style={{ width: 'auto', minWidth: 50 }}
            value={line.discountType || DISCOUNT_TYPE.PERCENT}
            onChange={setDiscountType}
          >
            <option value={DISCOUNT_TYPE.PERCENT}>%</option>
            <option value={DISCOUNT_TYPE.FIXED}>₹</option>
          </select>
          <input
            type="number"
            min="0"
            step="any"
            className="inv-table-input"
            style={{ width: 50, textAlign: 'right' }}
            value={line.discountValue ?? ''}
            onChange={setField('discountValue')}
            placeholder="0"
          />
        </div>
      </td>
      <td style={{ textAlign: 'right' }}>
        <span className="inv-table-amount">{round2(computed.lineTotal)}</span>
      </td>
      <td style={{ textAlign: 'center' }}>
        <button type="button" className="inv-table-remove-btn" onClick={() => onRemove(index)} aria-label="Remove">
          <Icon name="trash" size={14} />
        </button>
      </td>
    </tr>
  );
});

export default function InvoiceTable({ items, onChangeItem, onRemoveItem, showDescription, onAddNewProduct }) {
  if (!items || items.length === 0) {
    return (
      <div className="inv-ps-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Price with Tax</th>
              <th>Discount</th>
              <th>Total Amount</th>
              <th className="total-col">Total<small className="inv-total-small">(Net Amount + Tax)</small></th>
            </tr>
          </thead>
        </table>
        <div className="inv-empty-state">
          <div className="inv-empty-icon"><Icon name={EMPTY_ICON} size={48} strokeWidth={1.5} /></div>
          <p>Search existing products to add to this list or add new product to get started! 🚀</p>
          <button className="inv-btn-add-product" onClick={onAddNewProduct}>
            <Icon name="plus" size={14} /> Add New Product
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inv-ps-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product Name</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Tax</th>
            <th>Discount</th>
            <th>Total Amount</th>
            <th></th>
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}