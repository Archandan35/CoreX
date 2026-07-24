import { useTheme } from '@/hooks/useTheme';
import Icon from './Icon';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="topbar__theme-btn" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
    </button>
  );
}