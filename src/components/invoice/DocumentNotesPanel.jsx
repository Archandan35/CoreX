import { useEffect, useState, useCallback } from 'react';
import Icon from '../ui/Icon.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Select from '../ui/Select.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { invoiceService } from '../../services/invoice/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';

export default function DocumentNotesPanel({ open, onClose }) {
  const [tab, setTab] = useState('notes');
  const [docType, setDocType] = useState('Invoice');
  const [docTypes, setDocTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const isNotes = tab === 'notes';

  useEffect(() => {
    if (!open) return;
    invoiceService.listDocumentTypes()
      .then((types) => {
        if (types && types.length > 0) {
          setDocTypes(types);
          if (!types.includes(docType)) setDocType(types[0]);
        }
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = { docType, sortField: 'createdAt', sortDir: 'desc' };
    const loader = isNotes ? invoiceService.listNotes(params) : invoiceService.listTerms(params);
    loader
      .then((data) => { setItems(data.items || []); })
      .catch(() => { setItems([]); })
      .finally(() => setLoading(false));
  }, [open, tab, docType, isNotes]);

  const openAdd = useCallback(() => {
    setEditItem(null);
    setEditText('');
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((item) => {
    setEditItem(item);
    setEditText(item.text || item.content || '');
    setEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditItem(null);
    setEditText('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editText.trim()) { notificationManager.warning('Validation', 'Content is required.'); return; }
    setEditSaving(true);
    try {
      const payload = { docType, text: editText.trim() };
      const label = isNotes ? 'Note' : 'Term';
      if (editItem) {
        const updater = isNotes ? invoiceService.updateNote(editItem.id, payload) : invoiceService.updateTerm(editItem.id, payload);
        await updater;
        notificationManager.success(label, `${label} updated.`);
      } else {
        const creator = isNotes ? invoiceService.createNote(payload) : invoiceService.createTerm(payload);
        await creator;
        notificationManager.success(label, `${label} created.`);
      }
      closeEdit();
      const params = { docType, sortField: 'createdAt', sortDir: 'desc' };
      const loader = isNotes ? invoiceService.listNotes(params) : invoiceService.listTerms(params);
      loader.then((data) => { setItems(data.items || []); }).catch(() => {});
    } catch (e) {
      notificationManager.error('Save', e.message);
    } finally {
      setEditSaving(false);
    }
  }, [editText, editItem, isNotes, docType]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const deleter = isNotes ? invoiceService.deleteNote(deleteTarget.id) : invoiceService.deleteTerm(deleteTarget.id);
      await deleter;
      notificationManager.success('Delete', `${isNotes ? 'Note' : 'Term'} deleted.`);
      setDeleteTarget(null);
      const params = { docType, sortField: 'createdAt', sortDir: 'desc' };
      const loader = isNotes ? invoiceService.listNotes(params) : invoiceService.listTerms(params);
      loader.then((data) => { setItems(data.items || []); }).catch(() => {});
    } catch (e) {
      notificationManager.error('Delete', e.message);
    }
  }, [deleteTarget, isNotes, docType]);

  if (!open) return null;

  const label = isNotes ? 'Note' : 'Term';
  const labelPlural = isNotes ? 'Notes' : 'Terms';

  return (
    <>
      <div className="ds-overlay ds-overlay--nested" onClick={onClose}>
        <div className="prefixDrawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawerHeader">
            <div className="drawerTitle">
              <div className="drawerIcon"><Icon name="file-text" size={16} /></div>
              <div>
                <div className="drawerHeading">Document {labelPlural}</div>
              </div>
            </div>
            <div className="drawerActions">
              <button className="drawerAction" onClick={onClose}><Icon name="x" size={16} /></button>
            </div>
          </div>
          <div className="mainTabs" style={{ padding: '10px 24px 0', borderBottom: '1px solid var(--border, #E8EAF4)' }}>
            <button className={`mainTab${tab === 'notes' ? ' active' : ''}`} onClick={() => setTab('notes')}>
              Notes
            </button>
            <button className={`mainTab${tab === 'terms' ? ' active' : ''}`} onClick={() => setTab('terms')}>
              Terms
            </button>
          </div>
          <div className="drawerContent" style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Select
                options={docTypes.map((dt) => ({ value: dt, label: dt }))}
                value={docType}
                onChange={(v) => { setDocType(v); }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <PermissionGate permission={PERMISSIONS.INVOICE_CREATE}>
                <button className="addButton" onClick={openAdd}>
                  <Icon name="plus" size={14} /> New {label}
                </button>
              </PermissionGate>
            </div>
            <div className="ps-table-wrap" style={{ flex: 1 }}>
              {loading ? (
                <div className="ps-loading"><div className="spinner" /><p>Loading {labelPlural}...</p></div>
              ) : items.length === 0 ? (
                <div className="emptyState" style={{ margin: 0 }}>
                  <div className="emptyIcon"><Icon name="file-text" size={24} /></div>
                  <div className="emptyTitle">No {docType} {labelPlural} found</div>
                  <div className="emptyDescription">Use the "New {label}" button to create one.</div>
                  <PermissionGate permission={PERMISSIONS.INVOICE_CREATE}>
                    <button className="addButton" onClick={openAdd}><Icon name="plus" size={14} /> New {label}</button>
                  </PermissionGate>
                </div>
              ) : (
                <div className="ps-list">
                  {items.map((item) => (
                    <div key={item.id} className="ps-list-item">
                      <div className="ps-list-item-text" style={{ flex: 1, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {item.text || item.content || ''}
                      </div>
                      <div className="ps-actions">
                        <PermissionGate permission={PERMISSIONS.INVOICE_UPDATE}>
                          <button type="button" className="ps-action-btn" onClick={() => openEdit(item)} title="Edit">
                            <Icon name="edit" size={14} />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={PERMISSIONS.INVOICE_DELETE}>
                          <button type="button" className="ps-action-btn ps-action-btn--danger" onClick={() => setDeleteTarget(item)} title="Delete">
                            <Icon name="trash" size={14} />
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="drawerFooter">
            <div className="footerLeft">
              <button className="btn" onClick={onClose}>Cancel</button>
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
                  <div className="drawerIcon" style={{ width: 36, height: 36, fontSize: 16 }}>
                    <Icon name={editItem ? 'edit' : 'plus'} size={16} />
                  </div>
                  <div>
                    <div className="drawerHeading" style={{ fontSize: 16 }}>{editItem ? `Edit ${label}` : `New ${label}`}</div>
                    <div className="drawerSubtitle" style={{ fontSize: 12 }}>Document Type: {docType}</div>
                  </div>
                </div>
                <div className="drawerActions">
                  <button className="drawerAction" onClick={closeEdit}><Icon name="x" size={16} /></button>
                </div>
              </div>
              <div className="drawerContent" style={{ padding: 24 }}>
                <div className="inv-modal-form">
                  <Field label={label}>
                    <textarea
                      className="ds-textarea"
                      rows={6}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder={isNotes ? 'Enter invoice note...' : 'Enter terms & conditions...'}
                      style={{ width: '100%', resize: 'vertical', minHeight: 120, fontSize: 13, fontFamily: 'inherit', padding: 10, border: '1px solid var(--inv-border)', borderRadius: 'var(--inv-radius-sm)' }}
                    />
                  </Field>
                </div>
              </div>
              <div className="drawerFooter">
                <div className="footerLeft">
                  <button className="btn" onClick={closeEdit}>Cancel</button>
                </div>
                <div className="footerRight">
                  <button className="btn btnPrimary" onClick={saveEdit} disabled={editSaving}>
                    <Icon name="check" size={14} /> {editSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${label}`}
        message={`Are you sure you want to delete this ${label.toLowerCase()}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}