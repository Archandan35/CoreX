import { useEffect, useState, useCallback, useMemo } from 'react';
import Icon from '../ui/Icon.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Pagination from '../ui/Pagination.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { invoiceService } from '../../services/invoice/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';
import { describeSchemaError } from '../../utils/dbErrors.js';

const PAGE_SIZE = 10;

const MASTER_TABS = [
  {
    key: 'categories',
    label: 'Category',
    singular: 'Category',
    icon: 'folder',
    fields: [
      { key: 'name', label: 'Category Name', required: true, placeholder: 'e.g. Electronics' },
    ],
    list: () => invoiceService.listProductCategories(),
    create: (p) => invoiceService.createProductCategory(p),
    update: (id, p) => invoiceService.updateProductCategory(id, p),
    remove: (id) => invoiceService.deleteProductCategory(id),
  },
  {
    key: 'brands',
    label: 'Brand',
    singular: 'Brand',
    icon: 'tag',
    fields: [
      { key: 'name', label: 'Brand Name', required: true, placeholder: 'e.g. Samsung' },
    ],
    list: () => invoiceService.listBrands(),
    create: (p) => invoiceService.createBrand(p),
    update: (id, p) => invoiceService.updateBrand(id, p),
    remove: (id) => invoiceService.deleteBrand(id),
  },
  {
    key: 'units',
    label: 'Unit',
    singular: 'Unit',
    icon: 'package',
    fields: [
      { key: 'name', label: 'Unit Name', required: true, placeholder: 'e.g. Pcs' },
    ],
    list: () => invoiceService.listUnits(),
    create: (p) => invoiceService.createUnit(p),
    update: (id, p) => invoiceService.updateUnit(id, p),
    remove: (id) => invoiceService.deleteUnit(id),
    hasPrimary: true,
    setPrimary: (id) => invoiceService.setPrimaryUnit(id),
  },
  {
    key: 'taxRates',
    label: 'Tax Rate',
    singular: 'Tax Rate',
    icon: 'percent',
    fields: [
      { key: 'name', label: 'Rate Name', required: true, placeholder: 'e.g. GST 18%' },
      { key: 'rate', label: 'Rate (%)', required: true, type: 'number', placeholder: 'e.g. 18' },
    ],
    list: () => invoiceService.listTaxRates(),
    create: (p) => invoiceService.createTaxRate(p),
    update: (id, p) => invoiceService.updateTaxRate(id, p),
    remove: (id) => invoiceService.deleteTaxRate(id),
    hasDefault: true,
    setDefault: (id) => invoiceService.setDefaultTaxRate(id),
  },
  {
    key: 'itemGroups',
    label: 'Item Group',
    singular: 'Item Group',
    icon: 'layers',
    fields: [
      { key: 'name', label: 'Group Name', required: true, placeholder: 'e.g. Beverages' },
    ],
    list: () => invoiceService.listItemGroups(),
    create: (p) => invoiceService.createItemGroup(p),
    update: (id, p) => invoiceService.updateItemGroup(id, p),
    remove: (id) => invoiceService.deleteItemGroup(id),
  },
  {
    key: 'warehouses',
    label: 'Warehouse',
    singular: 'Warehouse',
    icon: 'building',
    fields: [
      { key: 'name', label: 'Warehouse Name', required: true, placeholder: 'e.g. Main Store' },
      { key: 'location', label: 'Location', placeholder: 'e.g. Mumbai' },
    ],
    list: () => invoiceService.listWarehouses(),
    create: (p) => invoiceService.createWarehouse(p),
    update: (id, p) => invoiceService.updateWarehouse(id, p),
    remove: (id) => invoiceService.deleteWarehouse(id),
  },
  {
    key: 'manufacturers',
    label: 'Manufacturer',
    singular: 'Manufacturer',
    icon: 'building2',
    fields: [
      { key: 'name', label: 'Manufacturer Name', required: true, placeholder: 'e.g. Bosch' },
    ],
    list: () => invoiceService.listManufacturers(),
    create: (p) => invoiceService.createManufacturer(p),
    update: (id, p) => invoiceService.updateManufacturer(id, p),
    remove: (id) => invoiceService.deleteManufacturer(id),
  },
];

const MASTER_BY_KEY = Object.fromEntries(MASTER_TABS.map((t) => [t.key, t]));

