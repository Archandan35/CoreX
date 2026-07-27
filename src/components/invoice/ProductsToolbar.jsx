import { useMemo } from 'react';
import Filter, { FilterItem } from '../ui/Filter.jsx';
import Search from '../ui/Search.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import Dropdown, { DropdownItem } from '../ui/Dropdown.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import Icon from '../ui/Icon.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

// Products & services toolbar: category filter, product/barcode search,
// quantity, Add to Bill, AI (BETA), Show Description toggle, settings.
export default function ProductsToolbar({
  categories,
  category,
  onCategory,
  productQuery,
  onProductQuery,
  products,
  qty,
  onQty,
  onAddProduct,
  onCreateProduct,
  onOpenProductSettings,
  showDescription,
  onToggleShowDescription,
  onDraftWithAI,
  aiBusy,
  disabledAdd,
}) {
  const debounced = useDebounce(productQuery, 300);
  const matches = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) =>
      [p.name, p.sku, p.barcode, p.hsn_code].some((v) => v?.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [products, debounced]);

  const trigger = (
    <div className="inv-toolbar-search">
      <Search value={productQuery} onChange={onProductQuery} placeholder="Search product or scan barcode..." className="inv-toolbar-search__field" />
    </div>
  );

  return (
    <Filter className="inv-toolbar">
      <FilterItem label="Category">
        <Select
          aria-label="Product category"
          options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          value={category}
          onChange={onCategory}
        />
      </FilterItem>

      <FilterItem>
        <Dropdown trigger={trigger}>
          {(close) => (
            <div className="inv-product-menu">
              {matches.length === 0 && productQuery && <div className="inv-customer-empty">No products match</div>}
              {matches.map((p) => (
                <DropdownItem key={p.id} onClick={() => { close(); onAddProduct(p); }}>
                  <div className="inv-customer-option">
                    <span className="inv-customer-option__name">{p.name}</span>
                    <span className="inv-customer-option__meta">
                      {[p.sku, p.hsn_code].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </DropdownItem>
              ))}
            </div>
          )}
        </Dropdown>
      </FilterItem>

      <FilterItem label="Qty">
        <input
          type="number"
          min="1"
          step="1"
          className="form-input inv-qty-input"
          value={qty}
          onChange={(e) => onQty(e.target.value)}
          aria-label="Default quantity"
        />
      </FilterItem>

      <FilterItem>
        <Button icon="plus" onClick={onAddProduct} disabled={disabledAdd}>Add to Bill</Button>
      </FilterItem>

      <FilterItem>
        <Button variant="secondary" icon="sparkles" onClick={onDraftWithAI} loading={aiBusy}>
          Create Invoices with AI
        </Button>
        <Badge variant="info" size="sm">BETA</Badge>
      </FilterItem>

      <div className="inv-toolbar__right">
        <Checkbox checked={showDescription} onChange={onToggleShowDescription} label="Show Description" />
        <PermissionGate permission={PERMISSIONS.PRODUCT_CREATE}>
          <Button variant="secondary" icon="plus" onClick={onCreateProduct}>New Product</Button>
        </PermissionGate>
        <button type="button" className="inv-header__action" onClick={onOpenProductSettings} aria-label="Product settings">
          <Icon name="gear" size={16} />
        </button>
      </div>
    </Filter>
  );
}
