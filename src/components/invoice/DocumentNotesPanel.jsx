import { useEffect, useState, useCallback } from 'react';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Select from '../ui/Select.jsx';
import EmptyState from '../ui/EmptyState.jsx';
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
        <div className="ds-panel ds-panel--nested" onClick={(e) => e.stopPropagation()}>
          <div className="ds-header">
            <div className="ds-header-left">
              <button className="ds-close-btn" onClick={onClose}><Icon name="x" size={18} /></button>
              <h2>Document {labelPlural}</h2>
            </div>
          </div>
          <div className="ds-body">
            {/* Tabs */}
            <div className="ps-primary-tabs">
              <button className={`ps-primary-tab${tab === 'notes' ? ' active' : ''}`} onClick={() => setTab('notes')}>
                Notes
              </button>
              <button className={`ps-primary-tab${tab === 'terms' ? ' active' : ''}`} onClick={() => setTab('terms')}>
                Terms
              </button>
            </div>

            {/* Document Type */}
            <div style={{ marginBottom: 16 }}>
              <Select
                options={docTypes.map((dt) => ({ value: dt, label: dt }))}
                value={docType}
                onChange={(v) => { setDocType(v); }}
              />
            </div>

            {/* Toolbar */}
            <div className="ps-toolbar">
              <div className="ps-toolbar-actions" style={{ marginLeft: 0 }}>
                <PermissionGate permission={PERMISSIONS.INVOICE_CREATE}>
                  <button className="ds-btn ds-btn-primary" onClick={openAdd}>
                    <Icon name="plus" size={14} /> New {label}
                  </button>
                </PermissionGate>
              </div>
            </div>

            {/* List */}
            <div className="ps-table-wrap">
              {loading ? (
                <div className="ps-loading"><div className="spinner" /><p>Loading {labelPlural}...</p></div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon="file-text"
                  title={`No ${docType} ${labelPlural} found`}
                  message={`Use the "New ${label}" button to create one.`}
                  action={
                    <PermissionGate permission={PERMISSIONS.INVOICE_CREATE}>
                      <Button icon="plus" onClick={openAdd}>New {label}</Button>
                    </PermissionGate>
                  }
                />
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

          <div className="ds-footer">
            <button className="ds-btn ds-btn-primary" onClick={onClose}>Done</button>
            <button className="ds-btn ds-btn-ghost" onClick={onClose}>Cancel</button>
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
                  <h2>{editItem ? `Edit ${label}` : `New ${label}`}</h2>
                </div>
              </div>
              <div className="ds-body">
                <div className="inv-modal-form">
                  <div style={{ marginBottom: 16 }}>
                    <strong style={{ fontSize: 13, color: 'var(--inv-text-sub)' }}>Document Type:</strong>{' '}
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{docType}</span>
                  </div>
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
              <div className="ds-footer">
                <button className="ds-btn ds-btn-primary" onClick={saveEdit} disabled={editSaving}>
                  <Icon name="check" size={14} /> {editSaving ? 'Saving...' : 'Save'}
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
        title={`Delete ${label}`}
        message={`Are you sure you want to delete this ${label.toLowerCase()}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}