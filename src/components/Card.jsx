import { memo } from 'react';

const Card = memo(function Card({ children, title, subtitle, actions, footer, className = '', bodyClass = '', ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className={`card-body ${bodyClass}`}>{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
});

export default Card;
