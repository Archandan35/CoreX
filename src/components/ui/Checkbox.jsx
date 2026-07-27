import Icon from './Icon.jsx';

// Accessible checkbox. Reuses existing design tokens via a shared class.
export default function Checkbox({ checked, onChange, label, disabled, id }) {
  return (
    <label className={`checkbox${disabled ? ' checkbox--disabled' : ''}`}>
      <input
        type="checkbox"
        id={id}
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="checkbox__box">
        {checked && <Icon name="check" size={12} strokeWidth={3} />}
      </span>
      {label && <span className="checkbox__label">{label}</span>}
    </label>
  );
}
