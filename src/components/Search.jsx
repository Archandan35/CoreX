import { memo, useState, useRef, useEffect } from 'react';
import I from '../icon';

const Search = memo(function Search({ value = '', onChange, onSearch, placeholder = 'Search...', suggestions = [], onSuggestionSelect, className = '' }) {
  const [internalValue, setInternalValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => { setInternalValue(value); }, [value]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setInternalValue(v);
    onChange?.(v);
    setShowSuggestions(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || !suggestions.length) {
      if (e.key === 'Enter') onSearch?.(internalValue);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && onSuggestionSelect) {
        onSuggestionSelect(suggestions[activeIndex]);
        setShowSuggestions(false);
      } else {
        onSearch?.(internalValue);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`search-container ${className}`} ref={containerRef}>
      <span className="search-icon"><I.Search /></span>
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
      />
      {internalValue && (
        <button className="search-clear" onClick={() => { setInternalValue(''); onChange?.(''); onSearch?.(''); inputRef.current?.focus(); }}>×</button>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`search-suggestion ${i === activeIndex ? 'active' : ''}`}
              onClick={() => { onSuggestionSelect?.(s); setShowSuggestions(false); }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <I.Search className="search-suggestion-icon" />
              <span className="search-suggestion-text">{typeof s === 'string' ? s : s.label || s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default Search;
