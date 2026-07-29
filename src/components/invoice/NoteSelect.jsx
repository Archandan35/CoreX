import { useEffect, useState } from 'react';
import { noteService } from '../../services/note/index.js';

// legacy component - kept for reference
export default function NoteSelect({ onSelect }) {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await noteService.list();
      setNotes(data || []);
    };
    load();
  }, []);

  return (
    <div className="note-select">
      <label>Note</label>
      <select onChange={e => onSelect(e.target.value)}>
        <option value="">-- none --</option>
        {notes.map(n => (
          <option key={n.id} value={n.id}>
            {n.title}
          </option>
        ))}
      </select>
    </div>
  );
}
