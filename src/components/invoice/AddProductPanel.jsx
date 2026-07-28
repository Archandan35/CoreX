import { useEffect, useState, useCallback, useMemo } from 'react';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import { Field, Input } from '../ui/Field.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import Textarea from '../ui/Textarea.jsx';
import FileUpload from '../ui/FileUpload.jsx';
import { invoiceService } from '../../services/invoice/index.js';
import { TAX_RATE_OPTIONS } from '../../constants/index.js';

const EMPTY_PRODUCT = {
  name: '', is_service: false,
  selling_price: '', tax_rate: '', tax_type: 'exclusive', unit: '',
  hsn_sac: '', purchase_price: '', barcode: '', auto_barcode: false,
  category_id: '', brand: '', manufacturer: '', sku: '', item_code: '', item_group: '',
  description: '',
  opening_qty: '', opening_price: '', opening_value: '', warehouse: '', batch: '',
  discount: '', discount_type: 'percent', max_discount: '',
  cess: '', inventory_tracking: false, low_stock_alert: '', reorder_qty: '',
  show_online: false, not_for_sale: false, featured: false, allow_negative: false,
  track_serial: false, track_batch: false, track_expiry: false,
  custom_fields: {},
  media: [], attachments: [],
};

const PRICE_LIST_EMPTY = { price_list_id: '', selling_price: '', currency: 'INR', effective_date: '', expiry_date: '' };

const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

