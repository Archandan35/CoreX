import Icon from './Icon.jsx';

const Button = ({ type = 'button', variant = 'primary', className = '', loading = false, disabled = false, children, icon, onClick, onMouseEnter, onMouseLeave }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn ${variant ? `btn-${variant}` : ''} ${className}`.trim()}
      disabled={disabled || loading}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {loading && <span className="spinner spinner-sm" />}
      {icon && <span className="btn__icon">{typeof icon === 'string' ? <Icon name={icon} size={16} /> : icon}</span>}
      {children}
    </button>
  );
};
export default Button;