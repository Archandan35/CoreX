import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

export class ProductService {
  async listProducts() {
    const supabase = await getSupabaseClient();
    const [pr, cr] = await Promise.all([
      supabase.from('products').select('*, category:product_categories(id,name)').order('created_at', { ascending: false }),
      supabase.from('product_categories').select('*').order('name', { ascending: true }),
    ]);
    if (pr.error) return { products: [], categories: [] };
    return { products: pr.data || [], categories: cr.data || [] };
  }

  async createProduct(payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('products').insert({ ...payload, id: crypto.randomUUID() }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateProduct(id, payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();
    if (error || !data) throw new Error('Product not found.');
    return data;
  }

  async deleteProduct(id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  async listProductCategories() {
    return this._listRows('product_categories');
  }

  async createProductCategory(payload) {
    return this._createRow('product_categories', payload);
  }

  async updateProductCategory(id, payload) {
    return this._updateRow('product_categories', id, payload);
  }

  async deleteProductCategory(id) {
    return this._deleteRow('product_categories', id);
  }

  async listBrands() {
    return this._listRows('product_brands');
  }

  async createBrand(payload) {
    return this._createRow('product_brands', payload);
  }

  async updateBrand(id, payload) {
    return this._updateRow('product_brands', id, payload);
  }

  async deleteBrand(id) {
    return this._deleteRow('product_brands', id);
  }

  async listUnits() {
    return this._listRows('product_units');
  }

  async createUnit(payload) {
    return this._createRow('product_units', payload);
  }

  async updateUnit(id, payload) {
    return this._updateRow('product_units', id, payload);
  }

  async deleteUnit(id) {
    return this._deleteRow('product_units', id);
  }

  async setPrimaryUnit(id) {
    const supabase = await getSupabaseClient();
    const { error: clearErr } = await supabase.from('product_units').update({ is_primary: false }).neq('id', id);
    if (clearErr) throw new Error(clearErr.message);
    const { data, error } = await supabase.from('product_units').update({ is_primary: true }).eq('id', id).select().single();
    if (error || !data) throw new Error('Unit not found.');
    return data;
  }

  async listWarehouses() {
    return this._listRows('product_warehouses');
  }

  async createWarehouse(payload) {
    return this._createRow('product_warehouses', payload);
  }

  async updateWarehouse(id, payload) {
    return this._updateRow('product_warehouses', id, payload);
  }

  async deleteWarehouse(id) {
    return this._deleteRow('product_warehouses', id);
  }

  async listTaxRates() {
    return this._listRows('product_tax_rates');
  }

  async createTaxRate(payload) {
    return this._createRow('product_tax_rates', payload);
  }

  async updateTaxRate(id, payload) {
    return this._updateRow('product_tax_rates', id, payload);
  }

  async deleteTaxRate(id) {
    return this._deleteRow('product_tax_rates', id);
  }

  async setDefaultTaxRate(id) {
    const supabase = await getSupabaseClient();
    const { error: clearErr } = await supabase.from('product_tax_rates').update({ is_default: false }).neq('id', id);
    if (clearErr) throw new Error(clearErr.message);
    const { data, error } = await supabase.from('product_tax_rates').update({ is_default: true }).eq('id', id).select().single();
    if (error || !data) throw new Error('Tax rate not found.');
    return data;
  }

  async listItemGroups() {
    return this._listRows('product_item_groups');
  }

  async createItemGroup(payload) {
    return this._createRow('product_item_groups', payload);
  }

  async updateItemGroup(id, payload) {
    return this._updateRow('product_item_groups', id, payload);
  }

  async deleteItemGroup(id) {
    return this._deleteRow('product_item_groups', id);
  }

  async listManufacturers() {
    return this._listRows('product_manufacturers');
  }

  async createManufacturer(payload) {
    return this._createRow('product_manufacturers', payload);
  }

  async updateManufacturer(id, payload) {
    return this._updateRow('product_manufacturers', id, payload);
  }

  async deleteManufacturer(id) {
    return this._deleteRow('product_manufacturers', id);
  }

  async _listRows(table) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(table).select('*').order('name', { ascending: true });
    return error ? [] : (data || []);
  }

  async _createRow(table, payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(table).insert({ ...payload, id: crypto.randomUUID() }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async _updateRow(table, id, payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
    if (error || !data) throw new Error('Record not found.');
    return data;
  }

  async _deleteRow(table, id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  async listPriceLists() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('product_price_lists').select('*').order('name', { ascending: true });
    return error ? [] : (data || []);
  }

  async getProductPriceLists(productId) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('product_price_list_items').select('*, price_list:product_price_lists(name)').eq('product_id', productId);
    return error ? [] : (data || []);
  }

  async saveProductPriceLists(productId, items) {
    const supabase = await getSupabaseClient();
    const { error: delErr } = await supabase.from('product_price_list_items').delete().eq('product_id', productId);
    if (delErr) throw new Error(delErr.message);
    const rows = (items || []).map(r => ({ ...r, product_id: productId, id: crypto.randomUUID() }));
    if (rows.length) {
      const { error: insErr } = await supabase.from('product_price_list_items').insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
    return true;
  }
}

export const productService = new ProductService();
