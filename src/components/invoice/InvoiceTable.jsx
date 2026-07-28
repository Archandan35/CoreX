import { useMemo, memo } from 'react';
import Icon from '../ui/Icon.jsx';
import Badge from '../ui/Badge.jsx';
import { computeLine, round2 } from '../../business/invoice/calculations.js';
import { TAX_RATE_OPTIONS, DISCOUNT_TYPE, INVOICE_TABLE_COLUMNS } from '../../constants/index.js';

const EMPTY_ICON = 'package';

const COLUMN_RENDERERS = {
  lineNo: ({ line, index }) => (
    <td key="lineNo" style={{ textAlign: 'center', color: 'var(--inv-text-sub)', fontSize: 12, fontWeight: 500 }}>{index + 1}</td>
  ),
  productName: ({ line, index, onChange, stockWarning }) => (
    <td key="productName" className="inv-table-product-name">
      <input value={line.name || ''} onChange={(e) => onChange(index, { ...line, name: e.target.value })} placeholder="Product name" />
      {stockWarning && <div style={{ fontSize: 10, color: 'var(--inv-red-dot)', marginTop: 2 }}>Only {line.stock_quantity} in stock</div>}
    </td>
  ),
  description: ({ line, index, onChange }) => (
    <td key="description">
      <input value={line.description || ''} onChange={(e) => onChange(index, { ...line, description: e.target.value })} placeholder="Description" className="inv-table-input" />
    </td>
  ),
  quantity: ({ line, index, onChange }) => (
    <td key="quantity">
      <input type="number" min="0" step="any" className="inv-table-input" value={line.quantity ?? ''} onChange={(e) => { let val = e.target.value === '' ? '' : Number(e.target.value); onChange(index, { ...line, quantity: val }); }} placeholder="0" />
    </td>
  ),
  freeQty: ({ line, index, onChange }) => (
    <td key="freeQty">
      <input type="number" min="0" step="any" className="inv-table-input" value={line.freeQty ?? ''} onChange={(e) => { let val = e.target.value === '' ? '' : Number(e.target.value); onChange(index, { ...line, freeQty: val }); }} placeholder="0" />
    </td>
  ),
  unit: ({ line, index, onChange, units, warehouses }) => {
    const unitList = units || [];
    if (unitList.length > 0) {
      return (
        <td key="unit">
          <select className="inv-table-select" value={line.unit || ''} onChange={(e) => onChange(index, { ...line, unit: e.target.value })}>
            <option value="">Select</option>
            {unitList.map((u) => {
              const val = u.name || u.unit || u.value || u;
              const lbl = u.name || u.unit || u.label || u;
              return <option key={val} value={val}>{lbl}</option>;
            })}
          </select>
        </td>
      );
    }
    return (
      <td key="unit">
        <input className="inv-table-input" value={line.unit || ''} onChange={(e) => onChange(index, { ...line, unit: e.target.value })} placeholder="Unit" />
      </td>
    );
  },
  unitPrice: ({ line, index, onChange }) => (
    <td key="unitPrice">
      <input type="number" min="0" step="0.01" className="inv-table-input" value={line.unitPrice ?? ''} onChange={(e) => { let val = e.target.value === '' ? '' : Number(e.target.value); onChange(index, { ...line, unitPrice: val }); }} placeholder="0.00" />
    </td>
  ),
  priceWithTax: ({ computed }) => (
    <td key="priceWithTax" style={{ textAlign: 'right', fontSize: 13 }}>{round2(computed.unitPriceWithTax)}</td>
  ),
  discount: ({ line, index, onChange }) => (
    <td key="discount">
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <select className="inv-table-select" style={{ width: 'auto', minWidth: 50 }} value={line.discountType || DISCOUNT_TYPE.PERCENT} onChange={(e) => { const val = e.target.value; onChange(index, { ...line, discountType: val, discountValue: val === DISCOUNT_TYPE.PERCENT ? 0 : 0 }); }}>
          <option value={DISCOUNT_TYPE.PERCENT}>%</option>
          <option value={DISCOUNT_TYPE.FIXED}>₹</option>
        </select>
        <input type="number" min="0" step="any" className="inv-table-input" style={{ width: 50, textAlign: 'right' }} value={line.discountValue ?? ''} onChange={(e) => { let val = e.target.value === '' ? '' : Number(e.target.value); onChange(index, { ...line, discountValue: val }); }} placeholder="0" />
      </div>
    </td>
  ),
  discountPct: ({ line }) => (
    <td key="discountPct" style={{ textAlign: 'right', fontSize: 13 }}>{line.discountType === DISCOUNT_TYPE.PERCENT ? (line.discountValue || 0) + '%' : '₹' + (line.discountValue || 0)}</td>
  ),
  taxRate: ({ line, index, onChange }) => (
    <td key="taxRate">
      <select className="inv-table-select" value={String(line.taxRate ?? 0)} onChange={(e) => onChange(index, { ...line, taxRate: Number(e.target.value) })}>
        {TAX_RATE_OPTIONS.map((r) => (<option key={r} value={String(r)}>{r}%</option>))}
      </select>
    </td>
  ),
  taxAmount: ({ computed }) => (
    <td key="taxAmount" style={{ textAlign: 'right', fontSize: 13 }}>{round2(computed.taxAmount)}</td>
  ),
  hsnSac: ({ line, index, onChange }) => (
    <td key="hsnSac">
      <input className="inv-table-input" value={line.hsnSac || ''} onChange={(e) => onChange(index, { ...line, hsnSac: e.target.value })} placeholder="HSN/SAC" />
    </td>
  ),
  batch: ({ line, index, onChange }) => (
    <td key="batch">
      <input className="inv-table-input" value={line.batch || ''} onChange={(e) => onChange(index, { ...line, batch: e.target.value })} placeholder="Batch" />
    </td>
  ),
  warehouse: ({ line, index, onChange, units, warehouses }) => {
    const whList = warehouses || [];
    if (whList.length > 0) {
      return (
        <td key="warehouse">
          <select className="inv-table-select" value={line.warehouse || ''} onChange={(e) => onChange(index, { ...line, warehouse: e.target.value })}>
            <option value="">Select</option>
            {whList.map((w) => {
              const val = w.name || w.warehouse || w.value || w;
              const lbl = w.name || w.warehouse || w.label || w;
              return <option key={val} value={val}>{lbl}</option>;
            })}
          </select>
        </td>
      );
    }
    return (
      <td key="warehouse">
        <input className="inv-table-input" value={line.warehouse || ''} onChange={(e) => onChange(index, { ...line, warehouse: e.target.value })} placeholder="Warehouse" />
      </td>
    );
  },
  lineTotal: ({ computed }) => (
    <td key="lineTotal" style={{ textAlign: 'right' }}><span className="inv-table-amount">{round2(computed.lineTotal)}</span></td>
  ),
  actions: ({ index, onRemove }) => (
    <td key="actions" style={{ textAlign: 'center' }}>
      <button type="button" className="inv-table-remove-btn" onClick={() => onRemove(index)} aria-label="Remove"><Icon name="trash" size={14} /></button>
    </td>
  ),
};

