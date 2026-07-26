import { useState } from 'react';
import Icon from './Icon.jsx';

export default function PasswordInput({ value, onChange, placeholder, ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="form-input"
        {...props}
      />
      <button type="button" className="password-toggle" onClick={() => setShow((p) => !p)} tabIndex={-1}>
        <Icon name={show ? 'eye-off' : 'eye'} size={16} />
      </button>
    </div>
  );
}