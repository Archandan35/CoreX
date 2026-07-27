import { useState } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Textarea from '../ui/Textarea.jsx';
import Icon from '../ui/Icon.jsx';
import Modal from '../ui/Modal.jsx';

function NotesSection({ notes, onAddNote, onRemoveNote, onUpdateNote, onAiSuggest }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <Card className="inv-card" title="Notes">
      <div className="inv-notes">
        {notes.length === 0 ? (
          <div className="inv-notes-empty">
            <Icon name="notes" size={32} strokeWidth={1.5} />
            <p>No notes added</p>
          </div>
        ) : (
          notes.map((note, i) => (
            <div key={i} className="inv-note-row">
              <Textarea
                value={note.text || ''}
                onChange={(e) => onUpdateNote(i, { ...note, text: e.target.value })}
                placeholder="Write a note..."
                className="inv-note-textarea"
                rows={2}
              />
              <button type="button" className="inv-chip__remove" onClick={() => onRemoveNote(i)} aria-label="Remove note">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))
        )}
        <div className="inv-notes-actions">
          <Button variant="secondary" icon="plus" onClick={() => { onAddNote(); setShowModal(true); }}>New Note</Button>
          <Button variant="secondary" icon="sparkles" onClick={onAiSuggest}>AI Assistant</Button>
        </div>
      </div>
    </Card>
  );
}

function TermsSection({ terms, onAddTerm, onRemoveTerm, onUpdateTerm }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <Card className="inv-card" title="Terms & Conditions">
      <div className="inv-notes">
        {terms.length === 0 ? (
          <div className="inv-notes-empty">
            <Icon name="file-text" size={32} strokeWidth={1.5} />
            <p>No terms added</p>
          </div>
        ) : (
          terms.map((term, i) => (
            <div key={i} className="inv-note-row">
              <Textarea
                value={term.text || ''}
                onChange={(e) => onUpdateTerm(i, { ...term, text: e.target.value })}
                placeholder="Enter terms & conditions..."
                className="inv-note-textarea"
                rows={2}
              />
              <button type="button" className="inv-chip__remove" onClick={() => onRemoveTerm(i)} aria-label="Remove term">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))
        )}
        <div className="inv-notes-actions">
          <Button variant="secondary" icon="plus" onClick={() => { onAddTerm(); setShowModal(true); }}>New Terms</Button>
        </div>
      </div>
    </Card>
  );
}

export default function InvoiceNotes({ notes, terms, onAddNote, onRemoveNote, onUpdateNote, onAddTerm, onRemoveTerm, onUpdateTerm, onAiSuggest }) {
  return (
    <div className="inv-notes-section">
      <NotesSection
        notes={notes}
        onAddNote={onAddNote}
        onRemoveNote={onRemoveNote}
        onUpdateNote={onUpdateNote}
        onAiSuggest={onAiSuggest}
      />
      <TermsSection
        terms={terms}
        onAddTerm={onAddTerm}
        onRemoveTerm={onRemoveTerm}
        onUpdateTerm={onUpdateTerm}
      />
    </div>
  );
}