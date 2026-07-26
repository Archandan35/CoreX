export default function Card({ children, className = '', title, subtitle, actions, padding = true }) {
  return (
    <div className={`card${padding ? ' card--padded' : ''} ${className}`}>
      {(title || subtitle || actions) && (
        <div className="card__header">
          <div>
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
