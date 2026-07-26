export default function Filter({ children, className = '' }) {
  return (
    <div className={`filter-bar ${className}`}>
      {children}
    </div>
  );
}

export function FilterItem({ label, children }) {
  return (
    <div className="filter-item">
      {label && <span className="filter-item__label">{label}</span>}
      {children}
    </div>
  );
}
