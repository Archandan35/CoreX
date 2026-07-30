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

  async listProductCategories() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('product_categories').select('*').order('name', { ascending: true });
    return error ? [] : (data || []);
  }

  async listBrands() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('product_brands').select('*').order('name', { ascending: true });
    return error ? [] : (data || []);
  }

  async listUnits() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('product_units').select('*').order('name', { ascending: true });
    return error ? [] : (data || []);
  }

  async listWarehouses() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('product_warehouses').select('*').order('name', { ascending: true });
    return error ? [] : (data || []);
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
