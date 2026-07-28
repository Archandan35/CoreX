import { useLookup } from './useLookup.js';

export function useProductColumns() {
  const { data: columns } = useLookup('/api/product-columns', true); // keepResult true to avoid re‑fetching
  const layout = columns.map(c => ({
    id: c.id,
    label: c.label,
    render: row => row[c.id],
    permission: c.permission, // optional RBAC flag
  }));
  return layout;
}
