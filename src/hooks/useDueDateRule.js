import { useLookup } from './useLookup.js';

export function useDueDateRule() {
  const { data, loading } = useLookup('/api/due-date-rules');
  // Expect { rule: 'invoiceDate + 30d', description: '30 days after invoice' }
  if (loading) return { loading, rule: null };
  const item = data[0] || {};
  return { loading: false, rule: item.rule, description: item.description };
}
