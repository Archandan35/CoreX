import { PERMISSIONS } from '../identity/rbac/permissions.js';

export const NAV_GROUPS = [
  { type: 'heading', label: 'MAIN' },
  {
    label: '',
    items: [
      { to: '/', label: 'Dashboard', icon: 'grid', end: true },
    ],
  },
  { type: 'heading', label: 'User Management' },
  {
    label: '',
    items: [
      { to: '/users', label: 'Users', icon: 'users', permission: PERMISSIONS.USER_READ },
      { to: '/roles', label: 'Roles', icon: 'shield', permission: PERMISSIONS.ROLE_READ },
    ],
  },
  { type: 'heading', label: 'SYSTEM' },
  {
    label: '',
    items: [
      { to: '/settings', label: 'Settings', icon: 'gear' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => {
  if (g.type === 'heading') return [];
  const items = [];
  for (const item of (g.items || [])) {
    if (item.children) items.push(...item.children);
    else items.push(item);
  }
  return items;
});

export default NAV_GROUPS;