import { useEffect, useState, useCallback } from 'react';
import Icon from '../ui/Icon.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Pagination from '../ui/Pagination.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { invoiceService } from '../../services/invoice/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';

const PAGE_SIZE = 10;
const DOC_TYPE_TABS = ['Invoice', 'Credit Note', 'Debit Note'];

function validateValue(val, existing, currentId) {
  if (!val.trim()) return 'Value is required.';
  if (val.trim().length > 50) return 'Maximum 50 characters.';
  if (!/^[A-Za-z0-9_\-./\s]+$/.test(val)) return 'Invalid characters. Use letters, numbers, hyphens, underscores, dots, or slashes.';
  const dup = existing.find((r) => r.value === val.trim() && r.id !== currentId);
  if (dup) return 'This value already exists for the selected document type.';
  return '';
}

export default function PrefixSuffixPanel({ open, onClose }) {
  const [tab, setTab] = useState('prefixes');
  const [docType, setDocType] = useState(DOC_TYPE_TABS[0]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState(null); // null=all, true=active, false=inactive
  const [filterDefault, setFilterDefault] = useState(null); // null=all, true=default, false=non-default
  const [sortField, setSortField] = useState('sequenceOrder');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedIds, setSelectedIds] = useState([]);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ value: '', isActive: true, isDefault: false });
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isPrefix = tab === 'prefixes';

  // Load items
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = { docType, page: String(page), pageSize: String(PAGE_SIZE), sortField, sortDir };
    if (search.trim()) params.q = search.trim();
    if (filterActive !== null) params.active = String(filterActive);
    if (filterDefault !== null) params.default = String(filterDefault);

    const loader = isPrefix ? invoiceService.listPrefixes(params) : invoiceService.listSuffixes(params);
    loader
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [open, tab, docType, page, search, filterActive, filterDefault, sortField, sortDir, isPrefix]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [tab, docType, search, filterActive, filterDefault, sortField, sortDir]);

  const toggleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return prev; }
      setSortDir('asc');
      return field;
    });
  }, []);

  const openAdd = useCallback(() => {
    setEditItem(null);
    setEditForm({ value: '', isActive: true, isDefault: false });
    setEditErrors({});
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((item) => {
    setEditItem(item);
    setEditForm({
      value: item.value || '',
      isActive: item.isActive ?? item.active ?? true,
      isDefault: item.isDefault ?? item.default ?? false,
    });
    setEditErrors({});
    setEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditItem(null);
  }, []);

  const saveEdit = useCallback(async () => {
    const errs = {};
    const valErr = validateValue(editForm.value, items, editItem?.id);
    if (valErr) errs.value = valErr;

    if (!editForm.sequenceOrder || editForm.sequenceOrder < 1) errs.sequenceOrder = 'Must be at least 1.';
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    setEditSaving(true);
    try {
      const payload = {
        docType,
        value: editForm.value.trim(),
        isActive: editForm.isActive,
        isDefault: editForm.isDefault,
      };

      const label = isPrefix ? 'Prefix' : 'Suffix';

      if (editItem) {
        const updater = isPrefix ? invoiceService.updatePrefix(editItem.id, payload) : invoiceService.updateSuffix(editItem.id, payload);
        await updater;
        notificationManager.success(label, `${label} updated.`);
      } else {
        const creator = isPrefix ? invoiceService.createPrefix(payload) : invoiceService.createSuffix(payload);
        await creator;
        notificationManager.success(label, `${label} created.`);
      }

      closeEdit();
      // Reload current page
      const params = { docType, page: String(page), pageSize: String(PAGE_SIZE) };
      if (search.trim()) params.q = search.trim();
      const loader = isPrefix ? invoiceService.listPrefixes(params) : invoiceService.listSuffixes(params);
      loader.then((data) => { setItems(data.items || []); setTotal(data.total || 0); }).catch(() => {});
    } catch (e) {
      notificationManager.error('Save', e.message);
    } finally {
      setEditSaving(false);
    }
  }, [editForm, editItem, isPrefix, docType, page, search, items]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const deleter = isPrefix ? invoiceService.deletePrefix(deleteTarget.id) : invoiceService.deleteSuffix(deleteTarget.id);
      await deleter;
      notificationManager.success('Delete', `${isPrefix ? 'Prefix' : 'Suffix'} deleted.`);
      setDeleteTarget(null);
      const params = { docType, page: String(page), pageSize: String(PAGE_SIZE) };
      if (search.trim()) params.q = search.trim();
      const loader = isPrefix ? invoiceService.listPrefixes(params) : invoiceService.listSuffixes(params);
      loader.then((data) => { setItems(data.items || []); setTotal(data.total || 0); }).catch(() => {});
    } catch (e) {
      notificationManager.error('Delete', e.message);
    }
  }, [deleteTarget, isPrefix, docType, page, search]);

  const toggleActive = useCallback(async (item) => {
    const updater = isPrefix ? invoiceService.updatePrefix(item.id, { ...item, isActive: !item.isActive }) : invoiceService.updateSuffix(item.id, { ...item, isActive: !item.isActive });
    try {
      await updater;
      setItems((prev) => prev.map((r) => r.id === item.id ? { ...r, isActive: !r.isActive } : r));
    } catch (e) {
      notificationManager.error('Update', e.message);
    }
  }, [isPrefix]);

  const toggleDefault = useCallback(async (item) => {
    const newDefault = !(item.isDefault ?? item.default ?? false);
    try {
      if (newDefault) {
        const setter = isPrefix ? invoiceService.setDefaultPrefix(item.id) : invoiceService.setDefaultSuffix(item.id);
        await setter;
      } else {
        // If unsetting default, just update the record
        const updater = isPrefix ? invoiceService.updatePrefix(item.id, { ...item, isDefault: false }) : invoiceService.updateSuffix(item.id, { ...item, isDefault: false });
        await updater;
      }
      setItems((prev) => prev.map((r) => ({ ...r, isDefault: r.id === item.id ? newDefault : (newDefault ? false : r.isDefault) })));
    } catch (e) {
      notificationManager.error('Update', e.message);
    }
  }, [isPrefix]);

  const handleReset = useCallback(() => {
    setPage(1);
    setSearch('');
    setFilterActive(null);
    setFilterDefault(null);
    setSelectedIds([]);
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
    const params = { docType, page: String(page), pageSize: String(PAGE_SIZE), sortField, sortDir };
    if (search.trim()) params.q = search.trim();
    if (filterActive !== null) params.active = String(filterActive);
    if (filterDefault !== null) params.default = String(filterDefault);
    const loader = isPrefix ? invoiceService.listPrefixes(params) : invoiceService.listSuffixes(params);
    loader.then((data) => { setItems(data.items || []); setTotal(data.total || 0); }).catch(() => {});
  }, [docType, page, search, filterActive, filterDefault, sortField, sortDir, isPrefix]);

  const handleBulkActivate = useCallback(async (active) => {
    const ids = selectedIds;
    if (!ids.length) return;
    let success = 0;
    for (const id of ids) {
      try {
        const updater = isPrefix ? invoiceService.updatePrefix(id, { isActive: active }) : invoiceService.updateSuffix(id, { isActive: active });
        await updater;
        success++;
      } catch {}
    }
    if (success > 0) notificationManager.success('Bulk Update', `${success} record(s) ${active ? 'activated' : 'deactivated'}.`);
    setSelectedIds([]);
    reloadItems();
  }, [selectedIds, isPrefix, reloadItems]);

  const handleBulkDelete = useCallback(async () => {
    const ids = selectedIds;
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected record(s)?`)) return;
    let success = 0;
    for (const id of ids) {
      try {
        const deleter = isPrefix ? invoiceService.deletePrefix(id) : invoiceService.deleteSuffix(id);
        await deleter;
        success++;
      } catch {}
    }
    if (success > 0) notificationManager.success('Bulk Delete', `${success} record(s) deleted.`);
    setSelectedIds([]);
    reloadItems();
  }, [selectedIds, isPrefix, reloadItems]);

  const formatPreview = useCallback((val) => {
    if (!val) return 'Select a prefix/suffix first';
    if (isPrefix) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          <span>{val.trim()}-000001</span>
          <span>{val.trim()}-2026-000001</span>
          <span>COMP-{val.trim()}-001</span>
        </div>
      );
    }
    return <span>INV-000001{val ? `-${val.trim()}` : ''}</span>;
  }, [isPrefix]);

  if (!open) return null;

  const SortIcon = ({ field }) => (
    <Icon name={sortField === field ? (sortDir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevrons-up-down'} size={12} />
  );

  return (
    <>
      <div className="ds-overlay ds-overlay--nested" onClick={onClose}>
        <div className="prefixDrawer" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="drawerHeader">
            <div className="drawerTitle">
              <div className="drawerIcon">
                <Icon name="file-text" size={22} />
              </div>
              <div>
                <div className="drawerHeading">Prefix &amp; Suffix Management</div>
                <div className="drawerSubtitle">Manage document prefixes and suffix sequences</div>
              </div>
            </div>
            <div className="drawerActions">
              <button className="drawerAction" title="Help" onClick={() => notificationManager.info('Help', 'Manage document prefixes and suffixes. Each document type can have multiple prefixes/suffixes, but only one default.')}>
                <Icon name="help-circle" size={18} />
              </button>
              <button className="drawerAction" onClick={onClose}>
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>

          {/* Primary Tabs */}
          <div className="mainTabs">
            <button className={`mainTab${tab === 'prefixes' ? ' active' : ''}`} onClick={() => setTab('prefixes')}>
              Prefixes
            </button>
            <button className={`mainTab${tab === 'suffixes' ? ' active' : ''}`} onClick={() => setTab('suffixes')}>
              Suffixes
            </button>
          </div>

          {/* Document Type Tabs */}
          <div className="documentTabs">
            {DOC_TYPE_TABS.map((dt) => (
              <button
                key={dt}
                className={`documentTab${docType === dt ? ' active' : ''}`}
                onClick={() => { setDocType(dt); setPage(1); }}
              >
                {dt}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <input
              className="searchBox"
              type="text"
              placeholder={`Search ${tab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter"
              value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
              onChange={(e) => {
                const v = e.target.value;
                setFilterActive(v === 'all' ? null : v === 'active');
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              className="filter"
              value={filterDefault === null ? 'all' : filterDefault ? 'default' : 'non-default'}
              onChange={(e) => {
                const v = e.target.value;
                setFilterDefault(v === 'all' ? null : v === 'default');
              }}
            >
              <option value="all">All Defaults</option>
              <option value="default">Default</option>
              <option value="non-default">Non-default</option>
            </select>
            <button className="refreshBtn" onClick={() => { setPage(1); }} title="Refresh">
              <Icon name="refresh-cw" size={16} />
            </button>
            <PermissionGate permission={isPrefix ? PERMISSIONS.PREFIX_CREATE : PERMISSIONS.SUFFIX_CREATE}>
              <button className="addButton" onClick={openAdd}>
                <Icon name="plus" size={14} /> Add {isPrefix ? 'Prefix' : 'Suffix'}
              </button>
            </PermissionGate>
          </div>

          {/* Top Info Bar */}
          <div className="topBar">
            <div className="itemCount">{total} {tab}</div>
            <div className="sortSection">
              <select className="filter" style={{ width: 130 }} value={`${sortField}:${sortDir}`} onChange={(e) => { const [f, d] = e.target.value.split(':'); setSortField(f); setSortDir(d); }}>
                <option value="value:asc">{isPrefix ? 'Prefix' : 'Suffix'} A-Z</option>
                <option value="value:desc">{isPrefix ? 'Prefix' : 'Suffix'} Z-A</option>
                <option value="sequenceOrder:asc">Order ↑</option>
                <option value="sequenceOrder:desc">Order ↓</option>
                <option value="isDefault:desc">Default first</option>
              </select>
            </div>
          </div>

          {/* Content Area */}
          <div className="drawerContent">
            {loading ? (
              <div className="ps-loading"><div className="spinner" /><p>Loading {tab}...</p></div>
            ) : items.length === 0 ? (
              <div className="emptyState">
                <div className="emptyIcon">
                  <Icon name={isPrefix ? 'list' : 'list'} size={36} />
                </div>
                <div className="emptyTitle">No {tab} found</div>
                <div className="emptyDescription">
                  {search ? 'Try a different search term.' : `Add a ${isPrefix ? 'prefix' : 'suffix'} to get started.`}
                </div>
                <PermissionGate permission={isPrefix ? PERMISSIONS.PREFIX_CREATE : PERMISSIONS.SUFFIX_CREATE}>
                  <button className="addButton" onClick={openAdd}>
                    <Icon name="plus" size={14} /> Add {isPrefix ? 'Prefix' : 'Suffix'}
                  </button>
                </PermissionGate>
              </div>
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <div className="ps-bulk-bar">
                    <span className="ps-bulk-count">{selectedIds.length} selected</span>
                    <PermissionGate permission={isPrefix ? PERMISSIONS.PREFIX_UPDATE : PERMISSIONS.SUFFIX_UPDATE}>
                      <button className="ps-bulk-btn ps-bulk-btn--activate" onClick={() => handleBulkActivate(true)}>
                        <Icon name="check" size={14} /> Activate
                      </button>
                      <button className="ps-bulk-btn ps-bulk-btn--deactivate" onClick={() => handleBulkActivate(false)}>
                        <Icon name="x" size={14} /> Deactivate
                      </button>
                    </PermissionGate>
                    <PermissionGate permission={isPrefix ? PERMISSIONS.PREFIX_DELETE : PERMISSIONS.SUFFIX_DELETE}>
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
                          <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === items.length && items.length > 0} />
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('value')}>
                          {isPrefix ? 'Prefix' : 'Suffix'} <SortIcon field="value" />
                        </th>
                        <th>Description</th>
                        <th style={{ width: 80, cursor: 'pointer' }} onClick={() => toggleSort('isDefault')}>
                          Default <SortIcon field="isDefault" />
                        </th>
                        <th style={{ width: 80, cursor: 'pointer' }} onClick={() => toggleSort('isActive')}>
                          Active <SortIcon field="isActive" />
                        </th>
                        <th style={{ width: 70, cursor: 'pointer' }} onClick={() => toggleSort('sequenceOrder')}>
                          Order <SortIcon field="sequenceOrder" />
                        </th>
                        <th style={{ width: 100 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td style={{ width: 36 }}>
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} />
                          </td>
                          <td className="ps-value">{item.value}</td>
                          <td className="ps-desc">{item.description || '\u2014'}</td>
                          <td>
                            <PermissionGate permission={isPrefix ? PERMISSIONS.PREFIX_UPDATE : PERMISSIONS.SUFFIX_UPDATE}>
                              <label className="ps-toggle-label" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={!!(item.isDefault ?? item.default ?? false)}
                                  onChange={() => toggleDefault(item)}
                                />
                                <span className={`ps-toggle-slider${(item.isDefault ?? item.default ?? false) ? ' on' : ''}`} />
                              </label>
                            </PermissionGate>
                          </td>
                          <td>
                            <PermissionGate permission={isPrefix ? PERMISSIONS.PREFIX_UPDATE : PERMISSIONS.SUFFIX_UPDATE}>
                              <label className="ps-toggle-label" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={!!(item.isActive ?? item.active ?? true)}
                                  onChange={() => toggleActive(item)}
                                />
                                <span className={`ps-toggle-slider${(item.isActive ?? item.active ?? true) ? ' on' : ''}`} />
                              </label>
                            </PermissionGate>
                          </td>
                          <td className="ps-order">{item.sequenceOrder ?? item.order ?? '-'}</td>
                          <td>
                            <div className="ps-actions">
                              <PermissionGate permission={isPrefix ? PERMISSIONS.PREFIX_UPDATE : PERMISSIONS.SUFFIX_UPDATE}>
                                <button type="button" className="ps-action-btn" onClick={() => openEdit(item)} title="Edit">
                                  <Icon name="edit" size={14} />
                                </button>
                              </PermissionGate>
                              <PermissionGate permission={isPrefix ? PERMISSIONS.PREFIX_DELETE : PERMISSIONS.SUFFIX_DELETE}>
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
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
                    <div className="drawerHeading" style={{ fontSize: 22 }}>{editItem ? `Edit ${isPrefix ? 'Prefix' : 'Suffix'}` : `Add ${isPrefix ? 'Prefix' : 'Suffix'}`}</div>
                    <div className="drawerSubtitle" style={{ fontSize: 13 }}>Document Type: {docType}</div>
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
                  <Field label={isPrefix ? 'Prefix Value' : 'Suffix Value'} required>
                    <Input
                      value={editForm.value}
                      onChange={(e) => setEditForm((p) => ({ ...p, value: e.target.value }))}
                      placeholder={isPrefix ? 'e.g. INV-' : 'e.g. -A'}
                      aria-invalid={!!editErrors.value}
                    />
                    {editErrors.value && <span className="inv-field-error">{editErrors.value}</span>}
                  </Field>

                  <div style={{ display: 'flex', gap: 32, marginTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Status</div>
                      <label className="ps-switch">
                        <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))} />
                        <span className="ps-switch-slider">
                          <span className={`ps-switch-segment${!editForm.isActive ? ' active' : ''}`}>Inactive</span>
                          <span className={`ps-switch-segment${editForm.isActive ? ' active' : ''}`}>Active</span>
                        </span>
                      </label>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Default</div>
                      <label className="ps-switch">
                        <input type="checkbox" checked={editForm.isDefault} onChange={(e) => setEditForm((p) => ({ ...p, isDefault: e.target.checked }))} />
                        <span className="ps-switch-slider">
                          <span className={`ps-switch-segment${!editForm.isDefault ? ' active' : ''}`}>Disable</span>
                          <span className={`ps-switch-segment${editForm.isDefault ? ' active' : ''}`}>Enable</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="ps-preview" style={{ marginTop: 16 }}>
                    <div className="ps-preview-label">Live Preview</div>
                    {formatPreview(editForm.value)}
                  </div>
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
        message={`Are you sure you want to delete ${isPrefix ? 'prefix' : 'suffix'} \"${deleteTarget?.value}\"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}