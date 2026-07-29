import { useState } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import Icon from '../ui/Icon.jsx';
import Modal from '../ui/Modal.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { notificationManager } from '../../managers/NotificationManager.js';

export default function InvoiceSignature({
  signatures,
  selectedSignature,
  onSelectSignature,
  onAddSignature,
  onDeleteSignature,
}) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [sigName, setSigName] = useState('');
  const [sigImage, setSigImage] = useState(null);

  const openAddSignature = () => {
    setSigName('');
    setSigImage(null);
    setShowSignatureModal(true);
  };

  const submitSignature = async () => {
    if (!sigName.trim()) return;
    try {
      await onAddSignature({ name: sigName, image: sigImage || null });
      setShowSignatureModal(false);
    } catch (e) {
      notificationManager.error('Signature', e.message);
    }
  };

  const previewUrl = selectedSignature?.image_url
    || (selectedSignature?.image && typeof selectedSignature.image === 'string'
      ? selectedSignature.image : null);

  return (
    <Card className="inv-card">
      <div className="inv-signature-section">
        <Field label="Select Signature">
          <div className="inv-bank-row">
            <Select
              options={[
                { value: '', label: 'No signature' },
                ...signatures.map((s) => ({ value: s.id, label: s.name })),
              ]}
              value={selectedSignature?.id || ''}
              onChange={(val) => onSelectSignature(signatures.find((s) => s.id === val) || null)}
            />
            <Button variant="secondary" icon="plus" onClick={openAddSignature}>Add New Signature</Button>
          </div>
        </Field>

        <div className="inv-signature-preview">
          {previewUrl ? (
            <div className="inv-signature-image">
              <img src={previewUrl} alt={selectedSignature?.name || 'Signature'} />
            </div>
          ) : (
            <div className="inv-signature-placeholder">
              <Icon name="pen-tool" size={32} strokeWidth={1.5} />
              <span>Signature preview</span>
            </div>
          )}
          {selectedSignature && (
            <button
              type="button"
              className="inv-link inv-link--danger"
              onClick={() => onDeleteSignature(selectedSignature.id)}
            >
              <Icon name="trash" size={14} /> Remove
            </button>
          )}
        </div>
      </div>

      <Modal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        title="Add New Signature"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSignatureModal(false)}>Cancel</Button>
            <Button icon="pen-tool" onClick={submitSignature}>Add Signature</Button>
          </>
        }
      >
        <form className="inv-modal-form" onSubmit={(e) => { e.preventDefault(); submitSignature(); }}>
          <Field label="Signature Name" required>
            <Input
              value={sigName}
              onChange={(e) => setSigName(e.target.value)}
              placeholder="e.g. Authorised Signatory"
            />
          </Field>
          <Field label="Upload Signature Image">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) setSigImage(e.target.files[0]);
              }}
              className="form-input"
            />
          </Field>
        </form>
      </Modal>
    </Card>
  );
}