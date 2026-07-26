import { validatePassword } from '../../identity/security/passwordPolicy.js';

export default function PasswordStrength({ password }) {
  const { score, checks } = validatePassword(password);
  const labels = { 0: 'Very Weak', 20: 'Weak', 40: 'Medium', 60: 'Strong', 80: 'Very Strong' };
  const label = Object.entries(labels).reverse().find(([k]) => score >= Number(k))?.[1] || 'None';

  if (!password) return null;

  return (
    <div className="password-strength">
      <div className="password-strength-bar">
        <div
          className={`password-strength-fill strength-${label.toLowerCase().replace(/\s+/g, '-')}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="password-strength-label">{label}</span>
      <ul className="password-strength-checks">
        {Object.entries(checks).map(([key, valid]) => (
          <li key={key} className={valid ? 'check-valid' : 'check-invalid'}>
            {valid ? '✓' : '○'} {key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}
          </li>
        ))}
      </ul>
    </div>
  );
}
