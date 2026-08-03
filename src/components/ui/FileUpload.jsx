import { useState, useRef } from 'react';
import Icon from './Icon.jsx';

export default function FileUpload({ accept = '.pdf,.jpg,.jpeg,.png,.webp', maxSize = 10 * 1024 * 1024, maxFiles = 5, files = [], onAdd, onRemove, _onReplace }) {
  const inputRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  const validate = (file) => {
    if (file.size > maxSize) return `File too large (max ${Math.round(maxSize / 1024 / 1024)}MB).`;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowed = accept.split(',').map(s => s.trim().toLowerCase());
    if (!allowed.includes(ext) && !allowed.includes('.' + ext)) return 'File type not supported.';
    return null;
  };

  const handleFiles = (fileList) => {
    const remaining = maxFiles - files.length;
    if (remaining <= 0) return;
    Array.from(fileList).slice(0, remaining).forEach(f => {
      const err = validate(f);
      if (err) return;
      onAdd?.(f);
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <div
        className={`file-upload-dropzone${dragOver ? ' file-upload-dropzone--active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="upload" size={24} strokeWidth={1.5} />
        <p className="file-upload-hint">
          Drag & drop files here, or <span className="file-upload-hint-link">browse</span>
        </p>
        <p className="file-upload-meta">
          {accept} · Max {Math.round(maxSize / 1024 / 1024)}MB · Up to {maxFiles} files
        </p>
        <input ref={inputRef} type="file" accept={accept} multiple className="file-upload-hidden-input" style={{ display: 'none' }} onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }} />
      </div>
      {files.length > 0 && (
        <div className="file-upload-list">
          {files.map((f, i) => (
            <div key={i} className="file-upload-item">
              <Icon name="paperclip" size={14} />
              <span className="file-upload-item-name">{f.name || f}</span>
              <span className="file-upload-item-size">{f.size ? Math.round(f.size / 1024) + 'KB' : ''}</span>
              <button type="button" className="inv-table-remove-btn" onClick={() => onRemove?.(i)} aria-label="Remove file"><Icon name="x" size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
