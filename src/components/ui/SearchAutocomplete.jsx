import { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';

export default function SearchAutocomplete({ items, fields, onSelect, placeholder = 'Search...', className = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setShow(false); return; }
    const q = query.toLowerCase();
    const scored = [];
    for (const item of items) {
      let score = 0;
      for (const field of fields) {
        const val = String(item[field] || '').toLowerCase();
        if (val === q) score += 100;
        else if (val.startsWith(q)) score += 50;
        else if (val.includes(q)) score += 25;
      }
      if (score > 0) scored.push({ item, score });
    }
    setResults(scored.sort((a, b) => b.score - a.score).slice(0, 10).map((s) => s.item));
    setShow(true);
    setSelectedIndex(-1);
  }, [query, items, fields]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); e.preventDefault(); }
    if (e.key === 'ArrowUp') { setSelectedIndex((i) => Math.max(i - 1, 0)); e.preventDefault(); }
    if (e.key === 'Enter' && selectedIndex >= 0) { selectItem(results[selectedIndex]); }
    if (e.key === 'Escape') setShow(false);
  };

  const selectItem = (item) => {
    if (onSelect) onSelect(item);
    setShow(false);
    setQuery('');
  };

  return (
    <div className={`search-autocomplete ${className}`}>
      <div className="search-autocomplete-input">
        <Icon name="search" size={14} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          placeholder={placeholder}
          aria-label="Search"
          autoComplete="off"
        />
        {query && <button className="search-clear" onClick={() => { setQuery(''); setResults([]); }} aria-label="Clear search"><Icon name="close" size={12} /></button>}
      </div>
      {show && results.length > 0 && (
        <ul className="search-autocomplete-results" ref={listRef} role="listbox">
          {results.map((item, i) => (
            <li
              key={i}
              className={`search-autocomplete-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={() => selectItem(item)}
              role="option"
              aria-selected={i === selectedIndex}
            >
              {fields.map((f) => (
                <span key={f} className="search-result-field">{item[f]}</span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
