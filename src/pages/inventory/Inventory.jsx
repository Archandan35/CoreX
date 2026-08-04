import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown.jsx';
import AddProductPanel from '../../components/invoice/AddProductPanel.jsx';
import InventoryMastersPanel from '../../components/invoice/InventoryMastersPanel.jsx';
import { invoiceService } from '../../services/invoice/index.js';
import { notificationManager } from '../../managers/index.js';
import { invalidateCache } from '../../services/ui-sync/index.js';
import { usePermission } from '../../identity/authorization/PermissionContext.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { useHeaderActions } from '../../components/layout/HeaderActionsContext.jsx';

const STATUS_META = {
  in: { label: 'In Stock', cls: 'in' },
  low: { label: 'Low Stock', cls: 'low' },
  out: { label: 'Out of Stock', cls: 'out' },
};

const PAGE_SIZES = [10, 20, 50, 100];

function getStockStatus(p) {
  const qty = Number(p.stock_quantity) || 0;
  if (qty <= 0) return 'out';
  const alert = Number(p.stock_alert) || 0;
  if (alert > 0 && qty <= alert) return 'low';
  return 'in';
}

function fmtCurrency(n) {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQty(n) {
  const v = Number(n) || 0;
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

export default function Inventory() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(PERMISSIONS.PRODUCT_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PRODUCT_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.PRODUCT_DELETE);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [brandFilter, setBrandFilter] = useState('');
  const [hsnFilter, setHsnFilter] = useState('');
  const [includeServices, setIncludeServices] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [mastersOpen, setMastersOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [stockMove, setStockMove] = useState(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const headerSearchRef = useRef(null);
  const importRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, un] = await Promise.all([
        invoiceService.listProducts(),
        invoiceService.listUnits().catch(() => []),
      ]);
      setProducts(res.products || []);
      setCategories(res.categories || []);
      setUnits(un);
    } catch (e) {
      notificationManager.error('Inventory', e.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (q && !(
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || p.item_code || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      )) return false;
      if (categoryId && p.category_id !== categoryId) return false;
      if (unitFilter) {
        const pu = String(p.unit || '');
        if (pu !== unitFilter && pu !== unitFilter) return false;
      }
      if (statusFilter && getStockStatus(p) !== statusFilter) return false;
      const price = Number(p.unit_price) || 0;
      if (minPrice !== '' && price < Number(minPrice)) return false;
      if (maxPrice !== '' && price > Number(maxPrice)) return false;
      if (brandFilter && !(p.brand || '').toLowerCase().includes(brandFilter.toLowerCase())) return false;
      if (hsnFilter && !(p.hsn_code || '').toLowerCase().includes(hsnFilter.toLowerCase())) return false;
      if (!includeServices && p.is_service) return false;
      return true;
    });
  }, [products, query, categoryId, unitFilter, statusFilter, minPrice, maxPrice, brandFilter, hsnFilter, includeServices]);

  const kpis = useMemo(() => {
    let inStock = 0, low = 0, out = 0, value = 0;
    (products || []).forEach((p) => {
      const s = getStockStatus(p);
      if (s === 'in') inStock++;
      else if (s === 'low') low++;
      else out++;
      value += (Number(p.stock_quantity) || 0) * (Number(p.unit_price) || 0);
    });
    const total = products.length;
    return {
      total,
      inStock,
      low,
      out,
      value,
      inPct: total ? Math.round((inStock / total) * 1000) / 10 : 0,
      lowPct: total ? Math.round((low / total) * 1000) / 10 : 0,
      outPct: total ? Math.round((out / total) * 1000) / 10 : 0,
    };
  }, [products]);

  const { registerPageActions } = useHeaderActions();

  // Register this page's page-specific header actions so the shared Topbar
  // (Search / Barcode / Notifications) renders them on every page.
  useEffect(() => {
    const alerts = kpis.low + kpis.out;
    registerPageActions({
      searchRef: headerSearchRef,
      onBarcode: () => headerSearchRef.current?.focus(),
      onSearch: () => headerSearchRef.current?.focus(),
      notify: {
        count: alerts,
        onClick: () => {
          notificationManager.info(
            'Notifications',
            alerts > 0 ? `${alerts} product(s) need attention.` : 'No new notifications.'
          );
        },
      },
    });
    return () => registerPageActions(null);
  }, [registerPageActions, kpis.low, kpis.out, headerSearchRef]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(pageRows.map((r) => r.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const resetFilters = () => {
    setQuery('');
    setCategoryId('');
    setUnitFilter('');
    setStatusFilter('');
    setMinPrice('');
    setMaxPrice('');
    setBrandFilter('');
    setHsnFilter('');
    setIncludeServices(false);
    setPage(1);
  };

  const refresh = useCallback(async () => {
    invalidateCache('products');
    await loadData();
  }, [loadData]);

  const categoryName = (id) => {
    const c = categories.find((x) => x.id === id);
    return c ? c.name : '—';
  };

  const handleCreate = useCallback(async (product) => {
    setAddOpen(false);
    notificationManager.success('Product', `${product.name} added.`);
    await refresh();
  }, [refresh]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await invoiceService.deleteProduct(deleteTarget.id);
      notificationManager.success('Product', `${deleteTarget.name} deleted.`);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      notificationManager.error('Product', e.message || 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refresh]);

  const handleEditSave = useCallback(async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      await invoiceService.updateProduct(editProduct.id, {
        name: editProduct.name,
        sku: editProduct.sku,
        barcode: editProduct.barcode,
        category_id: editProduct.category_id || null,
        unit_price: Number(editProduct.unit_price) || 0,
        mrp: Number(editProduct.mrp) || 0,
        tax_rate: Number(editProduct.tax_rate) || 0,
        unit: editProduct.unit,
        hsn_code: editProduct.hsn_code,
        stock_quantity: Number(editProduct.stock_quantity) || 0,
        stock_alert: Number(editProduct.stock_alert) || 0,
        is_service: editProduct.is_service,
        brand: editProduct.brand,
      });
      notificationManager.success('Product', `${editProduct.name} updated.`);
      setEditProduct(null);
      await refresh();
    } catch (e) {
      notificationManager.error('Product', e.message || 'Failed to update product.');
    } finally {
      setSaving(false);
    }
  }, [editProduct, refresh]);

  const handleStockMove = useCallback(async (qty) => {
    if (!stockMove) return;
    setSaving(true);
    try {
      const current = Number(stockMove.product.stock_quantity) || 0;
      const next = stockMove.mode === 'out' ? Math.max(0, current - qty) : current + qty;
      await invoiceService.updateProduct(stockMove.product.id, { stock_quantity: next });
      notificationManager.success('Stock', stockMove.mode === 'out'
        ? `Removed ${qty} from ${stockMove.product.name}.`
        : `Added ${qty} to ${stockMove.product.name}.`);
      setStockMove(null);
      await refresh();
    } catch (e) {
      notificationManager.error('Stock', e.message || 'Failed to update stock.');
    } finally {
      setSaving(false);
    }
  }, [stockMove, refresh]);

  const handleAdjust = useCallback(async (targetIds, mode, amount) => {
    setSaving(true);
    let ok = 0, failed = 0;
    for (const id of targetIds) {
      try {
        const p = products.find((x) => x.id === id);
        const current = Number(p?.stock_quantity) || 0;
        const next = mode === 'set' ? amount : mode === 'add' ? current + amount : current - amount;
        await invoiceService.updateProduct(id, { stock_quantity: Math.max(0, next) });
        ok++;
      } catch {
        failed++;
      }
    }
    if (ok > 0) notificationManager.success('Stock', `Updated stock for ${ok} product(s).`);
    if (failed > 0) notificationManager.error('Stock', `${failed} product(s) failed.`);
    setAdjustOpen(false);
    setSelectedIds([]);
    await refresh();
    setSaving(false);
  }, [products, refresh]);

  const exportCsv = useCallback(() => {
    const rows = filtered.map((p) => ({
      code: p.sku || p.item_code || '',
      name: p.name,
      category: categoryName(p.category_id),
      unit: p.unit || '',
      stock: fmtQty(p.stock_quantity),
      status: STATUS_META[getStockStatus(p)].label,
      price: Number(p.unit_price) || 0,
      mrp: Number(p.mrp) || 0,
      barcode: p.barcode || '',
      hsn: p.hsn_code || '',
    }));
    const header = ['Code', 'Name', 'Category', 'Unit', 'Stock', 'Status', 'Selling Price', 'MRP', 'Barcode', 'HSN'];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push(Object.values(r).map((v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-products.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notificationManager.success('Export', `${rows.length} product(s) exported.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categoryName is a pure lookup helper
  }, [filtered, categories]);

  const handleImportFile = useCallback(async (file) => {
    if (!file) return;
    setSaving(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) throw new Error('CSV needs a header row and at least one product.');
      const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const idx = (name) => header.indexOf(name);
      let ok = 0, failed = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const name = cells[idx('name')] || '';
        if (!name) { failed++; continue; }
        try {
          await invoiceService.createProduct({
            name,
            sku: cells[idx('sku') || idx('code')] || null,
            barcode: cells[idx('barcode')] || null,
            unit_price: Number(cells[idx('selling price') || idx('price')]) || 0,
            mrp: Number(cells[idx('mrp')]) || 0,
            tax_rate: Number(cells[idx('tax') || idx('tax rate')]) || 0,
            unit: cells[idx('unit')] || null,
            hsn_code: cells[idx('hsn') || idx('hsn code')] || null,
            stock_quantity: Number(cells[idx('stock') || idx('quantity')]) || 0,
          });
          ok++;
        } catch {
          failed++;
        }
      }
      notificationManager.success('Import', `Imported ${ok} product(s).`);
      if (failed > 0) notificationManager.warning('Import', `${failed} row(s) skipped.`);
      await refresh();
    } catch (e) {
      notificationManager.error('Import', e.message || 'Failed to import CSV.');
    } finally {
      setSaving(false);
      if (importRef.current) importRef.current.value = '';
    }
  }, [refresh]);

  const openImport = () => importRef.current?.click();

  return (
    <div className="inventory-page">
      <header className="invp-header">
        <div className="invp-header-title">
          <h1>Inventory</h1>
          <p>Manage and track your product inventory.</p>
        </div>
        <div className="invp-header-actions">
          <button type="button" className="invp-icon-btn" title="Product Masters" onClick={() => setMastersOpen(true)}>
            <Icon name="layers" size={17} />
          </button>
          {canCreate && (
            <button type="button" className="invp-btn invp-btn--primary" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={16} /> Add Product
            </button>
          )}
        </div>
      </header>

      <div className="invp-scroll">
        {/* KPI cards */}
        <div className="invp-kpis">
          <div className="invp-kpi">
            <div className="invp-kpi-top">
              <div className="invp-kpi-icon violet"><Icon name="package" size={17} /></div>
              <span className="invp-kpi-label">Total Products</span>
            </div>
            <div className="invp-kpi-value">{loading ? '…' : kpis.total.toLocaleString('en-IN')}</div>
          </div>
          <div className="invp-kpi">
            <div className="invp-kpi-top">
              <div className="invp-kpi-icon green"><Icon name="check" size={17} /></div>
              <span className="invp-kpi-label">In Stock</span>
            </div>
            <div className="invp-kpi-value">{loading ? '…' : kpis.inStock.toLocaleString('en-IN')}</div>
            <div className="invp-kpi-sub">{kpis.inPct}%</div>
          </div>
          <div className="invp-kpi">
            <div className="invp-kpi-top">
              <div className="invp-kpi-icon orange"><Icon name="alert" size={17} /></div>
              <span className="invp-kpi-label">Low Stock</span>
            </div>
            <div className="invp-kpi-value">{loading ? '…' : kpis.low.toLocaleString('en-IN')}</div>
            <div className="invp-kpi-sub">{kpis.lowPct}%</div>
          </div>
          <div className="invp-kpi">
            <div className="invp-kpi-top">
              <div className="invp-kpi-icon red"><Icon name="x" size={17} /></div>
              <span className="invp-kpi-label">Out of Stock</span>
            </div>
            <div className="invp-kpi-value">{loading ? '…' : kpis.out.toLocaleString('en-IN')}</div>
            <div className="invp-kpi-sub">{kpis.outPct}%</div>
          </div>
          <div className="invp-kpi invp-kpi--value">
            <div className="invp-kpi-top">
              <div className="invp-kpi-icon violet"><Icon name="wallet" size={17} /></div>
              <span className="invp-kpi-label">Total Inventory Value</span>
            </div>
            <div className="invp-kpi-value">{loading ? '…' : fmtCurrency(kpis.value)}</div>
          </div>
        </div>

        {/* Filter toolbar */}
        <div className="invp-filters">
          <div className="invp-filter-search">
            <Icon name="search" size={16} />
            <input
              ref={headerSearchRef}
              type="text"
              placeholder="Search products by name, code, SKU..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              aria-label="Filter products"
            />
          </div>
          <Select
            placeholder="Category"
            className="invp-filter-select"
            value={categoryId}
            onChange={(v) => { setCategoryId(v); setPage(1); }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            placeholder="Unit"
            className="invp-filter-select"
            value={unitFilter}
            onChange={(v) => { setUnitFilter(v); setPage(1); }}
            options={units.map((u) => ({ value: u.name, label: u.name }))}
          />
          <Select
            placeholder="Stock Status"
            className="invp-filter-select"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              { value: 'in', label: 'In Stock' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ]}
          />
          <Input type="number" min="0" className="invp-filter-input" placeholder="Min Price" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} />
          <Input type="number" min="0" className="invp-filter-input" placeholder="Max Price" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} />
          <button type="button" className={`invp-more-btn${showMore ? ' active' : ''}`} onClick={() => setShowMore((v) => !v)}>
            <Icon name="sliders-horizontal" size={16} /> More Filters
          </button>
          <button type="button" className="invp-reset-btn" onClick={resetFilters} title="Reset filters">
            <Icon name="refresh-cw" size={15} /> Reset
          </button>
        </div>

        {showMore && (
          <div className="invp-more-panel">
            <div className="invp-more-grid">
              <Field label="Brand">
                <Input value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }} placeholder="Filter by brand" />
              </Field>
              <Field label="HSN Code">
                <Input value={hsnFilter} onChange={(e) => { setHsnFilter(e.target.value); setPage(1); }} placeholder="Filter by HSN" />
              </Field>
              <label className="invp-check">
                <input type="checkbox" checked={includeServices} onChange={(e) => { setIncludeServices(e.target.checked); setPage(1); }} />
                Include services
              </label>
            </div>
          </div>
        )}

        {/* Bulk bar */}
        {selectedIds.length > 0 && (
          <div className="invp-bulk-bar">
            <span>{selectedIds.length} selected</span>
            {canUpdate && (
              <button type="button" className="invp-link-btn" onClick={() => setAdjustOpen(true)}>
                <Icon name="target" size={14} /> Stock Adjustment
              </button>
            )}
            <button type="button" className="invp-link-btn" onClick={() => setSelectedIds([])}>
              <Icon name="x" size={14} /> Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="invp-table-card">
          {loading ? (
            <div className="invp-empty">
              <div className="spinner" />
              <p>Loading products...</p>
            </div>
          ) : pageRows.length === 0 ? (
            <div className="invp-empty">
              <Icon name="package" size={28} />
              <p>No products match your filters.</p>
              <button type="button" className="invp-btn invp-btn--ghost" onClick={resetFilters}>Reset Filters</button>
            </div>
          ) : (
            <div className="invp-table-scroll">
              <table className="invp-table">
                <thead>
                  <tr>
                    <th>
                      <div className="invp-th-select">
                        <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === pageRows.length && pageRows.length > 0} aria-label="Select all" />
                        <span>Product Name</span>
                      </div>
                    </th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Product Code</th>
                    <th>Purchase Price</th>
                    <th>Selling Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => {
                    const status = getStockStatus(p);
                    const meta = STATUS_META[status];
                    return (
                      <tr key={p.id}>
                          <td>
                            <div className="invp-th-select">
                              <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => handleSelectOne(p.id)} aria-label={`Select ${p.name}`} />
                              <div className="invp-name">{p.name}</div>
                            </div>
                          </td>
                          <td className="invp-category">{categoryName(p.category_id)}</td>
                          <td className="invp-stock">{fmtQty(p.stock_quantity)}</td>
                        <td><span className={`invp-status invp-status--${meta.cls}`}>{meta.label}</span></td>
                        <td className="invp-code">{p.sku || p.item_code || '—'}</td>
                        <td className="invp-price">{Number(p.purchase_price) > 0 ? fmtCurrency(p.purchase_price) : '—'}</td>
                        <td className="invp-price">{fmtCurrency(p.unit_price)}</td>
                        <td>
                          <div className="invp-stock-actions">
                            {canUpdate && (
                              <>
                                <button type="button" className="invp-stock-btn invp-stock-btn--in" title="Add stock" onClick={() => setStockMove({ product: p, mode: 'in' })}>
                                  <Icon name="arrow-down" size={13} /> Stock In
                                </button>
                                <button type="button" className="invp-stock-btn invp-stock-btn--out" title="Remove stock" onClick={() => setStockMove({ product: p, mode: 'out' })}>
                                  <Icon name="arrow-up" size={13} /> Stock Out
                                </button>
                              </>
                            )}
                            <Dropdown trigger={<button type="button" className="invp-action" aria-label="More actions"><Icon name="more-vertical" size={15} /></button>}>
                              {(close) => (
                                <div style={{ minWidth: 170 }}>
                                  <DropdownItem onClick={() => { close(); setViewProduct(p); }}>
                                    <Icon name="eye" size={14} /> View Details
                                  </DropdownItem>
                                  {canUpdate && (
                                    <DropdownItem onClick={() => { close(); setEditProduct({ ...p }); }}>
                                      <Icon name="edit" size={14} /> Edit
                                    </DropdownItem>
                                  )}
                                  {canDelete && (
                                    <DropdownItem danger onClick={() => { close(); setDeleteTarget(p); }}>
                                      <Icon name="trash" size={14} /> Delete
                                    </DropdownItem>
                                  )}
                                </div>
                              )}
                            </Dropdown>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="invp-pagination">
          <div className="invp-rows">
            Rows per page
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="invp-pg-info">{filtered.length} product(s) · page {safePage} of {totalPages}</div>
          <div className="invp-pg-btns">
            <button type="button" className="invp-pg-btn" onClick={goPrev} disabled={safePage <= 1} aria-label="Previous page">
              <Icon name="chevronLeft" size={16} />
            </button>
            {totalPages <= 5 ? (
              Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className={`invp-pg-btn${n === safePage ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))
            ) : (
              <>
                <button type="button" className={`invp-pg-btn${safePage === 1 ? ' active' : ''}`} onClick={() => setPage(1)}>1</button>
                <span className="invp-pg-ellipsis">…</span>
                <button type="button" className="invp-pg-btn active" onClick={() => setPage(safePage)}>{safePage}</button>
                <span className="invp-pg-ellipsis">…</span>
                <button type="button" className="invp-pg-btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
              </>
            )}
            <button type="button" className="invp-pg-btn" onClick={goNext} disabled={safePage >= totalPages} aria-label="Next page">
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        </div>

        {/* Bottom analytics */}
        <div className="invp-analytics">
          <div className="invp-ana-card">
            <div className="invp-ana-icon violet"><Icon name="wallet" size={16} /></div>
            <div className="invp-ana-text">
              <span className="invp-ana-label">Inventory Value</span>
              <span className="invp-ana-value">{loading ? '…' : fmtCurrency(kpis.value)}</span>
            </div>
          </div>
          <div className="invp-ana-card">
            <div className="invp-ana-icon blue"><Icon name="calculator" size={16} /></div>
            <div className="invp-ana-text">
              <span className="invp-ana-label">Average Selling Price</span>
              <span className="invp-ana-value">
                {loading || products.length === 0 ? '—' : fmtCurrency((products.reduce((s, p) => s + (Number(p.unit_price) || 0), 0)) / products.length)}
              </span>
            </div>
          </div>
          <div className="invp-ana-card">
            <div className="invp-ana-icon orange"><Icon name="layers" size={16} /></div>
            <div className="invp-ana-text">
              <span className="invp-ana-label">Total Categories</span>
              <span className="invp-ana-value">{loading ? '…' : categories.length}</span>
            </div>
          </div>
          <div className="invp-ana-card invp-ana-card--actions">
            <span className="invp-ana-label">Quick Actions</span>
            <div className="invp-ana-actions">
              <button type="button" className="invp-qbtn" onClick={openImport}><Icon name="upload" size={14} /> Import</button>
              <button type="button" className="invp-qbtn" onClick={exportCsv}><Icon name="download" size={14} /> Export</button>
              {canUpdate && (
                <button type="button" className="invp-qbtn" onClick={() => setAdjustOpen(true)}><Icon name="target" size={14} /> Stock Adj.</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add product drawer */}
      <AddProductPanel open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleCreate} />

      {/* Product masters drawer */}
      <InventoryMastersPanel open={mastersOpen} onClose={() => { setMastersOpen(false); refresh(); }} />

      {/* Hidden import input */}
      <input
        ref={importRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => handleImportFile(e.target.files?.[0])}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* View product modal */}
      <Modal open={!!viewProduct} onClose={() => setViewProduct(null)} title="Product Details" size="md">
        {viewProduct && (
          <div className="invp-view">
            <div className="invp-view-header">
              <div className="invp-view-name">{viewProduct.name}</div>
              <div className="invp-view-cats">{categoryName(viewProduct.category_id)} · {viewProduct.sku || 'No code'}</div>
            </div>
            <div className="invp-view-grid">
              <div><span>Status</span><b>{STATUS_META[getStockStatus(viewProduct)].label}</b></div>
              <div><span>Stock</span><b>{fmtQty(viewProduct.stock_quantity)}</b></div>
              <div><span>Stock Alert</span><b>{fmtQty(viewProduct.stock_alert)}</b></div>
              <div><span>Purchase Price</span><b>{Number(viewProduct.purchase_price) > 0 ? fmtCurrency(viewProduct.purchase_price) : '—'}</b></div>
              <div><span>Selling Price</span><b>{fmtCurrency(viewProduct.unit_price)}</b></div>
              <div><span>MRP</span><b>{Number(viewProduct.mrp) > 0 ? fmtCurrency(viewProduct.mrp) : '—'}</b></div>
              <div><span>Tax Rate</span><b>{Number(viewProduct.tax_rate) || 0}%</b></div>
              <div><span>Unit</span><b>{viewProduct.unit || '—'}</b></div>
              <div><span>Brand</span><b>{viewProduct.brand || '—'}</b></div>
              <div><span>HSN Code</span><b>{viewProduct.hsn_code || '—'}</b></div>
              <div><span>Barcode</span><b>{viewProduct.barcode || '—'}</b></div>
              <div><span>Type</span><b>{viewProduct.is_service ? 'Service' : 'Product'}</b></div>
            </div>
            {viewProduct.description && (
              <div className="invp-view-desc">
                <span>Description</span>
                <p>{viewProduct.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit product modal */}
      <Modal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        title="Edit Product"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditProduct(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleEditSave} loading={saving} icon="save">Save Changes</Button>
          </>
        }
      >
        {editProduct && (
          <div className="invp-edit-grid">
            <Field label="Product Name" required>
              <Input value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} />
            </Field>
            <Field label="SKU">
              <Input value={editProduct.sku || ''} onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })} />
            </Field>
            <Field label="Barcode">
              <Input value={editProduct.barcode || ''} onChange={(e) => setEditProduct({ ...editProduct, barcode: e.target.value })} />
            </Field>
            <Field label="Category">
              <Select
                placeholder="None"
                value={editProduct.category_id || ''}
                onChange={(v) => setEditProduct({ ...editProduct, category_id: v })}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field label="Selling Price">
              <Input type="number" min="0" step="0.01" value={editProduct.unit_price ?? 0} onChange={(e) => setEditProduct({ ...editProduct, unit_price: e.target.value })} />
            </Field>
            <Field label="MRP">
              <Input type="number" min="0" step="0.01" value={editProduct.mrp ?? 0} onChange={(e) => setEditProduct({ ...editProduct, mrp: e.target.value })} />
            </Field>
            <Field label="Tax %">
              <Input type="number" min="0" step="0.01" value={editProduct.tax_rate ?? 0} onChange={(e) => setEditProduct({ ...editProduct, tax_rate: e.target.value })} />
            </Field>
            <Field label="Unit">
              <Input value={editProduct.unit || ''} onChange={(e) => setEditProduct({ ...editProduct, unit: e.target.value })} />
            </Field>
            <Field label="HSN Code">
              <Input value={editProduct.hsn_code || ''} onChange={(e) => setEditProduct({ ...editProduct, hsn_code: e.target.value })} />
            </Field>
            <Field label="Brand">
              <Input value={editProduct.brand || ''} onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })} />
            </Field>
            <Field label="Stock Quantity">
              <Input type="number" min="0" value={editProduct.stock_quantity ?? 0} onChange={(e) => setEditProduct({ ...editProduct, stock_quantity: e.target.value })} />
            </Field>
            <Field label="Low Stock Alert">
              <Input type="number" min="0" value={editProduct.stock_alert ?? 0} onChange={(e) => setEditProduct({ ...editProduct, stock_alert: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>

      {/* Stock in / out modal */}
      <StockMoveModal
        move={stockMove}
        saving={saving}
        onClose={() => setStockMove(null)}
        onSave={handleStockMove}
      />

      {/* Stock adjustment modal */}
      <StockAdjustModal
        open={adjustOpen}
        saving={saving}
        productOptions={pageRows}
        selectedIds={selectedIds}
        onClose={() => setAdjustOpen(false)}
        onSave={handleAdjust}
      />

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title="Delete Product"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

function StockMoveModal({ move, saving, onClose, onSave }) {
  const [qty, setQty] = useState(1);
  useEffect(() => { if (move) setQty(1); }, [move]);
  if (!move) return null;
  const isOut = move.mode === 'out';
  return (
    <Modal
      open
      onClose={onClose}
      title={isOut ? 'Stock Out' : 'Stock In'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant={isOut ? 'danger' : 'primary'} loading={saving} onClick={() => onSave(qty)} icon={isOut ? 'arrow-up' : 'plus'}>
            {isOut ? `Remove ${qty} from Stock` : `Add ${qty} to Stock`}
          </Button>
        </>
      }
    >
      <p>
        {isOut ? 'Remove quantity from' : 'Add quantity to'} <strong>{move.product.name}</strong> (current: {fmtQty(move.product.stock_quantity)}).
      </p>
      <Input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} autoFocus />
    </Modal>
  );
}

function StockAdjustModal({ open, saving, productOptions, selectedIds, onClose, onSave }) {
  const [productId, setProductId] = useState('');
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!open) return;
    setProductId(selectedIds.length === 1 ? selectedIds[0] : (productOptions[0]?.id || ''));
    setMode('add');
    setAmount('');
  }, [open, selectedIds, productOptions]);

  if (!open) return null;

  const targets = productId ? [productId] : [];
  const canSave = targets.length > 0 && Number(amount) > 0;

  const submit = () => onSave(targets, mode, Number(amount) || 0);

  return (
    <Modal
      open
      onClose={onClose}
      title="Stock Adjustment"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button loading={saving} onClick={submit} disabled={!canSave} icon="check">Apply Adjustment</Button>
        </>
      }
    >
      <div className="invp-adjust-grid">
        <Field label="Product">
          <Select
            value={productId}
            onChange={setProductId}
            options={productOptions.map((p) => ({ value: p.id, label: `${p.name} (${fmtQty(p.stock_quantity)})` }))}
          />
        </Field>
        <Field label="Mode">
          <Select
            value={mode}
            onChange={setMode}
            options={[
              { value: 'add', label: 'Add Stock' },
              { value: 'reduce', label: 'Reduce Stock' },
              { value: 'set', label: 'Set Stock' },
            ]}
          />
        </Field>
        <Field label={mode === 'set' ? 'New Quantity' : 'Quantity'}>
          <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
        </Field>
      </div>
      {selectedIds.length > 1 && <p className="invp-adjust-note">{selectedIds.length} products selected — adjustment applies to the chosen product.</p>}
    </Modal>
  );
}