export default function AddProductPanel({ open, onClose, onSubmit }) {
  const [tab, setTab] = useState('details');
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [priceLists, setPriceLists] = useState([]);
  const [priceListRows, setPriceListRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [units, setUnits] = useState([]);
  const [configPriceLists, setConfigPriceLists] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_PRODUCT);
    setErrors({});
    setPriceListRows([]);
    setMoreOpen(false);
    setTab('details');
    Promise.all([
      invoiceService.listProductCategories().catch(() => []),
      invoiceService.listBrands().catch(() => []),
      invoiceService.listWarehouses().catch(() => []),
      invoiceService.listUnits().catch(() => []),
      invoiceService.listPriceLists().catch(() => []),
    ]).then(([cats, br, wh, un, pl]) => {
      setCategories(cats);
      setBrands(br);
      setWarehouses(wh);
      setUnits(un);
      setConfigPriceLists(pl);
    });
  }, [open]);

  const set = useCallback((key) => (e) => {
    const val = e.target?.type === 'checkbox' ? e.target.checked : e.target?.value ?? e;
    setForm(p => ({ ...p, [key]: val }));
  }, []);

  const setNumeric = useCallback((key) => (e) => {
    const v = e.target.value;
    if (v === '' || /^\d*\.?\d*$/.test(v)) setForm(p => ({ ...p, [key]: v }));
  }, []);

  const openingQty = form.opening_qty;
  const openingPrice = form.opening_price;
  const openingValue = useMemo(() => {
    const q = parseFloat(openingQty) || 0;
    const p = parseFloat(openingPrice) || 0;
    return (q * p).toFixed(2);
  }, [openingQty, openingPrice]);

  const addPriceListRow = useCallback(() => {
    setPriceListRows(p => [...p, { ...PRICE_LIST_EMPTY }]);
  }, []);

  const updatePriceListRow = useCallback((idx, field) => (e) => {
    setPriceListRows(p => {
      const n = [...p];
      n[idx] = { ...n[idx], [field]: e.target?.value ?? e };
      return n;
    });
  }, []);

  const removePriceListRow = useCallback((idx) => {
    setPriceListRows(p => p.filter((_, i) => i !== idx));
  }, []);

  const addMedia = useCallback((files) => {
    setForm(p => ({ ...p, media: [...p.media, ...files] }));
  }, []);

  const removeMedia = useCallback((idx) => {
    setForm(p => ({ ...p, media: p.media.filter((_, i) => i !== idx) }));
  }, []);

  const addAttachment = useCallback((files) => {
    setForm(p => ({ ...p, attachments: [...p.attachments, ...files] }));
  }, []);

  const removeAttachment = useCallback((idx) => {
    setForm(p => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }));
  }, []);

  const validate = useCallback(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required.';
    if (priceListRows.some((r, i) => {
      if (!r.price_list_id) { errs[`pl_${i}_list`] = true; return true; }
      return false;
    })) errs.priceList = 'Each price list row needs a list selected.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, priceListRows]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        ...form,
        unit_price: parseFloat(form.selling_price) || 0,
        tax_rate: parseFloat(form.tax_rate) || 0,
        stock_quantity: parseFloat(form.opening_qty) || 0,
        stock_alert: parseFloat(form.low_stock_alert) || 0,
        purchase_price: parseFloat(form.purchase_price) || 0,
      };
      delete payload.selling_price;
      delete payload.opening_qty;
      delete payload.opening_price;
      delete payload.opening_value;
      delete payload.low_stock_alert;
      delete payload.reorder_qty;
      const product = await invoiceService.createProduct(payload);
      if (priceListRows.length) {
        await invoiceService.saveProductPriceLists(product.id, priceListRows.map(r => ({
          ...r, selling_price: parseFloat(r.selling_price) || 0,
        })));
      }
      onSubmit?.(product);
    } catch (e) {
      setErrors({ submit: e.message || 'Failed to save product.' });
    } finally {
      setBusy(false);
    }
  }, [form, priceListRows, validate, onSubmit]);

  if (!open) return null;

  const inputClass = (key) => `inv-input${errors[key] ? ' inv-input--error' : ''}`;

  return (
    <div className="ds-overlay" onClick={onClose}>
      <div className="ds-panel ds-panel--wide" onClick={e => e.stopPropagation()}>
        <div className="ds-header">
          <div className="ds-header-left">
            <button className="ds-close-btn" onClick={onClose}><Icon name="x" size={18} /></button>
            <h2>Add Item</h2>
          </div>
          <Button onClick={handleSubmit} loading={busy} icon="package">Add Item</Button>
        </div>

        <div className="ds-body">
          <div className="ps-primary-tabs">
            <button className={`ps-primary-tab${tab === 'details' ? ' active' : ''}`} onClick={() => setTab('details')}>Details</button>
            <button className={`ps-primary-tab${tab === 'prices' ? ' active' : ''}`} onClick={() => setTab('prices')}>Price Lists</button>
            <button className={`ps-primary-tab${tab === 'attachments' ? ' active' : ''}`} onClick={() => setTab('attachments')}>Attachments</button>
          </div>

          {tab === 'details' && (
            <>
              <div className="ds-section">
                <div className="ap-segmented">
                  <button className={`ap-seg-btn${!form.is_service ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, is_service: false }))}>Product</button>
                  <button className={`ap-seg-btn${form.is_service ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, is_service: true }))}>Service</button>
                </div>
              </div>

              <div className="ds-section">
                <div className="ds-section-header">
                  <h3 className="ds-section-title">Basic Details</h3>
                </div>
                <div className="ds-grid-2">
                  <Field label="Product Name" required>
                    <Input className={inputClass('name')} value={form.name} onChange={set('name')} placeholder="e.g. Web Hosting (1 yr)" />
                    {errors.name && <span className="inv-field-error">{errors.name}</span>}
                  </Field>
                  <Field label="Selling Price">
                    <Input type="number" min="0" step="0.01" value={form.selling_price} onChange={setNumeric('selling_price')} placeholder="0.00" />
                  </Field>
                  <Field label="Tax %">
                    <Select options={[{ value: '', label: 'None' }, ...TAX_RATE_OPTIONS.map(r => ({ value: String(r), label: `${r}%` }))]} value={String(form.tax_rate)} onChange={set('tax_rate')} />
                  </Field>
                  <Field label="Tax Type">
                    <Select options={[{ value: 'exclusive', label: 'Exclusive' }, { value: 'inclusive', label: 'Inclusive' }]} value={form.tax_type} onChange={set('tax_type')} />
                  </Field>
                  <Field label="Primary Unit">
                    <Select options={[{ value: '', label: 'Select Unit' }, ...units.map(u => ({ value: u.id || u.name, label: u.name }))]} value={form.unit} onChange={set('unit')} />
                  </Field>
                </div>
              </div>

              <div className="ds-section">
                <div className="ds-section-header">
                  <h3 className="ds-section-title">Additional Information</h3>
                </div>
                <div className="ds-grid-2">
                  <Field label="HSN / SAC"><Input value={form.hsn_sac} onChange={set('hsn_sac')} placeholder="HSN code" /></Field>
                  <Field label="Purchase Price"><Input type="number" min="0" step="0.01" value={form.purchase_price} onChange={setNumeric('purchase_price')} placeholder="0.00" /></Field>
                  <Field label="Barcode"><Input value={form.barcode} onChange={set('barcode')} placeholder="Barcode" /></Field>
                  <Field label="Auto Generate Barcode">
                    <Checkbox checked={form.auto_barcode} onChange={set('auto_barcode')} />
                  </Field>
                  <Field label="Category">
                    <Select options={[{ value: '', label: 'None' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} value={form.category_id} onChange={set('category_id')} />
                  </Field>
                  <Field label="Brand">
                    <Select options={[{ value: '', label: 'None' }, ...brands.map(b => ({ value: b.id || b.name, label: b.name }))]} value={form.brand} onChange={set('brand')} />
                  </Field>
                  <Field label="Manufacturer"><Input value={form.manufacturer} onChange={set('manufacturer')} placeholder="Manufacturer" /></Field>
                  <Field label="SKU"><Input value={form.sku} onChange={set('sku')} placeholder="SKU" /></Field>
                  <Field label="Item Code"><Input value={form.item_code} onChange={set('item_code')} placeholder="Item code" /></Field>
                  <Field label="Item Group"><Input value={form.item_group} onChange={set('item_group')} placeholder="Item group" /></Field>
                </div>
              </div>

              <div className="ds-section">
                <div className="ds-section-header">
                  <h3 className="ds-section-title">Product Images & Videos</h3>
                </div>
                <FileUpload accept={validTypes.join(',')} maxSize={10 * 1024 * 1024} maxFiles={10} files={form.media} onAdd={addMedia} onRemove={removeMedia} />
              </div>

              <div className="ds-section">
                <div className="ds-section-header">
                  <h3 className="ds-section-title">Description</h3>
                </div>
                <Textarea value={form.description} onChange={set('description')} placeholder="Product description..." rows={5} />
              </div>

              <div className="ds-section">
                <div className="ds-section-header">
                  <h3 className="ds-section-title">Opening Stock</h3>
                </div>
                <div className="ds-grid-2">
                  <Field label="Opening Quantity"><Input type="number" min="0" value={form.opening_qty} onChange={setNumeric('opening_qty')} placeholder="0" /></Field>
                  <Field label="Purchase Price"><Input type="number" min="0" step="0.01" value={form.opening_price} onChange={setNumeric('opening_price')} placeholder="0.00" /></Field>
                  <Field label="Opening Stock Value"><Input value={openingValue} readOnly className="ap-readonly" /></Field>
                  <Field label="Warehouse / Location">
                    <Select options={[{ value: '', label: 'None' }, ...warehouses.map(w => ({ value: w.id || w.name, label: w.name }))]} value={form.warehouse} onChange={set('warehouse')} />
                  </Field>
                  <Field label="Batch Details"><Input value={form.batch} onChange={set('batch')} placeholder="Batch / Lot no." /></Field>
                </div>
              </div>

              <div className="ds-section">
                <button className="ap-more-toggle" onClick={() => setMoreOpen(o => !o)}>
                  <Icon name={moreOpen ? 'chevronUp' : 'chevronDown'} size={14} />
                  <span>More Details</span>
                </button>
                {moreOpen && (
                  <div className="ap-more-body">
                    <div className="ds-grid-2">
                      <Field label="Discount %"><Input type="number" min="0" max="100" value={form.discount} onChange={setNumeric('discount')} placeholder="0" /></Field>
                      <Field label="Discount Type">
                        <Select options={[{ value: 'percent', label: 'Percentage' }, { value: 'fixed', label: 'Fixed' }]} value={form.discount_type} onChange={set('discount_type')} />
                      </Field>
                      <Field label="Max Discount Allowed"><Input type="number" min="0" value={form.max_discount} onChange={setNumeric('max_discount')} placeholder="0" /></Field>
                      <Field label="Cess %"><Input type="number" min="0" step="0.01" value={form.cess} onChange={setNumeric('cess')} placeholder="0" /></Field>
                    </div>
                    <div className="inv-toggle-row">
                      <span>Inventory Tracking</span>
                      <div className="inv-toggle-spacer">
                        <button className={`inv-switch${form.inventory_tracking ? ' inv-on' : ''}`} onClick={() => setForm(p => ({ ...p, inventory_tracking: !p.inventory_tracking }))} aria-label="Inventory Tracking" />
                      </div>
                    </div>
                    {form.inventory_tracking && (
                      <div className="ds-grid-2" style={{ marginTop: 12 }}>
                        <Field label="Low Stock Alert"><Input type="number" min="0" value={form.low_stock_alert} onChange={setNumeric('low_stock_alert')} placeholder="0" /></Field>
                        <Field label="Reorder Quantity"><Input type="number" min="0" value={form.reorder_qty} onChange={setNumeric('reorder_qty')} placeholder="0" /></Field>
                      </div>
                    )}
                    <div className="inv-toggle-row">
                      <span>Show in Online Store</span>
                      <div className="inv-toggle-spacer">
                        <button className={`inv-switch${form.show_online ? ' inv-on' : ''}`} onClick={() => setForm(p => ({ ...p, show_online: !p.show_online }))} aria-label="Show in Online Store" />
                      </div>
                    </div>
                    <div className="inv-toggle-row">
                      <span>Not for Sale</span>
                      <div className="inv-toggle-spacer">
                        <button className={`inv-switch${form.not_for_sale ? ' inv-on' : ''}`} onClick={() => setForm(p => ({ ...p, not_for_sale: !p.not_for_sale }))} aria-label="Not for Sale" />
                      </div>
                    </div>
                    <div className="inv-toggle-row">
                      <span>Featured Item</span>
                      <div className="inv-toggle-spacer">
                        <button className={`inv-switch${form.featured ? ' inv-on' : ''}`} onClick={() => setForm(p => ({ ...p, featured: !p.featured }))} aria-label="Featured Item" />
                      </div>
                    </div>
                    <div className="inv-toggle-row">
                      <span>Allow Negative Stock</span>
                      <div className="inv-toggle-spacer">
                        <button className={`inv-switch${form.allow_negative ? ' inv-on' : ''}`} onClick={() => setForm(p => ({ ...p, allow_negative: !p.allow_negative }))} aria-label="Allow Negative Stock" />
                      </div>
                    </div>
                    <div className="inv-toggle-row">
                      <span>Track Serial Number</span>
                      <div className="inv-toggle-spacer">
                        <button className={`inv-switch${form.track_serial ? ' inv-on' : ''}`} onClick={() => setForm(p => ({ ...p, track_serial: !p.track_serial }))} aria-label="Track Serial Number" />
                      </div>
                    </div>
                    <div className="inv-toggle-row">
                      <span>Track Batch Number</span>
                      <div className="inv-toggle-spacer">
                        <button className={`inv-switch${form.track_batch ? ' inv-on' : ''}`} onClick={() => setForm(p => ({ ...p, track_batch: !p.track_batch }))} aria-label="Track Batch Number" />
                      </div>
                    </div>
                    <div className="inv-toggle-row">
                      <span>Expiry Date Tracking</span>
                      <div className="inv-toggle-spacer">
                        <button className={`inv-switch${form.track_expiry ? ' inv-on' : ''}`} onClick={() => setForm(p => ({ ...p, track_expiry: !p.track_expiry }))} aria-label="Expiry Date Tracking" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'prices' && (
            <div className="ds-section">
              <div className="ap-section-title-row">
                <h3 className="ds-section-title">Price Lists</h3>
                <button className="inv-link-action" onClick={addPriceListRow}><Icon name="plus" size={14} /> Add Row</button>
              </div>
              {priceListRows.length === 0 ? (
                <div className="ap-empty">No price lists configured. Click "Add Row" to set pricing for specific lists.</div>
              ) : (
                <div className="ap-price-table">
                  <div className="ap-price-header">
                    <span>Price List</span>
                    <span>Selling Price</span>
                    <span>Currency</span>
                    <span>Effective Date</span>
                    <span>Expiry Date</span>
                    <span></span>
                  </div>
                  {priceListRows.map((row, i) => (
                    <div key={i} className="ap-price-row">
                      <Select options={[{ value: '', label: 'Select' }, ...configPriceLists.map(p => ({ value: p.id || p.name, label: p.name }))]} value={row.price_list_id} onChange={updatePriceListRow(i, 'price_list_id')} />
                      <Input type="number" min="0" step="0.01" value={row.selling_price} onChange={updatePriceListRow(i, 'selling_price')} placeholder="0.00" />
                      <Select options={[{ value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }]} value={row.currency} onChange={updatePriceListRow(i, 'currency')} />
                      <Input type="date" value={row.effective_date} onChange={updatePriceListRow(i, 'effective_date')} />
                      <Input type="date" value={row.expiry_date} onChange={updatePriceListRow(i, 'expiry_date')} />
                      <button className="inv-icon-btn ap-remove" onClick={() => removePriceListRow(i)}><Icon name="trash" size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'attachments' && (
            <div className="ds-section">
              <div className="ds-section-header">
                <h3 className="ds-section-title">Attachments</h3>
                <p className="ds-section-desc">Upload product images, PDFs, manuals, warranty files, certificates, and other documents.</p>
              </div>
              <FileUpload accept="*" maxSize={20 * 1024 * 1024} maxFiles={20} files={form.attachments} onAdd={addAttachment} onRemove={removeAttachment} />
            </div>
          )}
        </div>

        <div className="ds-footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={busy} icon="package">
            Add Item
          </Button>
        </div>
      </div>
    </div>
  );
}
