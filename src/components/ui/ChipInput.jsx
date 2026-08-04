import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Icon from './Icon.jsx';

export default function ChipInput({ value = [], onChange, placeholder, readOnly, className = '' }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const chips = useMemo(() => {
    return Array.isArray(value) ? value : value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  }, [value]);

  const addChip = useCallback((val) => {
    const trimmed = val.trim();
    if (!trimmed || chips.includes(trimmed)) return;
    const next = [...chips, trimmed];
    onChange(next);
    setInputValue('');
  }, [chips, onChange]);

  const removeChip = useCallback((idx) => {
    const next = chips.filter((_, i) => i !== idx);
    onChange(next);
  }, [chips, onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) addChip(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
      removeChip(chips.length - 1);
    }
  }, [inputValue, addChip, removeChip, chips.length]);

  const handleContainerClick = useCallback(() => {
    if (!readOnly && inputRef.current) inputRef.current.focus();
  }, [readOnly]);

  // Auto-resize height
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.height = 'auto';
      containerRef.current.style.height = `${containerRef.current.scrollHeight}px`;
    }
  }, [chips]);

  return (
    <div
      ref={containerRef}
      className={`chip-input ${className}`}
      onClick={handleContainerClick}
      role="group"
      aria-label="Chip input"
    >
      {chips.map((chip, idx) => (
        <span key={idx} className="chip-input__chip">
          <span className="chip-input__chip-text">{chip}</span>
          {!readOnly && (
            <button
              type="button"
              className="chip-input__chip-remove"
              onClick={(e) => { e.stopPropagation(); removeChip(idx); }}
              aria-label={`Remove ${chip}`}
            >
              <Icon name="x" size={10} />
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          ref={inputRef}
          type="text"
          className="chip-input__field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chips.length === 0 ? placeholder : ''}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
