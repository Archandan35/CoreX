import { themeManager } from '../../managers/ThemeManager.js';
import Icon from './Icon.jsx';

export default function ThemeToggle({ className = '' }) {
  const isDark = themeManager.isDark();

  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={() => themeManager.toggle()}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={16} />
    </button>
  );
}
