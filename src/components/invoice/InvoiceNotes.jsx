import Icon from '../ui/Icon.jsx';

export default function InvoiceNotes({
  notes, onAddNote, onRemoveNote, onUpdateNote,
  terms, onAddTerm, onRemoveTerm, onUpdateTerm,
  onAiSuggest,
  reverseCharge, onReverseCharge,
  eWaybill, onEWaybill,
  eInvoice, onEInvoice,
  attachments, onAddAttachment, onRemoveAttachment,
}) {
  const handleEmptyNote = (e) => {
    const val = e.target.value;
    if (val.trim()) {
      onAddNote();
      setTimeout(() => onUpdateNote(0, { id: Date.now().toString(), text: val }), 0);
    }
  };
  return (
    <section className="inv-card inv-notes-card">
      <h2>Notes, terms &amp; more</h2>

      <div className="inv-field-row-head">
        <div className="inv-row-label">
          <Icon name="edit" size={15} /> Notes <Icon name="info" size={13} />
        </div>
        <button className="inv-btn-link-outline" onClick={onAddNote}>
          <Icon name="plus" size={12} /> New Note
        </button>
      </div>
      <div className="inv-notes-textarea">
        {notes.length === 0 ? (
          <textarea placeholder="Enter your notes, say thanks, or anything else..." onChange={handleEmptyNote} />
        ) : (
          notes.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <textarea
                value={n.text || ''}
                onChange={(e) => onUpdateNote(i, { ...n, text: e.target.value })}
                placeholder="Enter your notes..."
                style={{ flex: 1, minHeight: 60, border: 'none', outline: 'none', resize: 'vertical', fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: 'var(--inv-text-main)' }}
              />
              <button type="button" className="inv-table-remove-btn" onClick={() => onRemoveNote(i)} aria-label="Remove note">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))
        )}
        <button className="inv-btn-ai-assist" onClick={onAiSuggest}>
          <Icon name="sparkles" size={12} /> AI Assist
        </button>
      </div>

      <div className="inv-terms-row">
        <div className="inv-field-row-head">
          <div className="inv-row-label">
            <Icon name="file-text" size={15} /> Terms &amp; Conditions <Icon name="info" size={13} />
          </div>
          <button className="inv-btn-link-outline" onClick={onAddTerm}>
            <Icon name="plus" size={12} /> New Terms
          </button>
        </div>
        {terms.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <textarea
              value={t.text || ''}
              onChange={(e) => onUpdateTerm(i, { ...t, text: e.target.value })}
              placeholder="Enter terms & conditions..."
              style={{ flex: 1, minHeight: 50, border: '1px solid var(--inv-border)', borderRadius: 'var(--inv-radius-sm)', padding: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
            />
            <button type="button" className="inv-table-remove-btn" onClick={() => onRemoveTerm(i)} aria-label="Remove term">
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="inv-toggle-row">
        <span>Reverse Charge Mechanism applicable?</span>
        <Icon name="info" size={13} />
        <div className="inv-toggle-spacer">
          <button
            className={`inv-switch${reverseCharge ? ' inv-on' : ''}`}
            onClick={() => onReverseCharge(!reverseCharge)}
            aria-label="Reverse Charge Mechanism"
          />
        </div>
      </div>
      <div className="inv-toggle-row">
        <span>Create E-Waybill</span>
        <div className="inv-toggle-spacer">
          <button
            className={`inv-switch${eWaybill ? ' inv-on' : ''}`}
            onClick={() => onEWaybill(!eWaybill)}
            aria-label="Create E-Waybill"
          />
        </div>
      </div>
      <div className="inv-toggle-row">
        <span>Create E-Invoice</span>
        <div className="inv-toggle-spacer">
          <button
            className={`inv-switch${eInvoice ? ' inv-on' : ''}`}
            onClick={() => onEInvoice(!eInvoice)}
            aria-label="Create E-Invoice"
          />
        </div>
      </div>

      <div className="inv-attach-row">
        <div className="inv-attach-label">
          Attach files <Icon name="info" size={13} />
        </div>
        <button className="inv-btn-attach" onClick={() => document.getElementById('inv-file-input')?.click()}>
          <Icon name="upload" size={14} /> Attach Files (Max: 5)
        </button>
        <input
          id="inv-file-input"
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              Array.from(e.target.files).slice(0, 5 - attachments.length).forEach(f => onAddAttachment(f));
            }
            e.target.value = '';
          }}
        />
        {attachments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {attachments.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                background: 'var(--inv-indigo-pale)', borderRadius: 8, fontSize: 12
              }}>
                <Icon name="paperclip" size={12} />
                <span style={{ flex: 1, color: 'var(--inv-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name || f}
                </span>
                <button type="button" className="inv-table-remove-btn" onClick={() => onRemoveAttachment(i)} aria-label="Remove file">
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}