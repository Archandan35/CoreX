const Field = ({ label, hint, children, className = '' }) => {
  return (
    <div className={`form-group ${className}`.trim()}>
      {label && <label className="form-label">{label}</label>}
      {hint && <span className="form-hint">{hint}</span>}
      {children}
    </div>
  );
};

const Input = ({ className = '', ...props }) => {
  return (
    <input
      {...props}
      className={`form-input ${className}`.trim()}
    />
  );
};

export { Field, Input };