function makeEmptyForm(tab) {
  const form = {};
  for (const f of tab.fields) form[f.key] = '';
  return form;
}

export default function InventoryMastersPanel({ open, onClose }) {
  const [tab, setTab] = useState(MASTER_TABS[0].key);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const active = MASTER_BY_KEY[tab];

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await active.list();
      setItems(data || []);
    } catch (e) {
      setItems([]);
      setLoadError(describeSchemaError(e) || e.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
    setSearch('');
    setSelectedIds([]);
    setLoadError('');
    load();
  }, [open, tab, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const name = String(it.name || '');
      const extra = active.fields.map((f) => String(it[f.key] ?? '')).join(' ');
      return (name + ' ' + extra).toLowerCase().includes(q);
    });
  }, [items, search, active]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleReset = useCallback(() => {
    setPage(1);
    setSearch('');
    setSelectedIds([]);
  }, []);

  const reload = useCallback(() => {
    active.list()
      .then((data) => { setItems(data || []); setLoadError(''); })
      .catch((e) => { setLoadError(describeSchemaError(e) || e.message || 'Failed to load.'); });
  }, [active]);

  const openAdd = useCallback(() => {
    setEditItem(null);
    setEditForm(makeEmptyForm(active));
    setEditErrors({});
    setEditOpen(true);
  }, [active]);

  const openEdit = useCallback((item) => {
    setEditItem(item);
    const form = makeEmptyForm(active);
    for (const f of active.fields) form[f.key] = item[f.key] ?? form[f.key];
    setEditForm(form);
    setEditErrors({});
    setEditOpen(true);
  }, [active]);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditItem(null);
  }, []);

  const saveEdit = useCallback(async () => {
    const errs = {};
    for (const f of active.fields) {
      if (f.required && !String(editForm[f.key] ?? '').trim()) errs[f.key] = `${f.label} is required.`;
      if (f.type === 'number') {
        const v = Number(editForm[f.key]);
        if (Number.isNaN(v) || v < 0) errs[f.key] = 'Enter a valid value.';
      }
    }
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    const payload = {};
    for (const f of active.fields) {
      payload[f.key] = f.type === 'number' ? Number(editForm[f.key]) : String(editForm[f.key] ?? '').trim();
    }

    setEditSaving(true);
    try {
      if (editItem) {
        await active.update(editItem.id, payload);
        notificationManager.success(active.singular, `${active.singular} updated.`);
      } else {
        await active.create(payload);
        notificationManager.success(active.singular, `${active.singular} created.`);
      }
      closeEdit();
      reload();
    } catch (e) {
      notificationManager.error('Save', describeSchemaError(e) || e.message || 'Failed to save.');
    } finally {
      setEditSaving(false);
    }
  }, [active, editForm, editItem, closeEdit, reload]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await active.remove(deleteTarget.id);
      notificationManager.success('Delete', `${active.singular} deleted.`);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
      reload();
    } catch (e) {
      notificationManager.error('Delete', describeSchemaError(e) || e.message || 'Failed to delete.');
    }
  }, [active, deleteTarget, reload]);

  const togglePrimary = useCallback(async (item) => {
    const now = !!item.is_primary;
    try {
      if (!now) {
        await active.setPrimary(item.id);
      } else {
        await active.update(item.id, { is_primary: false });
      }
      setItems((prev) => prev.map((r) => ({ ...r, is_primary: r.id === item.id ? !now : false })));
    } catch (e) {
      notificationManager.error('Update', describeSchemaError(e) || e.message);
    }
  }, [active]);

  const toggleDefault = useCallback(async (item) => {
    const now = !!item.is_default;
    try {
      if (!now) {
        await active.setDefault(item.id);
      } else {
        await active.update(item.id, { is_default: false });
      }
      setItems((prev) => prev.map((r) => ({ ...r, is_default: r.id === item.id ? !now : false })));
    } catch (e) {
      notificationManager.error('Update', describeSchemaError(e) || e.message);
    }
  }, [active]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(pageRows.map((r) => r.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = useCallback(async () => {
    const ids = selectedIds;
    if (!ids.length) return;
    let ok = 0, failed = 0;
    for (const id of ids) {
      try { await active.remove(id); ok++; } catch { failed++; }
    }
    if (ok > 0) notificationManager.success('Bulk Delete', `${ok} record(s) deleted.`);
    if (failed > 0) notificationManager.error('Bulk Delete', `${failed} record(s) failed.`);
    setSelectedIds([]);
    reload();
  }, [active, selectedIds, reload]);

  if (!open) return null;

  const secondaryFields = active.fields.filter((f) => f.key !== 'name');

  return (
    <>
      <div className="ds-overlay ds-overlay--nested" onClick={onClose}>
        <div className="prefixDrawer" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="drawerHeader">
            <div className="drawerTitle">
              <div className="drawerIcon">
                <Icon name="layers" size={22} />
              </div>
              <div>
                <div className="drawerHeading">Product Masters</div>
                <div className="drawerSubtitle">Manage categories, brands, units, taxes, groups, warehouses &amp; manufacturers</div>
              </div>
            </div>
            <div className="drawerActions">
              <button className="drawerAction" title="Help" onClick={() => notificationManager.info('Help', 'Create and manage the master data used by the product form. Changes appear immediately in new product dropdowns.')}>
                <Icon name="help-circle" size={18} />
              </button>
              <button className="drawerAction" onClick={onClose}>
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>

          {/* Primary Tabs */}
          <div className="mainTabs">
            {MASTER_TABS.map((t) => (
              <button key={t.key} className={`mainTab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                <Icon name={t.icon} size={13} /> {t.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <input
              className="searchBox"
              type="text"
              placeholder={`Search ${active.label.toLowerCase()}...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <button className="refreshBtn" onClick={reload} title="Refresh">
              <Icon name="refresh-cw" size={16} />
            </button>
            <PermissionGate permission={PERMISSIONS.PRODUCT_CREATE}>
              <button className="addButton" onClick={openAdd}>
                <Icon name="plus" size={14} /> Add {active.singular}
              </button>
            </PermissionGate>
          </div>

          {/* Top Info Bar */}
          <div className="topBar">
            <div className="itemCount">{filtered.length} {active.label.toLowerCase()}</div>
          </div>

          {/* Content Area */}
          <div className="drawerContent">
            {loadError && (
              <div className="db-health-banner" role="alert" style={{ marginBottom: 12 }}>
                <div className="db-health-banner__content">
                  <Icon name="alert" size={16} />
                  <span>{loadError}</span>
                </div>
              </div>
            )}
            {loading ? (
              <div className="ps-loading"><div className="spinner" /><p>Loading {active.label.toLowerCase()}...</p></div>
            ) : pageRows.length === 0 ? (
              <div className="emptyState">
                <div className="emptyIcon">
                  <Icon name={active.icon} size={36} />
                </div>
                <div className="emptyTitle">No {active.label.toLowerCase()} found</div>
                <div className="emptyDescription">
                  {search ? 'Try a different search term.' : `Add a ${active.singular.toLowerCase()} to get started.`}
                </div>
                <PermissionGate permission={PERMISSIONS.PRODUCT_CREATE}>
                  <button className="addButton" onClick={openAdd}>
                    <Icon name="plus" size={14} /> Add {active.singular}
                  </button>
                </PermissionGate>
              </div>
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <div className="ps-bulk-bar">
                    <span className="ps-bulk-count">{selectedIds.length} selected</span>
                    <PermissionGate permission={PERMISSIONS.PRODUCT_DELETE}>
                      <button className="ps-bulk-btn ps-bulk-btn--delete" onClick={handleBulkDelete}>
                        <Icon name="trash" size={14} /> Delete
                      </button>
                    </PermissionGate>
                    <button className="ps-bulk-btn" onClick={() => setSelectedIds([])}>
                      <Icon name="x" size={14} /> Clear
                    </button>
                  </div>
                )}
                <div className="ps-table-wrap">
                  <table className="ps-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>
                          <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === pageRows.length && pageRows.length > 0} aria-label="Select all" />
                        </th>
                        <th>{active.singular} Name</th>
                        {secondaryFields.map((f) => (
                          <th key={f.key}>{f.label}</th>
                        ))}
                        {active.hasPrimary && <th style={{ width: 90 }}>Primary</th>}
                        {active.hasDefault && <th style={{ width: 90 }}>Default</th>}
                        <th style={{ width: 90 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((item) => (
                        <tr key={item.id}>
                          <td style={{ width: 36 }}>
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} aria-label={`Select ${item.name}`} />
                          </td>
                          <td className="ps-value">{item.name}</td>
                          {secondaryFields.map((f) => (
                            <td key={f.key} className="ps-desc">
                              {f.type === 'number'
                                ? (Number(item[f.key]) || 0) + '%'
                                : (item[f.key] || '\u2014')}
                            </td>
                          ))}
                          {active.hasPrimary && (
                            <td>
                              <PermissionGate permission={PERMISSIONS.PRODUCT_UPDATE}>
                                <label className="ps-toggle-label" onClick={(e) => e.stopPropagation()}>
                                  <input type="checkbox" checked={!!item.is_primary} onChange={() => togglePrimary(item)} />
                                  <span className={`ps-toggle-slider${item.is_primary ? ' on' : ''}`} />
                                </label>
                              </PermissionGate>
                            </td>
                          )}
                          {active.hasDefault && (
                            <td>
                              <PermissionGate permission={PERMISSIONS.PRODUCT_UPDATE}>
                                <label className="ps-toggle-label" onClick={(e) => e.stopPropagation()}>
                                  <input type="checkbox" checked={!!item.is_default} onChange={() => toggleDefault(item)} />
                                  <span className={`ps-toggle-slider${item.is_default ? ' on' : ''}`} />
                                </label>
                              </PermissionGate>
                            </td>
                          )}
                          <td>
                            <div className="ps-actions">
                              <PermissionGate permission={PERMISSIONS.PRODUCT_UPDATE}>
                                <button type="button" className="ps-action-btn" onClick={() => openEdit(item)} title="Edit">
                                  <Icon name="edit" size={14} />
                                </button>
                              </PermissionGate>
                              <PermissionGate permission={PERMISSIONS.PRODUCT_DELETE}>
                                <button type="button" className="ps-action-btn ps-action-btn--danger" onClick={() => setDeleteTarget(item)} title="Delete">
                                  <Icon name="trash" size={14} />
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="drawerFooter">
            <div className="footerLeft">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn" onClick={handleReset}>
                <Icon name="refresh-cw" size={14} /> Reset
              </button>
            </div>
            <div className="footerRight">
              <button className="btn btnPrimary" onClick={onClose}>Done</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Nested Drawer */}
      {editOpen && (
        <>
          <div className="ds-overlay ds-overlay--nested" onClick={closeEdit}>
            <div className="prefixDrawer" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
              <div className="drawerHeader">
                <div className="drawerTitle">
                  <div className="drawerIcon" style={{ width: 44, height: 44, fontSize: 18 }}>
                    <Icon name={editItem ? 'edit' : 'plus'} size={18} />
                  </div>
                  <div>
                    <div className="drawerHeading" style={{ fontSize: 22 }}>{editItem ? `Edit ${active.singular}` : `Add ${active.singular}`}</div>
                    <div className="drawerSubtitle" style={{ fontSize: 13 }}>{active.label} master</div>
                  </div>
                </div>
                <div className="drawerActions">
                  <button className="drawerAction" onClick={closeEdit}>
                    <Icon name="x" size={18} />
                  </button>
                </div>
              </div>
              <div className="drawerContent" style={{ padding: 32 }}>
                <form className="inv-modal-form" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
                  {active.fields.map((f) => (
                    <Field key={f.key} label={f.label} required={f.required}>
                      <Input
                        type={f.type === 'number' ? 'number' : 'text'}
                        min={f.type === 'number' ? '0' : undefined}
                        step={f.type === 'number' ? '0.01' : undefined}
                        value={editForm[f.key] ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        aria-invalid={!!editErrors[f.key]}
                      />
                      {editErrors[f.key] && <span className="inv-field-error">{editErrors[f.key]}</span>}
                    </Field>
                  ))}
                </form>
              </div>
              <div className="drawerFooter">
                <div className="footerLeft">
                  <button className="btn" onClick={closeEdit}>Cancel</button>
                </div>
                <div className="footerRight">
                  <button className="btn btnPrimary" onClick={saveEdit} disabled={editSaving}>
                    <Icon name="check" size={14} /> {editSaving ? 'Saving...' : (editItem ? 'Save Changes' : 'Add')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Record"
        message={`Are you sure you want to delete ${active.singular.toLowerCase()} "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
