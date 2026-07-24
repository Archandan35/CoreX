import { memo } from 'react';

const Badge = memo(function Badge({ children, variant = 'secondary', size = '', dot = false, className = '' }) {
  const classes = ['badge', `badge-${variant}`, size ? `badge-${size}` : '', dot ? 'badge-dot' : '', className].filter(Boolean).join(' ');
  return <span className={classes}>{children}</span>;
});

export default Badge;
