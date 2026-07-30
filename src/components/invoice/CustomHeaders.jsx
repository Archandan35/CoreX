import { useState } from 'react';
import Icon from '../ui/Icon.jsx';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { notificationManager } from '../../managers/NotificationManager.js';
import PermissionGate from '../ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

export default function CustomHeaders({ headers, settingsOpen, onCloseSettings, onAddHeader, onRemoveHeader }) {
  const [newLabel, setNewLabel] = useState('');

  const addHeader = (e) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) {
      notificationManager.warning('Custom Headers', 'Please enter a header label.');
      return;
    }
    onAddHeader(label);
    setNewLabel('');
  };

  return (
    <section className="inv-card">
      <div className="inv-custom-headers">
        <h3>Custom Headers</h3>
        <div className="inv-chip-row">
          {headers.map((h) => (
            <div className="inv-chip" key={h.key}>
              <Icon name="plus" size={12} /> {h.label}
            </div>
          ))}
          {headers.length === 0 && (
            <span style={{ fontSize: 13, color: 'var(--inv-text-sub)', fontStyle: 'italic' }}>
              No custom headers configured.
            </span>
          )}
        </div>
      </div>

      <Modal
        open={settingsOpen}
        onClose={onCloseSettings}
        title="Custom Header Definitions"
        size="sm"
        footer={<Button variant="secondary" onClick={onCloseSettings}>Done</Button>}
      >
        <form className="inv-modal-form" onSubmit={addHeader}>
          <Field label="Add header label">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Vehicle No" />
              <Button type="submit" icon="plus">Add</Button>
            </div>
          </Field>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16 }}>
          {headers.map((h) => (
            <div key={h.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', border: '1px solid var(--inv-border)',
              borderRadius: 'var(--inv-radius-sm)', fontSize: 13
            }}>
              <span>{h.label}</span>
              <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
                <button type="button" className="inv-table-remove-btn" onClick={() => onRemoveHeader(h.key)} aria-label={`Remove ${h.label}`}>
                  <Icon name="trash" size={14} />
                </button>
              </PermissionGate>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  );
}