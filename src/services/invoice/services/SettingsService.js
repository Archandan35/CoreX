import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';
import { INVOICE_TABLE_COLUMNS } from '../../../constants/index.js';

// Maps document_settings table columns (snake_case) to the camelCase keys the
// UI consumes (matches DEFAULT_DOCUMENT_SETTINGS). default_due_days is read
// snake_case by CreateInvoice/EditInvoice, so it is not converted.
const COLUMN_TO_KEY = [
  ['invoice_template', 'invoiceTemplate'],
  ['custom_fields_enabled', 'customFieldsEnabled'],
  ['prefix_suffix', 'prefixSuffix'],
  ['default_notes_and_terms', 'defaultNotesAndTerms'],
  ['show_images', 'showImages'],
  ['show_net_balance', 'showNetBalance'],
  ['show_previous_dues', 'showPreviousDues'],
  ['show_due_date', 'showDueDate'],
  ['show_dispatch_address', 'showDispatchAddress'],
  ['show_payments', 'showPayments'],
  ['show_round_off', 'showRoundOff'],
  ['show_receiver_signature', 'showReceiverSignature'],
  ['hide_quantity', 'hideQuantity'],
  ['show_quantity_3_decimals', 'showQuantity3Decimals'],
  ['show_quantity_conversion', 'showQuantityConversion'],
  ['hide_discount', 'hideDiscount'],
  ['show_discount_column', 'showDiscountColumn'],
  ['price_decimals', 'priceDecimals'],
  ['hide_hsn_sac', 'hideHsnSac'],
  ['show_company_details', 'showCompanyDetails'],
  ['show_brand_name', 'showBrandName'],
  ['show_hsn_sac_summary', 'showHsnSacSummary'],
  ['hsn_sac_summary_on', 'hsnSacSummaryOn'],
  ['pdf_footer', 'pdfFooter'],
  ['thermal_footer', 'thermalFooter'],
  ['header_image', 'headerImage'],
  ['footer_image', 'footerImage'],
  ['banner_image_top', 'bannerImageTop'],
  ['banner_image_bottom', 'bannerImageBottom'],
  ['pdf_language', 'pdfLanguage'],
  ['pdf_font_style', 'pdfFontStyle'],
  ['pdf_font_size', 'pdfFontSize'],
  ['pdf_orientation', 'pdfOrientation'],
  ['repeat_header', 'repeatHeader'],
  ['enable_item_headers', 'enableItemHeaders'],
  ['show_full_page', 'showFullPage'],
  ['show_striped_rows', 'showStripedRows'],
  ['pdf_margin_top', 'pdfMarginTop'],
  ['pdf_margin_bottom', 'pdfMarginBottom'],
  ['pdf_margin_left', 'pdfMarginLeft'],
  ['pdf_margin_right', 'pdfMarginRight'],
  ['show_conversion_factor', 'showConversionFactor'],
  ['show_inr', 'showInr'],
  ['pdf_accent_color', 'pdfAccentColor'],
  ['watermark', 'watermark'],
  ['social_links', 'socialLinks'],
  ['labels', 'labels'],
  ['email_template', 'emailTemplate'],
  ['whatsapp_template', 'whatsappTemplate'],
];

function rowToApi(row) {
  const out = {};
  for (const [col, key] of COLUMN_TO_KEY) {
    if (row[col] !== undefined && row[col] !== null) out[key] = row[col];
  }
  if (row.default_due_days !== undefined && row.default_due_days !== null) out.default_due_days = row.default_due_days;
  return out;
}

function apiToRow(payload) {
  const row = {};
  for (const [col, key] of COLUMN_TO_KEY) {
    if (payload[key] !== undefined) row[col] = payload[key];
  }
  if (payload.default_due_days !== undefined) row.default_due_days = payload.default_due_days;
  return row;
}

async function getSettingsRow(supabase) {
  const { data, error } = await supabase.from('document_settings').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error || !data) return null;
  return data;
}

export class SettingsService {
  async getDocumentSettings() {
    const supabase = await getSupabaseClient();
    const row = await getSettingsRow(supabase);
    return row ? rowToApi(row) : {};
  }

  async saveDocumentSettings(updates) {
    const supabase = await getSupabaseClient();
    const existing = await getSettingsRow(supabase);
    const row = { ...apiToRow(updates) };
    if (existing) {
      const { error } = await supabase.from('document_settings').update(row).eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('document_settings').insert({ ...row, id: crypto.randomUUID() });
      if (error) throw new Error(error.message);
    }
    return true;
  }

  async getColumnDefinitions() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('invoice_table_columns').select('*').order('display_order', { ascending: true });
    if (error || !data || data.length === 0) return INVOICE_TABLE_COLUMNS;
    return data.map((c) => ({
      id: c.id,
      key: c.key,
      label: c.label,
      always: c.always,
      defaultVisible: c.default_visible,
      width: c.width,
      permission: c.permission,
      displayOrder: c.display_order,
    }));
  }

  async listDocumentTypes() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('document_type_master').select('name').order('name', { ascending: true });
    if (error || !data) return [];
    return data.map(r => r.name);
  }
}

export const settingsService = new SettingsService();