const LineRow = memo(function LineRow({ line, index, onChange, onRemove, columns, units, warehouses }) {
  const computed = useMemo(() => computeLine(line), [line]);
  const stockWarning = line.product_id && line.stock_quantity > 0 && (Number(line.quantity) || 0) > line.stock_quantity;

  return (
    <tr>
      {columns.map((col) => {
        const renderer = COLUMN_RENDERERS[col.key];
        if (!renderer) return null;
        return renderer({ line, index, onChange, onRemove, computed, stockWarning, units, warehouses });
      })}
    </tr>
  );
});

export default function InvoiceTable({ items, onChangeItem, onRemoveItem, showDescription, onAddNewProduct, visibleColumns, units, warehouses }) {
  const resolvedColumns = visibleColumns || INVOICE_TABLE_COLUMNS.filter((c) => c.always || c.defaultVisible);

  const headerColumns = resolvedColumns.filter((c) => c.key !== 'actions');

  return (
    <div className="inv-ps-table" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <table style={{ flexShrink: 0 }}>
        <thead>
          <tr>
            {headerColumns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>{col.label}</th>
            ))}
          </tr>
        </thead>
      </table>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {(!items || items.length === 0) ? (
          <div className="inv-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
            <div className="inv-empty-icon"><Icon name={EMPTY_ICON} size={48} strokeWidth={1.5} /></div>
            <p>Search existing products to add to this list or add new product to get started!</p>
            <button className="inv-btn-add-product" onClick={onAddNewProduct}>
              <Icon name="plus" size={14} /> Add New Product
            </button>
          </div>
        ) : (
          <table>
            <tbody>
              {items.map((line, i) => (
                <LineRow
                  key={line._key || i}
                  line={line}
                  index={i}
                  onChange={onChangeItem}
                  onRemove={onRemoveItem}
                  columns={resolvedColumns}
                  units={units}
                  warehouses={warehouses}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}