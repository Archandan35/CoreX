import { useState, useRef } from 'react';
import Icon from './Icon.jsx';

export default function FileUpload({ accept = '.pdf,.jpg,.jpeg,.png,.webp', maxSize = 10 * 1024 * 1024, maxFiles = 5, files = [], onAdd, onRemove, onReplace }) {
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
        style={{
          border: '2px dashed #e2e8f0', borderRadius: 8, padding: 24, textAlign: 'center',
          cursor: 'pointer', background: dragOver ? '#f0fdf4' : '#f8fafc',
          transition: 'all 0.2s',
        }}
      >
        <Icon name="upload" size={24} strokeWidth={1.5} />
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
          Drag & drop files here, or <span style={{ color: '#3815f7', fontWeight: 600 }}>browse</span>
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          {accept} · Max {Math.round(maxSize / 1024 / 1024)}MB · Up to {maxFiles} files
        </p>
        <input ref={inputRef} type="file" accept={accept} multiple style={{ display: 'none' }} onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }} />
      </div>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 8, fontSize: 12 }}>
              <Icon name="paperclip" size={14} />
              <span style={{ flex: 1, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name || f}</span>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{f.size ? Math.round(f.size / 1024) + 'KB' : ''}</span>
              <button type="button" className="inv-table-remove-btn" onClick={() => onRemove?.(i)} aria-label="Remove file"><Icon name="x" size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}