import { PERMISSIONS } from '../identity/rbac/permissions.js';

export const NAV_GROUPS = [
  { type: 'heading', label: 'MAIN' },
  {
    label: '',
    items: [
      { to: '/', label: 'Dashboard', icon: 'home', end: true },
    ],
  },
  { type: 'heading', label: 'SALES' },
  {
    label: '',
    items: [
      { to: '/quick-sale', label: 'Quick Sale', icon: 'zap' },
    ],
  },
  {
    label: 'Sales',
    icon: 'shopping-bag',
    children: [
      { to: '/sales/invoices', label: 'Invoices', icon: 'receipt', end: true, permission: PERMISSIONS.INVOICE_READ },
      { to: '/sales/credit-notes', label: 'Credit Notes', icon: 'file-text', permission: PERMISSIONS.INVOICE_READ },
      { to: '/sales/e-invoices', label: 'E-Invoices', icon: 'file-check', permission: PERMISSIONS.INVOICE_READ },
      { to: '/sales/subscriptions', label: 'Subscriptions', icon: 'refresh-cw', permission: PERMISSIONS.INVOICE_READ },
    ],
  },
  { type: 'heading', label: 'INVENTORY' },
  {
    label: '',
    items: [
      { to: '/products', label: 'Products', icon: 'package', end: true, permission: PERMISSIONS.PRODUCT_READ },
      { to: '/inventory', label: 'Inventory', icon: 'layers', end: true, permission: PERMISSIONS.PRODUCT_READ },
    ],
  },
  { type: 'heading', label: 'PURCHASES' },
  {
    label: '',
    items: [
      { to: '/vendors', label: 'Vendors', icon: 'users', end: true, permission: PERMISSIONS.VENDOR_READ },
      { to: '/purchases/orders', label: 'Purchase Orders', icon: 'clipboard-list', end: true, permission: PERMISSIONS.VENDOR_READ },
      { to: '/purchases/bills', label: 'Purchase Bills', icon: 'receipt', end: true, permission: PERMISSIONS.VENDOR_READ },
      { to: '/purchases/payments', label: 'Payments', icon: 'credit-card', end: true, permission: PERMISSIONS.VENDOR_READ },
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
  { type: 'heading', label: 'FINANCE' },
  {
    label: '',
    items: [
      { to: '/invoices/new', label: 'Create Invoice', icon: 'receipt', permission: PERMISSIONS.INVOICE_CREATE },
    ],
  },
  { type: 'heading', label: 'SYSTEM' },
  {
    label: '',
    items: [
      { to: '/settings', label: 'Settings', icon: 'gear' },
      { label: 'Setup Wizard', icon: 'wrench', action: 'setupWizard', permission: PERMISSIONS.SETUP_WIZARD },
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