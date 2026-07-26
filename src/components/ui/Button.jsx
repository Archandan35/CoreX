import Icon from './Icon.jsx';

export default function Button({ children, variant = 'primary', className = '', loading, disabled, icon, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Icon name="spinner" size={16} />
      ) : icon ? (
        <Icon name={icon} size={16} />
      ) : null}
      {children}
    </button>
  );
}