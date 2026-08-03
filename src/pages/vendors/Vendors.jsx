import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { invoiceService } from '../../services/invoice/index.js';
import { notificationManager } from '../../managers/index.js';
import { invalidateCache } from '../../services/ui-sync/index.js';
import { usePermission } from '../../identity/authorization/PermissionContext.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { useFullscreen } from '../../components/layout/FullscreenContext.jsx';

const STATUS_META = {
  active: { label: 'Active', cls: 'active' },
  pending: { label: 'Pending', cls: 'pending' },
  inactive: { label: 'Inactive', cls: 'inactive' },
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

const PAYMENT_TERMS = ['Immediate', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days'];

const PAGE_SIZES = [10, 25, 50, 100];

function fmtCurrency(n) {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Vendors() {
  const { hasPermission } = usePermission();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const canCreate = hasPermission(PERMISSIONS.VENDOR_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.VENDOR_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.VENDOR_DELETE);

  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [termsFilter, setTermsFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [viewVendor, setViewVendor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changeStatus, setChangeStatus] = useState(null);
  const [changeCategory, setChangeCategory] = useState(null);

  const searchRef = useRef(null);
  const importRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [v, c] = await Promise.all([
        invoiceService.listSuppliers(),
        invoiceService.listSupplierCategories().catch(() => []),
      ]);
      setVendors(v);
      setCategories(c);
    } catch (e) {
      notificationManager.error('Vendors', e.message || 'Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const cityOptions = useMemo(() => {
    const cities = [...new Set((vendors || []).map((v) => (v.city || '').trim()).filter(Boolean))].sort();
    return cities.map((c) => ({ value: c, label: c }));
  }, [vendors]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return (vendors || []).filter((v) => {
      if (q && !(
        (v.name || '').toLowerCase().includes(q) ||
        (v.company || '').toLowerCase().includes(q) ||
        (v.contact_person || '').toLowerCase().includes(q) ||
        (v.phone || '').toLowerCase().includes(q) ||
        (v.email || '').toLowerCase().includes(q) ||
        (v.city || '').toLowerCase().includes(q)
      )) return false;
      if (statusFilter && v.status !== statusFilter) return false;
      if (categoryId && v.category_id !== categoryId) return false;
      if (cityFilter && v.city !== cityFilter) return false;
      if (termsFilter && v.payment_terms !== termsFilter) return false;
      return true;
    });
  }, [vendors, debouncedQuery, statusFilter, categoryId, cityFilter, termsFilter]);

  const kpis = useMemo(() => {
    let active = 0, pending = 0, inactive = 0, payable = 0;
    (vendors || []).forEach((v) => {
      if (v.status === 'active') active++;
      else if (v.status === 'pending') pending++;
      else if (v.status === 'inactive') inactive++;
      payable += Number(v.outstanding_amount) || 0;
    });
    const total = vendors.length;
    return {
      total,
      active,
      pending,
      inactive,
      payable,
      activePct: total ? Math.round((active / total) * 10000) / 100 : 0,
      pendingPct: total ? Math.round((pending / total) * 10000) / 100 : 0,
      inactivePct: total ? Math.round((inactive / total) * 10000) / 100 : 0,
    };
  }, [vendors]);

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
    setQuery(''); setStatusFilter(''); setCategoryId(''); setCityFilter(''); setTermsFilter(''); setPage(1);
  };

  const refresh = useCallback(async () => {
    invalidateCache('suppliers');
    await loadData();
  }, [loadData]);

  const categoryName = (id) => {
    const c = categories.find((x) => x.id === id);
    return c ? c.name : '—';
  };

  const handleAddCategory = useCallback(async (name) => {
    const cat = await invoiceService.createSupplierCategory({ name });
    await refresh();
    return cat.id;
  }, [refresh]);

  const handleCreate = useCallback(async (vendor) => {
    setAddOpen(false);
    notificationManager.success('Vendor', `${vendor.name} added.`);
    await refresh();
  }, [refresh]);

  const handleEditSave = useCallback(async (vendor) => {
    setSaving(true);
    try {
      await invoiceService.updateSupplier(vendor.id, {
        name: vendor.name,
        company: vendor.company,
        contact_person: vendor.contact_person,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        gstin: vendor.gstin,
        category_id: vendor.category_id || null,
        city: vendor.city,
        payment_terms: vendor.payment_terms,
        status: vendor.status || 'active',
      });
      notificationManager.success('Vendor', `${vendor.name} updated.`);
      setEditVendor(null);
      await refresh();
    } catch (e) {
      notificationManager.error('Vendor', e.message || 'Failed to update vendor.');
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await invoiceService.deleteSupplier(deleteTarget.id);
      notificationManager.success('Vendor', `${deleteTarget.name} deleted.`);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      notificationManager.error('Vendor', e.message || 'Failed to delete vendor.');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refresh]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    let ok = 0, failed = 0;
    for (const id of selectedIds) {
      try { await invoiceService.deleteSupplier(id); ok++; } catch { failed++; }
    }
    if (ok > 0) notificationManager.success('Vendors', `Deleted ${ok} vendor(s).`);
    if (failed > 0) notificationManager.error('Vendors', `${failed} vendor(s) failed.`);
    setSelectedIds([]);
    setDeleting(false);
    await refresh();
  }, [selectedIds, refresh]);

  const handleChangeStatus = useCallback(async (status) => {
    if (!changeStatus || !status) return;
    setSaving(true);
    let ok = 0, failed = 0;
    for (const id of changeStatus.ids) {
      try { await invoiceService.updateSupplier(id, { status }); ok++; } catch { failed++; }
    }
    if (ok > 0) notificationManager.success('Vendors', `Updated status for ${ok} vendor(s).`);
    if (failed > 0) notificationManager.error('Vendors', `${failed} vendor(s) failed.`);
    setChangeStatus(null);
    setSelectedIds([]);
    await refresh();
    setSaving(false);
  }, [changeStatus, refresh]);

  const handleChangeCategory = useCallback(async (catId) => {
    if (!changeCategory || !catId) return;
    setSaving(true);
    let ok = 0, failed = 0;
    for (const id of changeCategory.ids) {
      try { await invoiceService.updateSupplier(id, { category_id: catId }); ok++; } catch { failed++; }
    }
    if (ok > 0) notificationManager.success('Vendors', `Updated category for ${ok} vendor(s).`);
    if (failed > 0) notificationManager.error('Vendors', `${failed} vendor(s) failed.`);
    setChangeCategory(null);
    setSelectedIds([]);
    await refresh();
    setSaving(false);
  }, [changeCategory, refresh]);

  const handleSendEmail = useCallback(() => {
    if (selectedIds.length === 0) return;
    const emails = (vendors || [])
      .filter((v) => selectedIds.includes(v.id) && v.email)
      .map((v) => v.email);
    if (emails.length === 0) {
      notificationManager.warning('Vendors', 'Selected vendors have no email address.');
      return;
    }
    window.location.href = `mailto:${emails.join(',')}?subject=CoreX Billing`;
    notificationManager.success('Vendors', `Opening mail client for ${emails.length} vendor(s).`);
  }, [vendors, selectedIds]);

  const downloadCsv = useCallback((rows, filename) => {
    const header = ['Sl No', 'Vendor Name', 'Contact Person', 'Phone', 'Email', 'Category', 'City', 'Payment Terms', 'Outstanding (Rs)', 'Status'];
    const lines = rows.map((v, i) => [
      i + 1,
      v.name,
      v.contact_person || '',
      v.phone || '',
      v.email || '',
      categoryName(v.category_id),
      v.city || '',
      v.payment_terms || '',
      Number(v.outstanding_amount) || 0,
      v.status || 'active',
    ]);
    const all = [header, ...lines];
    const csv = all.map((row) => row.map((val) => {
      const s = String(val ?? '');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helper is a pure lookup over the listed dep
  }, [categories]);

  const exportFiltered = useCallback(() => {
    downloadCsv(filtered, 'vendors.csv');
    notificationManager.success('Export', `${filtered.length} vendor(s) exported.`);
  }, [filtered, downloadCsv]);

  const exportSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const rows = (vendors || []).filter((v) => selectedIds.includes(v.id));
    downloadCsv(rows, 'vendors-selected.csv');
    notificationManager.success('Export', `${rows.length} vendor(s) exported.`);
  }, [vendors, selectedIds, downloadCsv]);

  const handleImportFile = useCallback(async (file) => {
    if (!file) return;
    setSaving(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) throw new Error('CSV needs a header row and at least one vendor.');
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
        const name = cells[idx('vendor name') || idx('name')] || '';
        if (!name) { failed++; continue; }
        const catName = getCell(cells, 'category').trim();
        const category = catName ? categories.find((c) => c.name.toLowerCase() === catName.toLowerCase()) : null;
        const outstanding = Number(getCell(cells, 'outstanding', 'outstanding (rs)')) || 0;
        const rawStatus = getCell(cells, 'status').trim().toLowerCase();
        const status = ['active', 'pending', 'inactive'].includes(rawStatus) ? rawStatus : 'active';
        try {
          await invoiceService.createSupplier({
            name,
            company: getCell(cells, 'company') || null,
            contact_person: getCell(cells, 'contact person', 'contact') || null,
            email: getCell(cells, 'email') || null,
            phone: getCell(cells, 'phone', 'mobile') || null,
            category_id: category ? category.id : null,
            city: getCell(cells, 'city') || null,
            payment_terms: getCell(cells, 'payment terms', 'terms') || null,
            outstanding_amount: outstanding,
            status,
          });
          ok++;
        } catch { failed++; }
      }
      notificationManager.success('Import', `Imported ${ok} vendor(s).`);
      if (failed > 0) notificationManager.warning('Import', `${failed} row(s) skipped.`);
      await refresh();
    } catch (e) {
      notificationManager.error('Import', e.message || 'Failed to import CSV.');
    } finally {
      setSaving(false);
      if (importRef.current) importRef.current.value = '';
    }
  }, [refresh, categories]);

  const openImport = () => importRef.current?.click();

  const pageRange = useMemo(() => {
    const pages = [];
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, safePage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  return (
    <div className="vendors-page">
      <header className="vdr-header">
        <div className="vdr-header-title">
          <h1>Vendors</h1>
          <p>Manage your vendors and supplier information.</p>
        </div>
        <div className="vdr-header-actions">
          <div className="vdr-search">
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search vendors..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              aria-label="Search vendors"
            />
            <kbd>Ctrl K</kbd>
          </div>
          <button type="button" className="vdr-icon-btn" title="Barcode Scanner" onClick={() => searchRef.current?.focus()}>
            <Icon name="scan" size={17} />
          </button>
          <button type="button" className="vdr-icon-btn" title="Notifications" onClick={() => {
            notificationManager.info('Notifications', kpis.pending > 0 ? `${kpis.pending} vendor(s) pending review.` : 'No new notifications.');
          }}>
            <Icon name="bell" size={17} />
            {kpis.pending > 0 && <span className="vdr-notif-dot" />}
          </button>
          <button type="button" className="vdr-icon-btn" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            <Icon name="maximize" size={17} />
          </button>
          {canCreate && (
            <Button variant="primary" className="vdr-btn-primary" icon="plus" onClick={() => setAddOpen(true)}>Add Vendor</Button>
          )}
        </div>
      </header>

      <div className="vdr-scroll">
        <div className="vdr-kpis">
          <div className="vdr-kpi">
            <div className="vdr-kpi-top">
              <div className="vdr-kpi-icon violet"><Icon name="users" size={17} /></div>
              <span className="vdr-kpi-label">Total Vendors</span>
            </div>
            <div className="vdr-kpi-value">{loading ? '…' : kpis.total.toLocaleString('en-IN')}</div>
            <div className="vdr-kpi-sub">All Vendors</div>
          </div>
          <div className="vdr-kpi">
            <div className="vdr-kpi-top">
              <div className="vdr-kpi-icon green"><Icon name="check" size={17} /></div>
              <span className="vdr-kpi-label">Active Vendors</span>
            </div>
            <div className="vdr-kpi-value">{loading ? '…' : kpis.active.toLocaleString('en-IN')}</div>
            <div className="vdr-kpi-sub">{kpis.activePct}% of total</div>
          </div>
          <div className="vdr-kpi">
            <div className="vdr-kpi-top">
              <div className="vdr-kpi-icon orange"><Icon name="clock" size={17} /></div>
              <span className="vdr-kpi-label">Pending Vendors</span>
            </div>
            <div className="vdr-kpi-value">{loading ? '…' : kpis.pending.toLocaleString('en-IN')}</div>
            <div className="vdr-kpi-sub">{kpis.pendingPct}% of total</div>
          </div>
          <div className="vdr-kpi">
            <div className="vdr-kpi-top">
              <div className="vdr-kpi-icon red"><Icon name="x" size={17} /></div>
              <span className="vdr-kpi-label">Inactive Vendors</span>
            </div>
            <div className="vdr-kpi-value">{loading ? '…' : kpis.inactive.toLocaleString('en-IN')}</div>
            <div className="vdr-kpi-sub">{kpis.inactivePct}% of total</div>
          </div>
          <div className="vdr-kpi">
            <div className="vdr-kpi-top">
              <div className="vdr-kpi-icon money"><Icon name="wallet" size={17} /></div>
              <span className="vdr-kpi-label">Total Payable</span>
            </div>
            <div className="vdr-kpi-value">{loading ? '…' : fmtCurrency(kpis.payable)}</div>
            <div className="vdr-kpi-sub">Outstanding Amount</div>
          </div>
        </div>

        <div className="vdr-toolbar">
          <div className="vdr-filter-search">
            <Icon name="search" size={16} />
            <input
              type="text"
              placeholder="Search vendors by name, phone, email..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              aria-label="Search vendors"
            />
          </div>
          <Select
            className="vdr-filter-select"
            placeholder="Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={STATUS_OPTIONS}
          />
          <Select
            className="vdr-filter-select"
            placeholder="Category"
            value={categoryId}
            onChange={(v) => { setCategoryId(v); setPage(1); }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <button type="button" className={`vdr-tool-btn${filtersOpen ? ' vdr-tool-btn--active' : ''}`} onClick={() => setFiltersOpen((o) => !o)} title="Toggle more filters">
            <Icon name="filter" size={15} /> Filters
          </button>
          <button type="button" className="vdr-reset-btn" onClick={resetFilters} title="Reset filters">
            <Icon name="refresh-cw" size={15} /> Reset
          </button>
          <button type="button" className="vdr-tool-btn" onClick={exportFiltered} title="Export vendors">
            <Icon name="download" size={15} /> Export
          </button>
          <button type="button" className="vdr-tool-btn" onClick={openImport} title="Import vendors">
            <Icon name="upload" size={15} /> Import
          </button>
        </div>

        {filtersOpen && (
          <div className="vdr-toolbar vdr-toolbar--advanced">
            <Select
              className="vdr-filter-select"
              placeholder="City"
              value={cityFilter}
              onChange={(v) => { setCityFilter(v); setPage(1); }}
              options={cityOptions}
            />
            <Select
              className="vdr-filter-select"
              placeholder="Payment Terms"
              value={termsFilter}
              onChange={(v) => { setTermsFilter(v); setPage(1); }}
              options={PAYMENT_TERMS.map((t) => ({ value: t, label: t }))}
            />
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="vdr-bulk-bar">
            <span className="vdr-bulk-count">{selectedIds.length} selected</span>
            {canUpdate && (
              <>
                <button type="button" className="vdr-bulk-btn" onClick={exportSelected}>
                  <Icon name="download" size={13} /> Export Selected
                </button>
                <button type="button" className="vdr-bulk-btn" onClick={() => setChangeStatus({ ids: selectedIds })}>
                  <Icon name="flag" size={13} /> Change Status
                </button>
                <button type="button" className="vdr-bulk-btn" onClick={() => setChangeCategory({ ids: selectedIds })}>
                  <Icon name="folder" size={13} /> Assign Category
                </button>
                <button type="button" className="vdr-bulk-btn" onClick={handleSendEmail}>
                  <Icon name="send" size={13} /> Send Email
                </button>
              </>
            )}
            {canDelete && (
              <button type="button" className="vdr-bulk-btn vdr-bulk-btn--danger" onClick={handleBulkDelete} disabled={deleting}>
                <Icon name="trash" size={13} /> Delete Selected
              </button>
            )}
            <button type="button" className="vdr-bulk-btn" onClick={() => setSelectedIds([])}>
              <Icon name="x" size={13} /> Clear
            </button>
          </div>
        )}

        <div className="vdr-table-card">
          {loading ? (
            <div className="vdr-empty">
              <div className="spinner" />
              <p>Loading vendors...</p>
            </div>
          ) : pageRows.length === 0 ? (
            <div className="vdr-empty">
              <Icon name="truck" size={28} />
              <p>No vendors match your filters.</p>
              <button type="button" className="vdr-btn-ghost" onClick={resetFilters}>Reset Filters</button>
            </div>
          ) : (
            <div className="vdr-table-scroll">
              <table className="vdr-table">
                <thead>
                  <tr>
                    <th className="vdr-th-check">
                      <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === pageRows.length && pageRows.length > 0} aria-label="Select all vendors" />
                    </th>
                    <th className="vdr-th-num">Sl No.</th>
                    <th>Vendor Name</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Category</th>
                    <th>City</th>
                    <th>Payment Terms</th>
                    <th className="vdr-th-num">Outstanding (₹)</th>
                    <th>Status</th>
                    <th className="vdr-th-actions">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((v, rowIdx) => {
                    const meta = STATUS_META[v.status] || STATUS_META.active;
                    return (
                      <tr key={v.id}>
                        <td className="vdr-cell-check">
                          <input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => handleSelectOne(v.id)} aria-label={`Select ${v.name}`} />
                        </td>
                        <td className="vdr-cell-num">{pageStart + rowIdx}</td>
                        <td>
                          <div className="vdr-name-wrap">
                            <div className="vdr-name">{v.name}</div>
                            {v.company && <span className="vdr-sub">{v.company}</span>}
                          </div>
                        </td>
                        <td className="vdr-muted">{v.contact_person || '—'}</td>
                        <td className="vdr-muted">{v.phone || '—'}</td>
                        <td className="vdr-email">{v.email || '—'}</td>
                        <td className="vdr-muted">{categoryName(v.category_id)}</td>
                        <td className="vdr-muted">{v.city || '—'}</td>
                        <td className="vdr-muted">{v.payment_terms || '—'}</td>
                        <td className={`vdr-outstanding${Number(v.outstanding_amount) > 0 ? ' vdr-outstanding--due' : ''}`}>{fmtCurrency(v.outstanding_amount)}</td>
                        <td>
                          <span className={`vdr-status vdr-status--${meta.cls}`}>{meta.label}</span>
                        </td>
                        <td>
                          <div className="vdr-row-actions">
                            <button type="button" className="vdr-row-icon" title="View Vendor" onClick={() => setViewVendor(v)}>
                              <Icon name="eye" size={15} />
                            </button>
                            {canUpdate && (
                              <button type="button" className="vdr-row-icon" title="Edit Vendor" onClick={() => setEditVendor({ ...v })}>
                                <Icon name="edit" size={15} />
                              </button>
                            )}
                            {canDelete && (
                              <button type="button" className="vdr-row-icon vdr-row-icon--danger" title="Delete Vendor" onClick={() => setDeleteTarget(v)}>
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

        <div className="vdr-footer">
          <div className="vdr-footer-info">
            Showing {pageStart}–{pageEnd} of {filtered.length.toLocaleString('en-IN')} vendors
          </div>
          <div className="vdr-rows-per">
            Rows per page
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="vdr-pagination">
            <button type="button" className="vdr-pg-btn" onClick={goPrev} disabled={safePage <= 1} aria-label="Previous page">
              Previous
            </button>
            {pageRange[0] > 1 && <>
              <button type="button" className={`vdr-pg-num${safePage === 1 ? ' active' : ''}`} onClick={() => setPage(1)}>1</button>
              {pageRange[0] > 2 && <span className="vdr-pg-ellipsis">…</span>}
            </>}
            {pageRange.map((n) => (
              <button key={n} type="button" className={`vdr-pg-num${n === safePage ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            {pageRange[pageRange.length - 1] < totalPages && <>
              {pageRange[pageRange.length - 1] < totalPages - 1 && <span className="vdr-pg-ellipsis">…</span>}
              <button type="button" className={`vdr-pg-num${safePage === totalPages ? ' active' : ''}`} onClick={() => setPage(totalPages)}>{totalPages}</button>
            </>}
            <button type="button" className="vdr-pg-btn" onClick={goNext} disabled={safePage >= totalPages} aria-label="Next page">
              Next
            </button>
          </div>
        </div>
      </div>

      <input ref={importRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => handleImportFile(e.target.files?.[0])} aria-hidden="true" tabIndex={-1} />

      <VendorFormModal open={addOpen} categories={categories} saving={saving} onAddCategory={handleAddCategory} onClose={() => setAddOpen(false)} onSubmit={handleCreate} />

      <VendorFormModal open={!!editVendor} vendor={editVendor} categories={categories} saving={saving} onAddCategory={handleAddCategory} onClose={() => setEditVendor(null)} onSubmit={handleEditSave} />

      <VendorViewModal open={!!viewVendor} vendor={viewVendor} categoryName={categoryName} onClose={() => setViewVendor(null)} />

      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title="Delete Vendor"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
          </>
        }>
        <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
      </Modal>

      <ChangeValueModal kind="status" open={!!changeStatus} saving={saving} ids={changeStatus?.ids || []} options={STATUS_OPTIONS} onClose={() => setChangeStatus(null)} onSave={handleChangeStatus} />
      <ChangeValueModal kind="category" open={!!changeCategory} saving={saving} ids={changeCategory?.ids || []} options={categories.map((c) => ({ value: c.id, label: c.name }))} onClose={() => setChangeCategory(null)} onSave={handleChangeCategory} />
    </div>
  );
}

function VendorFormModal({ open, vendor, categories, saving, onAddCategory, onClose, onSubmit }) {
  const isEdit = !!vendor;
  const [form, setForm] = useState({
    name: '',
    company: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    category_id: '',
    city: '',
    payment_terms: '',
    status: 'active',
  });
  const [errors, setErrors] = useState({});
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: vendor?.name || '',
        company: vendor?.company || '',
        contact_person: vendor?.contact_person || '',
        email: vendor?.email || '',
        phone: vendor?.phone || '',
        address: vendor?.address || '',
        gstin: vendor?.gstin || '',
        category_id: vendor?.category_id || '',
        city: vendor?.city || '',
        payment_terms: vendor?.payment_terms || '',
        status: vendor?.status || 'active',
      });
      setErrors({});
      setNewCatOpen(false);
      setNewCatName('');
    }
  }, [open, vendor]);

  if (!open) return null;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Vendor name is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit(isEdit ? { ...form, id: vendor.id } : { ...form, outstanding_amount: 0 });
  };

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setAddingCat(true);
    try {
      const id = await onAddCategory(name);
      set('category_id', id);
      setNewCatOpen(false);
      setNewCatName('');
    } catch (e) {
      notificationManager.error('Category', e.message || 'Failed to add category.');
    } finally {
      setAddingCat(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Vendor' : 'Add Vendor'} size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving} icon="save">{isEdit ? 'Save Changes' : 'Add Vendor'}</Button>
        </>
      }>
      <div className="vdr-edit-grid">
        <Field label="Vendor Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Shree Ganesh Traders" autoFocus />
        </Field>
        <Field label="Company">
          <Input value={form.company} onChange={(e) => set('company', e.target.value)} />
        </Field>
        <Field label="Contact Person">
          <Input value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} placeholder="Primary contact" />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Mobile number" />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="vendor@example.com" />
        </Field>
        <Field label="GSTIN">
          <Input value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="e.g. 27AABCU9603R1ZM" />
        </Field>
        <Field label="Category">
          <div className="vdr-cat-field">
            <Select
              placeholder="Select category"
              value={form.category_id}
              onChange={(v) => set('category_id', v)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <button type="button" className="vdr-cat-add" title="Add category" onClick={() => setNewCatOpen((o) => !o)}>
              <Icon name="plus" size={14} />
            </button>
          </div>
          {newCatOpen && (
            <div className="vdr-cat-new">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New category name"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
              />
              <Button className="vdr-cat-new-add" loading={addingCat} onClick={addCategory}>Add</Button>
            </div>
          )}
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Delhi" />
        </Field>
        <Field label="Payment Terms">
          <Select
            placeholder="Select terms"
            value={form.payment_terms}
            onChange={(v) => set('payment_terms', v)}
            options={PAYMENT_TERMS.map((t) => ({ value: t, label: t }))}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(v) => set('status', v)}
            options={STATUS_OPTIONS}
          />
        </Field>
        <Field label="Address" className="vdr-field-wide">
          <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Billing / delivery address" />
        </Field>
      </div>
    </Modal>
  );
}

function VendorViewModal({ open, vendor, categoryName, onClose }) {
  if (!open || !vendor) return null;
  const meta = STATUS_META[vendor.status] || STATUS_META.active;
  const rows = [
    ['Vendor Name', vendor.name],
    ['Company', vendor.company || '—'],
    ['Contact Person', vendor.contact_person || '—'],
    ['Phone', vendor.phone || '—'],
    ['Email', vendor.email || '—'],
    ['Category', categoryName(vendor.category_id)],
    ['City', vendor.city || '—'],
    ['Payment Terms', vendor.payment_terms || '—'],
    ['GSTIN', vendor.gstin || '—'],
    ['Address', vendor.address || '—'],
    ['Outstanding', fmtCurrency(vendor.outstanding_amount)],
    ['Added', vendor.created_at ? new Date(vendor.created_at).toLocaleDateString('en-IN') : '—'],
  ];
  return (
    <Modal open onClose={onClose} title="Vendor Details" size="md"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="vdr-view-head">
        <div className="vdr-view-title">{vendor.name}</div>
        <span className={`vdr-status vdr-status--${meta.cls}`}>{meta.label}</span>
      </div>
      <div className="vdr-view-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="vdr-view-item">
            <span className="vdr-view-label">{label}</span>
            <span className="vdr-view-value">{value}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ChangeValueModal({ kind, open, saving, ids, options, onClose, onSave }) {
  const [value, setValue] = useState('');
  useEffect(() => { if (open) setValue(''); }, [open]);
  if (!open) return null;
  const label = kind === 'status' ? 'Status' : 'Category';
  return (
    <Modal open onClose={onClose} title={`Change ${label}`} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button loading={saving} disabled={!value} onClick={() => onSave(value)} icon="check">Apply</Button>
        </>
      }>
      <p>Update <strong>{label}</strong> for <strong>{ids.length} selected vendor(s)</strong>:</p>
      <Select placeholder={`Select ${label}`} value={value} onChange={setValue} options={options} />
    </Modal>
  );
}
