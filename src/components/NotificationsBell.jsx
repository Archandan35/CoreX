import Icon from './Icon';

export default function NotificationsBell() {
  return (
    <button className="topbar__bell" title="Notifications">
      <Icon name="bell" size={16} />
      <span className="topbar__bell-dot" />
    </button>
  );
}