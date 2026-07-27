// Accessible toggle switch. Reuses the existing `.toggle-switch` styles
// already defined in index.css (see Register.jsx usage). One generic
// component for every switch across the app — no inline switch markup.
export default function Toggle({ checked, onChange, label, disabled, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle-switch${checked ? ' toggle-switch--on' : ''}`}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
    >
      <span className="toggle-switch-knob" />
    </button>
  );
}
