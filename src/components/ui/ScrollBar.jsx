export default function ScrollBar({ children, maxHeight, className = '', ...props }) {
  return (
    <div
      className={`scrollbar ${className}`}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
