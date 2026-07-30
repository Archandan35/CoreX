import { useEffect, useState, useCallback, useMemo } from 'react';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import { Field, Input } from '../ui/Field.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Pagination from '../ui/Pagination.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { invoiceService } from '../../services/invoice/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';
import { CUSTOM_HEADER_INPUT_TYPE_OPTIONS } from '../../constants/index.js';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  displayName: '',
  inputType: 'text',
  active: true,
  isDefault: false,
  displayOrder: 1,
  columnPosition: 1,
  options: '',
};

function keyFromName(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function validateForm(form, existing, currentId) {
  const errs = {};
  if (!form.displayName.trim()) errs.displayName = 'Display name is required.';
  const internalKey = keyFromName(form.displayName);
  if (!internalKey) errs.internalKey = 'Internal key is required.';
  if (!/^[a-z][a-z0-9_]*$/.test(internalKey)) errs.internalKey = 'Must start with a letter and contain only lowercase letters, numbers, underscores.';
  const dupKey = existing.find((h) => h.internalKey === internalKey && h.id !== currentId);
  if (dupKey) errs.internalKey = 'This internal key already exists.';
  const dupName = existing.find((h) => h.displayName === form.displayName.trim() && h.id !== currentId);
  if (dupName) errs.displayName = 'This display name already exists.';
  if (form.displayName.trim().length > 100) errs.displayName = 'Maximum 100 characters.';
  if (internalKey.length > 100) errs.internalKey = 'Maximum 100 characters.';
  if (!form.displayOrder || form.displayOrder < 1) errs.displayOrder = 'Must be at least 1.';
  if ((form.inputType === 'dropdown' || form.inputType === 'multi_select' || form.inputType === 'radio') && !form.options.trim()) {
    errs.options = 'Options are required for this input type (comma-separated).';
  }
  return errs;
}

export default function CustomHeaderPanel({ open, onClose }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState(null);
  const [filterInputType, setFilterInputType] = useState('');
  const [sortField, setSortField] = useState('displayOrder');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedIds, setSelectedIds] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = { page: String(page), pageSize: String(PAGE_SIZE), sortField, sortDir };
    if (search.trim()) params.q = search.trim();
    if (filterActive !== null) params.active = String(filterActive);
    if (filterInputType) params.inputType = filterInputType;

    invoiceService.listCustomHeaders(params)
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [open, page, search, filterActive, filterInputType, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => { setPage(1); }, [search, filterActive, filterInputType, sortField, sortDir]);

  const toggleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return prev; }
      setSortDir('asc');
      return field;
    });
  }, []);

  const openAdd = useCallback(() => {
    setEditItem(null);
    setEditForm({ ...EMPTY_FORM });
    setEditErrors({});
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((item) => {
    setEditItem(item);
    setEditForm({
      displayName: item.displayName || '',
      inputType: item.inputType || 'text',
      active: item.active ?? true,
      isDefault: item.isDefault ?? item.default ?? false,
      displayOrder: item.displayOrder ?? item.order ?? 1,
      columnPosition: item.columnPosition ?? 1,
      options: item.options || '',
    });
    setEditErrors({});
    setEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditItem(null);
  }, []);

  const saveEdit = useCallback(async () => {
    const errs = validateForm(editForm, items, editItem?.id);
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    setEditSaving(true);
    try {
      const internalKey = keyFromName(editForm.displayName);
      const payload = {
        displayName: editForm.displayName.trim(),
        internalKey,
        inputType: editForm.inputType,
        active: editForm.active,
        isDefault: editForm.isDefault,
        displayOrder: Number(editForm.displayOrder) || 1,
        columnPosition: Number(editForm.columnPosition) || 1,
        options: editForm.options.trim(),
      };

      if (editItem) {
        await invoiceService.updateCustomHeader(editItem.id, payload);
        notificationManager.success('Custom Header', 'Header updated.');
      } else {
        await invoiceService.createCustomHeader(payload);
        notificationManager.success('Custom Header', 'Header created.');
      }

      closeEdit();
      const params = { page: String(page), pageSize: String(PAGE_SIZE), sortField, sortDir };
      if (search.trim()) params.q = search.trim();
      invoiceService.listCustomHeaders(params)
        .then((data) => { setItems(data.items || []); setTotal(data.total || 0); })
        .catch(() => {});
    } catch (e) {
      notificationManager.error('Save', e.message);
    } finally {
      setEditSaving(false);
    }
  }, [editForm, editItem, page, search, sortField, sortDir, items]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await invoiceService.deleteCustomHeader(deleteTarget.id);
      notificationManager.success('Delete', 'Custom header deleted.');
      setDeleteTarget(null);
      const params = { page: String(page), pageSize: String(PAGE_SIZE), sortField, sortDir };
      if (search.trim()) params.q = search.trim();
      invoiceService.listCustomHeaders(params)
        .then((data) => { setItems(data.items || []); setTotal(data.total || 0); })
        .catch(() => {});
    } catch (e) {
      notificationManager.error('Delete', e.message);
    }
  }, [deleteTarget, page, search, sortField, sortDir]);

  const toggleActive = useCallback(async (item) => {
    try {
      await invoiceService.updateCustomHeader(item.id, { ...item, active: !item.active });
      setItems((prev) => prev.map((r) => r.id === item.id ? { ...r, active: !r.active } : r));
    } catch (e) { notificationManager.error('Update', e.message); }
  }, []);

  const handleSelectAll = useCallback((e) => {
    if (e.target.checked) setSelectedIds(items.map((r) => r.id));
    else setSelectedIds([]);
  }, [items]);

  const handleSelectOne = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const reloadItems = useCallback(() => {
    const params = { page: String(page), pageSize: String(PAGE_SIZE), sortField, sortDir };
    if (search.trim()) params.q = search.trim();
    if (filterActive !== null) params.active = String(filterActive);
    if (filterInputType) params.inputType = filterInputType;
    invoiceService.listCustomHeaders(params)
      .then((data) => { setItems(data.items || []); setTotal(data.total || 0); })
      .catch(() => {});
  }, [page, search, filterActive, filterInputType, sortField, sortDir]);

  const handleBulkActivate = useCallback(async (active) => {
    const ids = selectedIds;
    if (!ids.length) return;
    let success = 0;
    for (const id of ids) {
      try { await invoiceService.updateCustomHeader(id, { active }); success++; } catch {}
    }
    if (success > 0) notificationManager.success('Bulk Update', `${success} record(s) ${active ? 'activated' : 'deactivated'}.`);
    setSelectedIds([]);
    reloadItems();
  }, [selectedIds, reloadItems]);

  const handleBulkDelete = useCallback(async () => {
    const ids = selectedIds;
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected custom header(s)?`)) return;
    let success = 0;
    for (const id of ids) {
      try { await invoiceService.deleteCustomHeader(id); success++; } catch {}
    }
    if (success > 0) notificationManager.success('Bulk Delete', `${success} record(s) deleted.`);
    setSelectedIds([]);
    reloadItems();
  }, [selectedIds, reloadItems]);

  const handleReset = useCallback(() => {
    setPage(1);
    setSearch('');
    setFilterActive(null);
    setFilterInputType('');
    setSelectedIds([]);
  }, []);

  const updateForm = useCallback((key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const computedKey = useMemo(() => keyFromName(editForm.displayName || ''), [editForm.displayName]);

  if (!open) return null;

  const SortIcon = ({ field }) => (
    <Icon name={sortField === field ? (sortDir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevrons-up-down'} size={12} />
  );

  const inputTypeLabel = CUSTOM_HEADER_INPUT_TYPE_OPTIONS.find((o) => o.value === (editForm.inputType || 'text'))?.label || 'Text';

  return (
    <>
      <div className="ds-overlay ds-overlay--nested" onClick={onClose}>
        <div className="ds-panel ds-panel--nested" onClick={(e) => e.stopPropagation()}>
          <div className="ds-header">
            <div className="ds-header-left">
              <button className="ds-close-btn" onClick={onClose}><Icon name="x" size={18} /></button>
              <h2>Custom Header Management</h2>
            </div>
            <button className="ds-btn ds-btn-ghost" title="Help" onClick={() => notificationManager.info('Help', 'Create reusable custom document fields. These fields automatically appear on all configured document entry forms.')}>
              <Icon name="help-circle" size={18} />
            </button>
          </div>

          <div className="ds-body">
            <div className="ps-toolbar">
              <div className="ps-search">
                <Icon name="search" size={14} />
                <input type="text" placeholder="Search headers..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="ps-filter-select" value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
                onChange={(e) => { const v = e.target.value; setFilterActive(v === 'all' ? null : v === 'active'); }}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select className="ps-filter-select" value={filterInputType} onChange={(e) => setFilterInputType(e.target.value)}>
                <option value="">All Types</option>
                {CUSTOM_HEADER_INPUT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="ps-toolbar-actions">
                <PermissionGate permission={PERMISSIONS.CUSTOM_HEADER_CREATE}>
                  <button className="ds-btn ds-btn-primary" onClick={openAdd}>
                    <Icon name="plus" size={14} /> Add Custom Header
                  </button>
                </PermissionGate>
                <button className="ps-toolbar-refresh" onClick={() => setPage(1)} title="Refresh">
                  <Icon name="refresh-cw" size={16} />
                </button>
              </div>
            </div>

            <div className="ps-table-wrap">
              {loading ? (
                <div className="ps-loading"><div className="spinner" /><p>Loading custom headers...</p></div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon="gear"
                  title="No custom headers found"
                  message={search ? 'Try a different search term.' : 'Create a custom header to get started.'}
                  action={
                    <PermissionGate permission={PERMISSIONS.CUSTOM_HEADER_CREATE}>
                      <Button icon="plus" onClick={openAdd}>Add Custom Header</Button>
                    </PermissionGate>
                  }
                />
              ) : (
                <>
                  {selectedIds.length > 0 && (
                    <div className="ps-bulk-bar">
                      <span className="ps-bulk-count">{selectedIds.length} selected</span>
                      <PermissionGate permission={PERMISSIONS.CUSTOM_HEADER_UPDATE}>
                        <button className="ps-bulk-btn ps-bulk-btn--activate" onClick={() => handleBulkActivate(true)}>
                          <Icon name="check" size={14} /> Activate
                        </button>
                        <button className="ps-bulk-btn ps-bulk-btn--deactivate" onClick={() => handleBulkActivate(false)}>
                          <Icon name="x" size={14} /> Deactivate
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={PERMISSIONS.CUSTOM_HEADER_DELETE}>
                        <button className="ps-bulk-btn ps-bulk-btn--delete" onClick={handleBulkDelete}>
                          <Icon name="trash" size={14} /> Delete
                        </button>
                      </PermissionGate>
                      <button className="ps-bulk-btn" onClick={() => setSelectedIds([])}>
                        <Icon name="x" size={14} /> Clear
                      </button>
                    </div>
                  )}
                  <table className="ps-table" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === items.length && items.length > 0} /></th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('displayName')}>Display Name <SortIcon field="displayName" /></th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('internalKey')}>Key <SortIcon field="internalKey" /></th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('inputType')}>Type <SortIcon field="inputType" /></th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('columnPosition')}>Column <SortIcon field="columnPosition" /></th>
                        <th style={{ width: 70, cursor: 'pointer' }} onClick={() => toggleSort('displayOrder')}>Order <SortIcon field="displayOrder" /></th>
                        <th style={{ width: 80, cursor: 'pointer' }} onClick={() => toggleSort('active')}>Active <SortIcon field="active" /></th>
                        <th style={{ width: 100 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} /></td>
                          <td className="ps-value">{item.displayName}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--invoice-muted2)' }}>{item.internalKey}</td>
                          <td>{CUSTOM_HEADER_INPUT_TYPE_OPTIONS.find((o) => o.value === item.inputType)?.label || item.inputType}</td>
                          <td>Col {item.columnPosition || 1}</td>
                          <td className="ps-order">{item.displayOrder ?? item.order ?? '-'}</td>
                          <td>
                            <PermissionGate permission={PERMISSIONS.CUSTOM_HEADER_UPDATE}>
                              <label className="ps-toggle-label" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={!!(item.active ?? true)} onChange={() => toggleActive(item)} />
                                <span className={`ps-toggle-slider${(item.active ?? true) ? ' on' : ''}`} />
                              </label>
                            </PermissionGate>
                          </td>
                          <td>
                            <div className="ps-actions">
                              <PermissionGate permission={PERMISSIONS.CUSTOM_HEADER_UPDATE}>
                                <button type="button" className="ps-action-btn" onClick={() => openEdit(item)} title="Edit"><Icon name="edit" size={14} /></button>
                              </PermissionGate>
                              <PermissionGate permission={PERMISSIONS.CUSTOM_HEADER_DELETE}>
                                <button type="button" className="ps-action-btn ps-action-btn--danger" onClick={() => setDeleteTarget(item)} title="Delete"><Icon name="trash" size={14} /></button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>

          <div className="ds-footer">
            <button className="ds-btn ds-btn-primary" onClick={onClose}>Done</button>
            <button className="ds-btn ds-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="ds-btn ds-btn-secondary" onClick={handleReset}>
              <Icon name="refresh-cw" size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Nested Drawer */}
      {editOpen && (
        <>
          <div className="ds-overlay ds-overlay--nested" onClick={closeEdit}>
            <div className="ds-panel ds-panel--nested" onClick={(e) => e.stopPropagation()}>
              <div className="ds-header">
                <div className="ds-header-left">
                  <button className="ds-close-btn" onClick={closeEdit}><Icon name="x" size={18} /></button>
                  <h2>{editItem ? 'Edit Custom Header' : 'Add Custom Header'}</h2>
                </div>
              </div>
              <div className="ds-body">
                <form className="inv-modal-form" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
                  <div className="inv-modal-row">
                    <Field label="Display Name" required>
                      <Input
                        value={editForm.displayName}
                        onChange={(e) => updateForm('displayName', e.target.value)}
                        placeholder="e.g. Vehicle No"
                        aria-invalid={!!editErrors.displayName}
                      />
                      {editErrors.displayName && <span className="inv-field-error">{editErrors.displayName}</span>}
                    </Field>
                    <Field label="Input Type" required>
                      <Select options={CUSTOM_HEADER_INPUT_TYPE_OPTIONS} value={editForm.inputType} onChange={(v) => updateForm('inputType', v)} placeholder="Select type" />
                    </Field>
                  </div>

                  {(editForm.inputType === 'dropdown' || editForm.inputType === 'multi_select' || editForm.inputType === 'radio') && (
                    <div className="inv-modal-row" style={{ marginTop: 12 }}>
                      <Field label="Options" required>
                        <Input
                          value={editForm.options}
                          onChange={(e) => updateForm('options', e.target.value)}
                          placeholder="Comma-separated values"
                          aria-invalid={!!editErrors.options}
                        />
                        {editErrors.options && <span className="inv-field-error">{editErrors.options}</span>}
                      </Field>
                    </div>
                  )}

                  <div className="inv-modal-row" style={{ marginTop: 12 }}>
                    <Field label="Internal Key">
                      <Input value={computedKey} disabled placeholder="Auto-generated" />
                    </Field>
                    <Field label="Display Order">
                      <Input
                        type="number" min="1" step="1"
                        value={editForm.displayOrder}
                        onChange={(e) => updateForm('displayOrder', e.target.value === '' ? '' : Number(e.target.value))}
                        aria-invalid={!!editErrors.displayOrder}
                      />
                      {editErrors.displayOrder && <span className="inv-field-error">{editErrors.displayOrder}</span>}
                    </Field>
                  </div>

                  <div className="inv-modal-row" style={{ marginTop: 12 }}>
                    <Field label="Column Position">
                      <Input
                        type="number" min="1" step="1"
                        value={editForm.columnPosition}
                        onChange={(e) => updateForm('columnPosition', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </Field>
                    <div />
                  </div>

                  <div className="inv-modal-row" style={{ marginTop: 12 }}>
                    <label className="ps-switch">
                      <input type="checkbox" checked={editForm.active} onChange={(e) => updateForm('active', e.target.checked)} />
                      <span className={`ps-switch-slider${editForm.active ? ' on' : ''}`}>
                        <span className="ps-switch-text">{editForm.active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </label>
                    <label className="ps-switch">
                      <input type="checkbox" checked={editForm.isDefault} onChange={(e) => updateForm('isDefault', e.target.checked)} />
                      <span className={`ps-switch-slider${editForm.isDefault ? ' on' : ''}`}>
                        <span className="ps-switch-text">{editForm.isDefault ? 'Enable' : 'Disable'}</span>
                      </span>
                    </label>
                  </div>
                </form>
              </div>
              <div className="ds-footer">
                <button className="ds-btn ds-btn-primary" onClick={saveEdit} disabled={editSaving}>
                  <Icon name="check" size={14} /> {editSaving ? 'Saving...' : (editItem ? 'Save Changes' : 'Add')}
                </button>
                <button className="ds-btn ds-btn-ghost" onClick={closeEdit}>Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Custom Header"
        message={`Are you sure you want to delete "${deleteTarget?.displayName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}