import { useState } from 'react';
import Card from '../ui/Card.jsx';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Icon from '../ui/Icon.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

// Admin-defined custom header chips. Values are editable; admins can add or
// remove header definitions. The persisted set lives in the invoice's
// custom_headers jsonb column.
export default function CustomHeaders({ headers, values, onChangeValue, onAddHeader, onRemoveHeader, settingsOpen, onOpenSettings, onCloseSettings }) {
  const [newLabel, setNewLabel] = useState('');

  const addHeader = (e) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    onAddHeader(label);
    setNewLabel('');
  };

  return (
    <Card className="inv-card" padding={false}>
      <div className="inv-chips">
        <div className="inv-chips__list">
          {headers.map((h) => (
            <div className="inv-chip" key={h.key}>
              <span className="inv-chip__label">{h.label}</span>
              <input
                className="inv-chip__input"
                value={values[h.key] ?? ''}
                onChange={(e) => onChangeValue(h.key, e.target.value)}
                placeholder={h.label}
                aria-label={h.label}
              />
              <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
                <button
                  type="button"
                  className="inv-chip__remove"
                  onClick={() => onRemoveHeader(h.key)}
                  aria-label={`Remove ${h.label}`}
                >
                  <Icon name="x" size={12} />
                </button>
              </PermissionGate>
            </div>
          ))}
          {headers.length === 0 && (
            <span className="inv-chips__empty">No custom headers configured.</span>
          )}
        </div>
        <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
          <Button variant="secondary" icon="plus" onClick={onOpenSettings}>Manage</Button>
        </PermissionGate>
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
            <div className="inv-inline-add">
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Vehicle No" />
              <Button type="submit" icon="plus">Add</Button>
            </div>
          </Field>
        </form>
        <div className="inv-chips__manage">
          {headers.map((h) => (
            <div className="inv-chips__manage-row" key={h.key}>
              <span>{h.label}</span>
              <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
                <button type="button" className="inv-chip__remove" onClick={() => onRemoveHeader(h.key)} aria-label={`Remove ${h.label}`}>
                  <Icon name="trash" size={14} />
                </button>
              </PermissionGate>
            </div>
          ))}
        </div>
      </Modal>
    </Card>
  );
}
