import { api } from '../../api.js';
import { asJson } from './utils.js';

export class CustomerService {
  async listCustomers(query) {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const r = await asJson(await api(`/api/customers${q}`));
    return r.ok ? r.data.customers || [] : [];
  }

  async createCustomer(payload) {
    const r = await asJson(await api('/api/customers', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create customer.');
    return r.data.customer;
  }

  async updateCustomer(id, payload) {
    const r = await asJson(await api(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update customer.');
    return r.data.customer;
  }

  async getCustomerOutstanding(id) {
    if (!id) return { totalOutstanding: 0, overdueAmount: 0 };
    const r = await asJson(await api(`/api/customers/${id}/outstanding`));
    return r.ok ? r.data : { totalOutstanding: 0, overdueAmount: 0 };
  }
}

export const customerService = new CustomerService();
