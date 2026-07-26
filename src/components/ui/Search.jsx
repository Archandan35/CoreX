import Icon from './Icon.jsx';

export default function Search({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`search-input-wrapper ${className}`}>
      <Icon name="search" size={16} className="search-input-icon" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="search-input"
      />
      {value && (
        <button className="search-input-clear" onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}
