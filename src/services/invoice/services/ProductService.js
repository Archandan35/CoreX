import { api } from '../../api.js';
import { asJson } from './utils.js';

export class ProductService {
  async listProducts() {
    const r = await asJson(await api('/api/products'));
    if (!r.ok) return { products: [], categories: [] };
    return { products: r.data.products || [], categories: r.data.categories || [] };
  }

  async createProduct(payload) {
    const r = await asJson(await api('/api/products', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create product.');
    return r.data.product;
  }

  async updateProduct(id, payload) {
    const r = await asJson(await api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update product.');
    return r.data.product;
  }

  async listProductCategories() {
    const r = await asJson(await api('/api/product-categories'));
    return r.ok ? (r.data.categories || []) : [];
  }

  async listBrands() {
    const r = await asJson(await api('/api/product-brands'));
    return r.ok ? (r.data.brands || []) : [];
  }

  async listUnits() {
    const r = await asJson(await api('/api/product-units'));
    return r.ok ? (r.data.units || []) : [];
  }

  async listWarehouses() {
    const r = await asJson(await api('/api/product-warehouses'));
    return r.ok ? (r.data.warehouses || []) : [];
  }

  async listPriceLists() {
    const r = await asJson(await api('/api/price-lists'));
    return r.ok ? (r.data.priceLists || []) : [];
  }

  async getProductPriceLists(productId) {
    const r = await asJson(await api(`/api/products/${productId}/price-lists`));
    return r.ok ? (r.data.items || []) : [];
  }

  async saveProductPriceLists(productId, items) {
    const r = await asJson(await api(`/api/products/${productId}/price-lists`, {
      method: 'POST', body: JSON.stringify({ items }),
    }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to save price lists.');
    return true;
  }
}

export const productService = new ProductService();
