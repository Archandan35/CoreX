import I from '../icon';

const nameMap = {
  alert: I.Alert,
  check: I.Check,
  shield: I.Shield,
  moon: I.Moon,
  sun: I.Sun,
  x: I.Close,
  clock: I.Clock,
  plus: I.Plus,
  refresh: I.Refresh,
  edit: I.Edit,
  trash: I.Trash,
  user: I.User,
  settings: I.Settings,
  logout: I.Logout,
  search: I.Search,
  eye: I.Eye,
  'eye-off': I.EyeOff,
  menu: I.Menu,
  bell: I.Bell,
};

const Icon = ({ name = 'icon', size = 16 }) => {
  const C = nameMap[name];
  if (!C) return null;
  return <span className="icon" style={{ width: size, height: size }}><C /></span>;
};
export default Icon;