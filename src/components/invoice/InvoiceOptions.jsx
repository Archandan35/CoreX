import { useRef, useState, useCallback } from 'react';
import Card from '../ui/Card.jsx';
import Toggle from '../ui/Toggle.jsx';
import Icon from '../ui/Icon.jsx';
import { validateAttachment } from '../../business/invoice/validation.js';
import { INVOICE_ATTACHMENT_MAX_FILES, INVOICE_ATTACHMENT_MIME_TYPES } from '../../constants/index.js';

export default function InvoiceOptions({
  reverseCharge,
  onReverseCharge,
  eWaybill,
  onEWaybill,
  eInvoice,
  onEInvoice,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
}) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((files) => {
    const remaining = INVOICE_ATTACHMENT_MAX_FILES - attachments.length;
    const toAdd = Array.from(files).slice(0, remaining);
    for (const file of toAdd) {
      const err = validateAttachment(file);
      if (!err) onAddAttachment(file);
    }
  }, [attachments.length, onAddAttachment]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleSelect = useCallback((e) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  }, [handleFiles]);

  return (
    <Card className="inv-card">
      <div className="inv-options-grid">
        <div className="inv-options-switches">
          <div className="inv-option-row">
            <Toggle checked={reverseCharge} onChange={onReverseCharge} label="Reverse Charge Mechanism applicable" />
            <span className="inv-option-label">Reverse Charge Mechanism applicable</span>
          </div>
          <div className="inv-option-row">
            <Toggle checked={eWaybill} onChange={onEWaybill} label="Create E-Waybill" />
            <span className="inv-option-label">Create E-Waybill</span>
          </div>
          <div className="inv-option-row">
            <Toggle checked={eInvoice} onChange={onEInvoice} label="Create E-Invoice" />
            <span className="inv-option-label">Create E-Invoice</span>
          </div>
        </div>

        <div className="inv-attach-section">
          <h4 className="inv-attach-title">Attach Files</h4>
          <div
            className={`inv-attach-dropzone${dragOver ? ' inv-attach-dropzone--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="upload" size={24} strokeWidth={1.5} />
            <span>Upload files</span>
            <span className="inv-attach-hint">or drag & drop</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={INVOICE_ATTACHMENT_MIME_TYPES.join(',')}
            onChange={handleSelect}
            style={{ display: 'none' }}
          />
          <span className="inv-attach-limit">
            Max {INVOICE_ATTACHMENT_MAX_FILES} files
          </span>

          {attachments.length > 0 && (
            <div className="inv-attach-list">
              {attachments.map((file, i) => (
                <div key={i} className="inv-attach-item">
                  <Icon name="paperclip" size={14} />
                  <span className="inv-attach-name">{file.name || file}</span>
                  <button type="button" className="inv-chip__remove" onClick={() => onRemoveAttachment(i)} aria-label="Remove file">
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}