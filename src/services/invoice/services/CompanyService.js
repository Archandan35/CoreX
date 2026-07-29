import { api } from '../../api.js';
import { asJson } from './utils.js';

export class CompanyService {
  async listCompanies() {
    const r = await asJson(await api('/api/companies'));
    return r.ok ? (r.data.companies || r.data || []) : [];
  }

  async getCurrentCompany() {
    const r = await asJson(await api('/api/companies/current'));
    return r.ok ? (r.data.company || r.data) : null;
  }
}

export const companyService = new CompanyService();
