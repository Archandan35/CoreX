import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import AddProductPanel from '../../components/invoice/AddProductPanel.jsx';
import { invoiceService } from '../../services/invoice/index.js';
import { notificationManager } from '../../managers/index.js';
import { invalidateCache } from '../../services/ui-sync/index.js';
import { usePermission } from '../../identity/authorization/PermissionContext.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { useFullscreen } from '../../components/layout/FullscreenContext.jsx';

const STATUS_META = {
  in: { label: 'In Stock', cls: 'in' },
  low: { label: 'Low Stock', cls: 'low' },
  out: { label: 'Out of Stock', cls: 'out' },
};

const PAGE_SIZES = [10, 25, 50, 100];

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

function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Products() {
  const { hasPermission } = usePermission();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const canCreate = hasPermission(PERMISSIONS.PRODUCT_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PRODUCT_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.PRODUCT_DELETE);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierId, setSupplierId] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stockMove, setStockMove] = useState(null);
  const [bulkStockMove, setBulkStockMove] = useState(null);
  const [changeCategory, setChangeCategory] = useState(null);
  const [changeSupplier, setChangeSupplier] = useState(null);

  const searchRef = useRef(null);
  const importRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, un] = await Promise.all([
        invoiceService.listProducts(),
        invoiceService.listUnits().catch(() => []),
      ]);
      const [br, su] = await Promise.all([
        invoiceService.listBrands().catch(() => []),
        invoiceService.listSuppliers().catch(() => []),
      ]);
      setProducts(res.products || []);
      setCategories(res.categories || []);
      setUnits(un);
      setBrands(br);
      setSuppliers(su);
    } catch (e) {
      notificationManager.error('Products', e.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (q && !(
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || p.item_code || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      )) return false;
      if (categoryId && p.category_id !== categoryId) return false;
      if (brandId) {
        const pb = String(p.brand || '');
        if (pb !== brandId) return false;
      }
      if (unitId) {
        const pu = String(p.unit || '');
        if (pu !== unitId) return false;
      }
      if (supplierId && p.supplier_id !== supplierId) return false;
      if (statusFilter && getStockStatus(p) !== statusFilter) return false;
      return true;
    });
  }, [products, debouncedQuery, categoryId, brandId, unitId, supplierId, statusFilter]);

  const kpis = useMemo(() => {
    let inStock = 0, low = 0, out = 0;
    (products || []).forEach((p) => {
      const s = getStockStatus(p);
      if (s === 'in') inStock++;
      else if (s === 'low') low++;
      else out++;
    });
    return { total: products.length, inStock, low, out };
  }, [products]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtered.length);
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
    setQuery(''); setCategoryId(''); setBrandId(''); setUnitId('');
    setStatusFilter(''); setSupplierId(''); setPage(1);
  };

  const refresh = useCallback(async () => {
    invalidateCache('products');
    await loadData();
  }, [loadData]);

  const categoryName = (id) => {
    const c = categories.find((x) => x.id === id);
    return c ? c.name : '—';
  };

  const supplierName = (id) => {
    const s = suppliers.find((x) => x.id === id);
    return s ? s.name : '—';
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
        supplier_id: editProduct.supplier_id || null,
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

  const handleBulkStockMove = useCallback(async (qty) => {
    if (!bulkStockMove) return;
    setSaving(true);
    let ok = 0, failed = 0;
    for (const id of bulkStockMove.ids) {
      try {
        const p = products.find((x) => x.id === id);
        const current = Number(p?.stock_quantity) || 0;
        const next = bulkStockMove.mode === 'out' ? Math.max(0, current - qty) : current + qty;
        await invoiceService.updateProduct(id, { stock_quantity: next });
        ok++;
      } catch {
        failed++;
      }
    }
    if (ok > 0) notificationManager.success('Stock', `Updated stock for ${ok} product(s).`);
    if (failed > 0) notificationManager.error('Stock', `${failed} product(s) failed.`);
    setBulkStockMove(null);
    setSelectedIds([]);
    await refresh();
    setSaving(false);
  }, [bulkStockMove, products, refresh]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    let ok = 0, failed = 0;
    for (const id of selectedIds) {
      try { await invoiceService.deleteProduct(id); ok++; } catch { failed++; }
    }
    if (ok > 0) notificationManager.success('Products', `Deleted ${ok} product(s).`);
    if (failed > 0) notificationManager.error('Products', `${failed} product(s) failed.`);
    setSelectedIds([]);
    setDeleting(false);
    await refresh();
  }, [selectedIds, refresh]);

  const handleChangeCategory = useCallback(async (catId) => {
    if (!changeCategory || !catId) return;
    setSaving(true);
    let ok = 0, failed = 0;
    for (const id of changeCategory.ids) {
      try {
        await invoiceService.updateProduct(id, { category_id: catId });
        ok++;
      } catch { failed++; }
    }
    if (ok > 0) notificationManager.success('Products', `Updated category for ${ok} product(s).`);
    if (failed > 0) notificationManager.error('Products', `${failed} product(s) failed.`);
    setChangeCategory(null);
    setSelectedIds([]);
    await refresh();
    setSaving(false);
  }, [changeCategory, refresh]);

  const handleChangeSupplier = useCallback(async (suppId) => {
    if (!changeSupplier || !suppId) return;
    setSaving(true);
    let ok = 0, failed = 0;
    for (const id of changeSupplier.ids) {
      try {
        await invoiceService.updateProduct(id, { supplier_id: suppId });
        ok++;
      } catch { failed++; }
    }
    if (ok > 0) notificationManager.success('Products', `Updated supplier for ${ok} product(s).`);
    if (failed > 0) notificationManager.error('Products', `${failed} product(s) failed.`);
    setChangeSupplier(null);
    setSelectedIds([]);
    await refresh();
    setSaving(false);
  }, [changeSupplier, refresh]);

  const downloadCsv = useCallback((rows, filename) => {
    const header = ['Sl No', 'Product Name', 'Category', 'Product Code', 'Quantity', 'Unit', 'MRP', 'Selling Price', 'Brand', 'Supplier'];
    const lines = rows.map((p, i) => [
      i + 1,
      p.name,
      categoryName(p.category_id),
      p.brand || '',
      fmtQty(p.stock_quantity),
      p.unit || '',
      Number(p.mrp) || 0,
      Number(p.unit_price) || 0,
      p.brand || '',
      (p.supplier && p.supplier.name) || supplierName(p.supplier_id) || '',
    ]);
    const all = [header, ...lines];
    const csv = all.map((row) => row.map((v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers are pure lookups over the listed deps
  }, [categories, suppliers]);

  const exportFiltered = useCallback(() => {
    downloadCsv(filtered, 'products.csv');
    notificationManager.success('Export', `${filtered.length} product(s) exported.`);
  }, [filtered, downloadCsv]);

  const exportSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const rows = (products || []).filter((p) => selectedIds.includes(p.id));
    downloadCsv(rows, 'products-selected.csv');
    notificationManager.success('Export', `${rows.length} product(s) exported.`);
  }, [products, selectedIds, downloadCsv]);

  const handleImportFile = useCallback(async (file) => {
    if (!file) return;
    setSaving(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) throw new Error('CSV needs a header row and at least one product.');
      const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const idx = (name) => header.indexOf(name);
      const getCell = (row, ...names) => {
        for (const n of names) {
          const i = header.indexOf(n);
          if (i !== -1 && row[i] !== undefined) return row[i];
        }
        return '';
      };
      let ok = 0, failed = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const name = cells[idx('name')] || '';
        if (!name) { failed++; continue; }
        try {
          await invoiceService.createProduct({
            name,
            sku: getCell(cells, 'sku', 'code', 'product code') || null,
            barcode: getCell(cells, 'barcode') || null,
            unit_price: Number(getCell(cells, 'selling price', 'price')) || 0,
            mrp: Number(getCell(cells, 'mrp')) || 0,
            purchase_price: Number(getCell(cells, 'purchase price', 'cost price')) || 0,
            tax_rate: Number(getCell(cells, 'tax', 'tax rate')) || 0,
            unit: getCell(cells, 'unit') || null,
            hsn_code: getCell(cells, 'hsn', 'hsn code') || null,
            brand: getCell(cells, 'brand') || null,
            stock_quantity: Number(getCell(cells, 'stock', 'quantity', 'qty')) || 0,
          });
          ok++;
        } catch { failed++; }
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

  const pageRange = useMemo(() => {
    const pages = [];
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, safePage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  const unitOptions = units.map((u) => ({ value: u.name, label: u.name }));
  const statusOptions = [
    { value: 'in', label: 'In Stock' },
    { value: 'low', label: 'Low Stock' },
    { value: 'out', label: 'Out of Stock' },
  ];

  return (
    <div className="products-page">
      <header className="prd-header">
        <div className="prd-header-title">
          <h1>Products</h1>
          <p>Manage all products and inventory.</p>
        </div>
        <div className="prd-header-actions">
          <div className="prd-search">
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              aria-label="Search products"
            />
            <kbd>Ctrl K</kbd>
          </div>
          <button type="button" className="prd-icon-btn" title="Barcode Scanner" onClick={() => searchRef.current?.focus()}>
            <Icon name="scan" size={17} />
          </button>
          <button type="button" className="prd-icon-btn" title="Notifications" onClick={() => {
            const alerts = kpis.low + kpis.out;
            notificationManager.info('Notifications', alerts > 0 ? `${alerts} product(s) need attention.` : 'No new notifications.');
          }}>
            <Icon name="bell" size={17} />
            {(kpis.low + kpis.out) > 0 && <span className="prd-notif-dot" />}
          </button>
          <button type="button" className="prd-icon-btn" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            <Icon name="maximize" size={17} />
          </button>
          {canCreate && (
            <Button variant="primary" className="prd-btn-primary" icon="plus" onClick={() => setAddOpen(true)}>Add Product</Button>
          )}
        </div>
      </header>

      <div className="prd-scroll">
        <div className="prd-kpis">
          <div className="prd-kpi">
            <div className="prd-kpi-top">
              <div className="prd-kpi-icon violet"><Icon name="package" size={17} /></div>
              <span className="prd-kpi-label">Total Products</span>
            </div>
            <div className="prd-kpi-value">{loading ? '…' : kpis.total.toLocaleString('en-IN')}</div>
          </div>
          <div className="prd-kpi">
            <div className="prd-kpi-top">
              <div className="prd-kpi-icon green"><Icon name="package-check" size={17} /></div>
              <span className="prd-kpi-label">In Stock</span>
            </div>
            <div className="prd-kpi-value">{loading ? '…' : kpis.inStock.toLocaleString('en-IN')}</div>
            <div className="prd-kpi-sub">{kpis.total ? Math.round((kpis.inStock / kpis.total) * 100) : 0}% available</div>
          </div>
          <div className="prd-kpi">
            <div className="prd-kpi-top">
              <div className="prd-kpi-icon orange"><Icon name="alert" size={17} /></div>
              <span className="prd-kpi-label">Low Stock</span>
            </div>
            <div className="prd-kpi-value">{loading ? '…' : kpis.low.toLocaleString('en-IN')}</div>
          </div>
          <div className="prd-kpi">
            <div className="prd-kpi-top">
              <div className="prd-kpi-icon red"><Icon name="x" size={17} /></div>
              <span className="prd-kpi-label">Out of Stock</span>
            </div>
            <div className="prd-kpi-value">{loading ? '…' : kpis.out.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="prd-toolbar">
          <div className="prd-filter-search">
            <Icon name="search" size={16} />
            <input
              type="text"
              placeholder="Search Products"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              aria-label="Search products"
            />
          </div>
          <Select
            className="prd-filter-select"
            placeholder="Category"
            value={categoryId}
            onChange={(v) => { setCategoryId(v); setPage(1); }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            className="prd-filter-select"
            placeholder="Brand"
            value={brandId}
            onChange={(v) => { setBrandId(v); setPage(1); }}
            options={brands.map((b) => ({ value: b.id || b.name, label: b.name }))}
          />
          <Select
            className="prd-filter-select"
            placeholder="Unit"
            value={unitId}
            onChange={(v) => { setUnitId(v); setPage(1); }}
            options={unitOptions}
          />
          <Select
            className="prd-filter-select"
            placeholder="Stock Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={statusOptions}
          />
          <Select
            className="prd-filter-select prd-filter-select--supplier"
            placeholder="Supplier"
            value={supplierId}
            onChange={(v) => { setSupplierId(v); setPage(1); }}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
          <button type="button" className="prd-reset-btn" onClick={resetFilters} title="Reset filters">
            <Icon name="refresh-cw" size={15} /> Reset
          </button>
          <button type="button" className="prd-tool-btn" onClick={exportFiltered} title="Export products">
            <Icon name="download" size={15} /> Export
          </button>
          <button type="button" className="prd-tool-btn" onClick={openImport} title="Import products">
            <Icon name="upload" size={15} /> Import
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="prd-bulk-bar">
            <span className="prd-bulk-count">{selectedIds.length} selected</span>
            {canUpdate && (
              <>
                <button type="button" className="prd-bulk-btn prd-bulk-btn--in" onClick={() => setBulkStockMove({ ids: selectedIds, mode: 'in' })}>
                  <Icon name="arrow-down" size={13} /> Stock In
                </button>
                <button type="button" className="prd-bulk-btn prd-bulk-btn--out" onClick={() => setBulkStockMove({ ids: selectedIds, mode: 'out' })}>
                  <Icon name="arrow-up" size={13} /> Stock Out
                </button>
                <button type="button" className="prd-bulk-btn" onClick={exportSelected}>
                  <Icon name="download" size={13} /> Export Selected
                </button>
                <button type="button" className="prd-bulk-btn" onClick={() => setChangeCategory({ ids: selectedIds })}>
                  <Icon name="folder" size={13} /> Change Category
                </button>
                <button type="button" className="prd-bulk-btn" onClick={() => setChangeSupplier({ ids: selectedIds })}>
                  <Icon name="truck" size={13} /> Change Supplier
                </button>
              </>
            )}
            {canDelete && (
              <button type="button" className="prd-bulk-btn prd-bulk-btn--danger" onClick={handleBulkDelete} disabled={deleting}>
                <Icon name="trash" size={13} /> Delete Selected
              </button>
            )}
            <button type="button" className="prd-bulk-btn" onClick={() => setSelectedIds([])}>
              <Icon name="x" size={13} /> Clear
            </button>
          </div>
        )}

        <div className="prd-table-card">
          {loading ? (
            <div className="prd-empty">
              <div className="spinner" />
              <p>Loading products...</p>
            </div>
          ) : pageRows.length === 0 ? (
            <div className="prd-empty">
              <Icon name="package" size={28} />
              <p>No products match your filters.</p>
              <button type="button" className="prd-btn-ghost" onClick={resetFilters}>Reset Filters</button>
            </div>
          ) : (
            <div className="prd-table-scroll">
              <table className="prd-table">
                <thead>
                  <tr>
                    <th className="prd-th-check">
                      <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === pageRows.length && pageRows.length > 0} aria-label="Select all products" />
                    </th>
                    <th className="prd-th-num">Sl No.</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Product Code</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th className="prd-th-num">MRP</th>
                    <th className="prd-th-num">Selling Price</th>
                    <th className="prd-th-actions">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p, rowIdx) => {
                    const status = getStockStatus(p);
                    const meta = STATUS_META[status];
                    return (
                      <tr key={p.id}>
                        <td className="prd-cell-check">
                          <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => handleSelectOne(p.id)} aria-label={`Select ${p.name}`} />
                        </td>
                        <td className="prd-cell-num">{pageStart + rowIdx}</td>
                        <td>
                          <div className="prd-name-wrap">
                            <div className="prd-name">{p.name}</div>
                            <span className={`prd-status prd-status--${meta.cls}`}>{meta.label}</span>
                          </div>
                        </td>
                        <td className="prd-muted">{categoryName(p.category_id)}</td>
                        <td className="prd-code">{p.sku || p.item_code || '—'}</td>
                        <td className="prd-stock">{fmtQty(p.stock_quantity)}</td>
                        <td className="prd-muted">{p.unit || '—'}</td>
                        <td className="prd-price">{Number(p.mrp) > 0 ? fmtCurrency(p.mrp) : '—'}</td>
                        <td className="prd-price">{fmtCurrency(p.unit_price)}</td>
                        <td>
                          <div className="prd-row-actions">
                            {canUpdate && (
                              <>
                                <button type="button" className="prd-row-btn prd-row-btn--in" title="Stock In" onClick={() => setStockMove({ product: p, mode: 'in' })}>
                                  <Icon name="plus" size={13} /> Stock In
                                </button>
                                <button type="button" className="prd-row-btn prd-row-btn--out" title="Stock Out" onClick={() => setStockMove({ product: p, mode: 'out' })}>
                                  <Icon name="minus" size={13} /> Stock Out
                                </button>
                              </>
                            )}
                            {canUpdate && (
                              <button type="button" className="prd-row-icon" title="Edit Product" onClick={() => setEditProduct({ ...p })}>
                                <Icon name="edit" size={15} />
                              </button>
                            )}
                            {canDelete && (
                              <button type="button" className="prd-row-icon prd-row-icon--danger" title="Delete" onClick={() => setDeleteTarget(p)}>
                                <Icon name="trash" size={15} />
                              </button>
                            )}
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

        <div className="prd-footer">
          <div className="prd-footer-info">
            Showing {pageStart}–{pageEnd} of {filtered.length.toLocaleString('en-IN')} products
          </div>
          <div className="prd-rows-per">
            Rows per page
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="prd-pagination">
            <button type="button" className="prd-pg-btn" onClick={goPrev} disabled={safePage <= 1} aria-label="Previous page">
              Previous
            </button>
            {pageRange[0] > 1 && <>
              <button type="button" className={`prd-pg-num${safePage === 1 ? ' active' : ''}`} onClick={() => setPage(1)}>1</button>
              {pageRange[0] > 2 && <span className="prd-pg-ellipsis">…</span>}
            </>}
            {pageRange.map((n) => (
              <button key={n} type="button" className={`prd-pg-num${n === safePage ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            {pageRange[pageRange.length - 1] < totalPages && <>
              {pageRange[pageRange.length - 1] < totalPages - 1 && <span className="prd-pg-ellipsis">…</span>}
              <button type="button" className={`prd-pg-num${safePage === totalPages ? ' active' : ''}`} onClick={() => setPage(totalPages)}>{totalPages}</button>
            </>}
            <button type="button" className="prd-pg-btn" onClick={goNext} disabled={safePage >= totalPages} aria-label="Next page">
              Next
            </button>
          </div>
        </div>
      </div>

      <input ref={importRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => handleImportFile(e.target.files?.[0])} aria-hidden="true" tabIndex={-1} />

      <AddProductPanel open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleCreate} />

      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title="Edit Product" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditProduct(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleEditSave} loading={saving} icon="save">Save Changes</Button>
          </>
        }>
        {editProduct && (
          <div className="prd-edit-grid">
            <Field label="Product Name" required>
              <Input value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} />
            </Field>
            <Field label="Product Code / SKU">
              <Input value={editProduct.sku || ''} onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })} />
            </Field>
            <Field label="Category">
              <Select placeholder="None" value={editProduct.category_id || ''} onChange={(v) => setEditProduct({ ...editProduct, category_id: v })} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Brand">
              <Input value={editProduct.brand || ''} onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })} />
            </Field>
            <Field label="Supplier">
              <Select placeholder="None" value={editProduct.supplier_id || ''} onChange={(v) => setEditProduct({ ...editProduct, supplier_id: v })} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
            </Field>
            <Field label="Unit">
              <Select placeholder="None" value={editProduct.unit || ''} onChange={(v) => setEditProduct({ ...editProduct, unit: v })} options={unitOptions} />
            </Field>
            <Field label="Selling Price">
              <Input type="number" min="0" step="0.01" value={editProduct.unit_price ?? 0} onChange={(e) => setEditProduct({ ...editProduct, unit_price: e.target.value })} />
            </Field>
            <Field label="MRP">
              <Input type="number" min="0" step="0.01" value={editProduct.mrp ?? 0} onChange={(e) => setEditProduct({ ...editProduct, mrp: e.target.value })} />
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

      <StockMoveModal move={stockMove} saving={saving} onClose={() => setStockMove(null)} onSave={handleStockMove} />
      <BulkStockMoveModal move={bulkStockMove} saving={saving} onClose={() => setBulkStockMove(null)} onSave={handleBulkStockMove} />
      <ChangeValueModal kind="category" open={!!changeCategory} saving={saving} ids={changeCategory?.ids || []} options={categories} onClose={() => setChangeCategory(null)} onSave={handleChangeCategory} />
      <ChangeValueModal kind="supplier" open={!!changeSupplier} saving={saving} ids={changeSupplier?.ids || []} options={suppliers} onClose={() => setChangeSupplier(null)} onSave={handleChangeSupplier} />

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
        }>
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
    <Modal open onClose={onClose} title={isOut ? 'Stock Out' : 'Stock In'} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant={isOut ? 'danger' : 'primary'} loading={saving} onClick={() => onSave(qty)} icon={isOut ? 'arrow-up' : 'plus'}>
            {isOut ? `Remove ${qty} from Stock` : `Add ${qty} to Stock`}
          </Button>
        </>
      }>
      <p>
        {isOut ? 'Remove quantity from' : 'Add quantity to'} <strong>{move.product.name}</strong> (current: {fmtQty(move.product.stock_quantity)}).
      </p>
      <Input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} autoFocus />
    </Modal>
  );
}

function BulkStockMoveModal({ move, saving, onClose, onSave }) {
  const [qty, setQty] = useState(1);
  useEffect(() => { if (move) setQty(1); }, [move]);
  if (!move) return null;
  const isOut = move.mode === 'out';
  return (
    <Modal open onClose={onClose} title={isOut ? 'Bulk Stock Out' : 'Bulk Stock In'} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant={isOut ? 'danger' : 'primary'} loading={saving} onClick={() => onSave(qty)} icon={isOut ? 'arrow-up' : 'plus'}>
            {isOut ? `Remove ${qty} from ${move.ids.length} product(s)` : `Add ${qty} to ${move.ids.length} product(s)`}
          </Button>
        </>
      }>
      <p>
        {isOut ? 'Remove quantity from' : 'Add quantity to'} <strong>{move.ids.length} selected product(s)</strong>.
      </p>
      <Input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} autoFocus />
    </Modal>
  );
}

function ChangeValueModal({ kind, open, saving, ids, options, onClose, onSave }) {
  const [value, setValue] = useState('');
  useEffect(() => { if (open) setValue(''); }, [open]);
  if (!open) return null;
  const label = kind === 'supplier' ? 'Supplier' : 'Category';
  return (
    <Modal open onClose={onClose} title={`Change ${label}`} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button loading={saving} disabled={!value} onClick={() => onSave(value)} icon="check">Apply</Button>
        </>
      }>
      <p>Update <strong>{label}</strong> for <strong>{ids.length} selected product(s)</strong>:</p>
      <Select placeholder={`Select ${label}`} value={value} onChange={setValue} options={options.map((o) => ({ value: o.id, label: o.name }))} />
    </Modal>
  );
}