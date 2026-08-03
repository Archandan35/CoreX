export function Field({ label, children, required, className = '', error, helper }) {
  return (
    <div className={`form-group ${className}`}>
      <label className={`form-label${required ? ' form-label-required' : ''}`}>{label}</label>
      {children}
      {helper && <span className="form-helper">{helper}</span>}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`form-input ${className}`} {...props} />;
}