export default function Badge({ children, variant = 'default', className = '', size = 'sm' }) {
  return (
    <span className={`badge badge--${variant} badge--${size} ${className}`}>
      {children}
    </span>
  );
}
