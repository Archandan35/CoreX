export default function Skeleton({ width, height = 16, borderRadius = 4, count = 1, className = '' }) {
  if (count > 1) {
    return (
      <div className={`skeleton-group ${className}`} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="skeleton" style={{ width, height, borderRadius }} />
        ))}
      </div>
    );
  }

  return <div className={`skeleton ${className}`} style={{ width, height, borderRadius }} aria-hidden="true" />;
}
