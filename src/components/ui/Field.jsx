export function Field({ label, children, required }) {
  return (
    <div className="form-group">
      <label className={`form-label${required ? ' form-label-required' : ''}`}>{label}</label>
      {children}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`form-input ${className}`} {...props} />;
}