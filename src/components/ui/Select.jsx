export default function Select({ options, value, onChange, placeholder, className = '', ...props }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      className={`form-input ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return <option key={val} value={val}>{label}</option>;
      })}
    </select>
  );
}
