import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import Icon from '../ui/Icon.jsx';
import { TAX_RATE_OPTIONS, DISCOUNT_TYPE } from '../../constants/index.js';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

// Editable product line-item table. Each row computes derived amounts live
// (qty × price, discount, tax, total). Supports duplicate, remove, and
// inline editing. When no items exist an empty state is shown.
export default function ProductsTable({
  rows,
  lineErrors,
  onUpdateItem,
  onDuplicateItem,
  onRemoveItem,
  onCreateProduct,
  productModal,
  onCloseProductModal,
  onSubmitProduct,
  categories,
  showDescription,
  onToggleDescription,
}) {
  const columns = ['#', 'Product Name', 'Quantity', 'Unit Price', 'Price with Tax', 'Discount', 'Total Amount', 'Total'];

  const discountOptions = [
    { value: DISCOUNT_TYPE.PERCENT, label: '%' },
    { value: DISCOUNT_TYPE.FIXED, label: 'Fixed' },
  ];

  const taxOptions = TAX_RATE_OPTIONS.map((r) => ({ value: String(r), label: `${r}%` }));

  const setField = (idx, field, value) => {
    const item = { ...rows[idx] };
    if (field === 'quantity' || field === 'unitPrice' || field === 'discountValue' || field === 'taxRate') {
      item[field] = value === '' ? '' : Number(value);
    } else {
      item[field] = value;
    }
    onUpdateItem(idx, item);
  };

  return (
    <Card className="inv-card inv-card--table" padding={false}>
      {rows.length === 0 ? (
        <EmptyState
          icon="package"
          title="No products or services added"
          message="Add a product or service to start building your invoice."
          action={
            <PermissionGate permission={PERMISSIONS.PRODUCT_CREATE}>
              <Button icon="plus" onClick={onCreateProduct}>Add New Product</Button>
            </PermissionGate>
          }
        />
      ) : (
        <div className="inv-table-wrapper">
          <table className="inv-table">
            <thead>
              <tr>
                {columns.map((col) => <th key={col}>{col}</th>)}
                <th className="inv-table__actions-col" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const errs = lineErrors?.[idx] || {};
                const discType = row.discountType || DISCOUNT_TYPE.PERCENT;
                return (
                  <tr key={row._tempId || idx}>
                    <td className="inv-table__num">{idx + 1}</td>
                    <td>
                      <div className="inv-table__name-cell">
                        <input
                          className="inv-table__inline-input"
                          value={row.name || ''}
                          onChange={(e) => setField(idx, 'name', e.target.value)}
                          placeholder="Product name"
                          aria-label={`Row ${idx + 1} product name`}
                        />
                        {errs.name && <span className="inv-field-error inv-field-error--inline">{errs.name}</span>}
                        {showDescription && (
                          <input
                            className="inv-table__inline-input inv-table__inline-input--sub"
                            value={row.description || ''}
                            onChange={(e) => setField(idx, 'description', e.target.value)}
                            placeholder="Description"
                            aria-label={`Row ${idx + 1} description`}
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="inv-table__inline-input inv-table__input--num"
                        value={row.quantity ?? ''}
                        onChange={(e) => setField(idx, 'quantity', e.target.value)}
                        min="0"
                        step="1"
                        aria-label={`Row ${idx + 1} quantity`}
                      />
                      {errs.quantity && <span className="inv-field-error inv-field-error--inline">{errs.quantity}</span>}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="inv-table__inline-input inv-table__input--num"
                        value={row.unitPrice ?? ''}
                        onChange={(e) => setField(idx, 'unitPrice', e.target.value)}
                        min="0"
                        step="0.01"
                        aria-label={`Row ${idx + 1} unit price`}
                      />
                      {errs.unitPrice && <span className="inv-field-error inv-field-error--inline">{errs.unitPrice}</span>}
                    </td>
                    <td className="inv-table__num">{row.priceWithTax != null ? row.priceWithTax.toFixed(2) : ''}</td>
                    <td>
                      <div className="inv-table__disc">
                        <select
                          className="form-input inv-table__disc-type"
                          value={discType}
                          onChange={(e) => setField(idx, 'discountType', e.target.value)}
                          aria-label={`Row ${idx + 1} discount type`}
                        >
                          {discountOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <input
                          type="number"
                          className="inv-table__inline-input inv-table__input--num inv-table__disc-val"
                          value={row.discountValue ?? ''}
                          onChange={(e) => setField(idx, 'discountValue', e.target.value)}
                          min="0"
                          step={discType === DISCOUNT_TYPE.PERCENT ? '1' : '0.01'}
                          aria-label={`Row ${idx + 1} discount value`}
                        />
                        {errs.discountValue && <span className="inv-field-error inv-field-error--inline">{errs.discountValue}</span>}
                      </div>
                    </td>
                    <td className="inv-table__num">{row.taxable != null ? row.taxable.toFixed(2) : ''}</td>
                    <td className="inv-table__num">{row.lineTotal != null ? row.lineTotal.toFixed(2) : ''}</td>
                    <td className="inv-table__actions-col">
                      <button type="button" className="inv-action-btn" onClick={() => onDuplicateItem(idx)} aria-label="Duplicate row" title="Duplicate">
                        <Icon name="copy" size={14} />
                      </button>
                      <button type="button" className="inv-action-btn inv-action-btn--danger" onClick={() => onRemoveItem(idx)} aria-label="Remove row" title="Remove">
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductModal
        open={productModal.open}
        mode={productModal.mode}
        initial={productModal.product}
        categories={categories}
        onClose={onCloseProductModal}
        onSubmit={onSubmitProduct}
      />
    </Card>
  );
}
