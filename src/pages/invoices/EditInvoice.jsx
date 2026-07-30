import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import InvoiceHeader from '../../components/invoice/InvoiceHeader.jsx';
import InvoiceDetails from '../../components/invoice/InvoiceDetails.jsx';
import DynamicCustomHeaders from '../../components/invoice/DynamicCustomHeaders.jsx';
import ProductsToolbar, { InvoiceDiscount } from '../../components/invoice/ProductsToolbar.jsx';
import InvoiceTable from '../../components/invoice/InvoiceTable.jsx';
import InvoiceNotes from '../../components/invoice/InvoiceNotes.jsx';
import InvoiceSummary from '../../components/invoice/InvoiceSummary.jsx';
import InvoiceFooter from '../../components/invoice/InvoiceFooter.jsx';
import ProductModal from '../../components/invoice/ProductModal.jsx';
import CustomerModal from '../../components/invoice/CustomerModal.jsx';
import AddCustomerPanel from '../../components/invoice/AddCustomerPanel.jsx';
import DocumentSettings from '../../components/invoice/DocumentSettings.jsx';
import InvoiceTypeSelector from '../../components/invoice/InvoiceTypeSelector.jsx';
import CustomHeaderPanel from '../../components/invoice/CustomHeaderPanel.jsx';
import ColumnVisibilityManager from '../../components/invoice/ColumnVisibilityManager.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';

import Icon from '../../components/ui/Icon.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import useUnsavedChanges from '../../hooks/useUnsavedChanges.js';
import useColumnVisibility from '../../hooks/useColumnVisibility.js';
import { invoiceService } from '../../services/invoice/index.js';
import { computeInvoice } from '../../business/invoice/calculations.js';
import {
  validateInvoice, validateCustomer, validateProduct, validateBank,
  validateCustomHeaders, validateCreditLimit, validateFinancialYear,
} from '../../business/invoice/validation.js';
import { DEFAULT_DUE_DATE_OFFSET_DAYS } from '../../constants/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';

function generateKey() {
  return Math.random().toString(36).substring(2, 10);
}

function toNoteArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((n) => typeof n === 'string' ? { id: generateKey(), text: n } : { id: n.id || generateKey(), text: n.text || '' });
  return [];
}

function toPaymentArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((p) => ({ id: p.id || generateKey(), notes: p.notes || '', amount: Number(p.amount) || 0, paymentDate: p.paymentDate || new Date().toISOString().split('T')[0], mode: p.mode || '' }));
  return [];
}

export default function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loadingInvoice, setLoadingInvoice] = useState(true);

  // --- Data ---
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [prefixes, setPrefixes] = useState([]);
  const [units, setUnits] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [dueDateOffset, setDueDateOffset] = useState(DEFAULT_DUE_DATE_OFFSET_DAYS);
  const [companyState, setCompanyState] = useState('');

  // --- Header ---
  const [prefix, setPrefix] = useState('INV');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Customer ---
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOutstanding, setCustomerOutstanding] = useState(null);
  const [creditLimitExceeded, setCreditLimitExceeded] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');

  // --- Headers ---
  const [docType, setDocType] = useState('');
  const [customHeaderValues, setCustomHeaderValues] = useState({});
  const [customHeaderDefs, setCustomHeaderDefs] = useState([]);
  const [docSettingsOpen, setDocSettingsOpen] = useState(false);
  const [customHeaderSettingsOpen, setCustomHeaderSettingsOpen] = useState(false);
  const [headerRefreshKey, setHeaderRefreshKey] = useState(0);

  // --- Products ---
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [defaultQty, setDefaultQty] = useState(1);
  const [items, setItems] = useState([]);
  const [showDescription, setShowDescription] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);

  const {
    visibleKeys,
    visibleColumns,
    toggleColumn,
    allColumns,
  } = useColumnVisibility();

  // Clear stale header errors when definitions change
  useEffect(() => {
    setErrors(prev => {
      const validKeys = new Set((customHeaderDefs || []).map(h => h.internalKey));
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (!validKeys.has(k)) delete next[k]; });
      return next;
    });
  }, [customHeaderDefs]);

  // --- Discount ---
  const [extraDiscountType, setExtraDiscountType] = useState('percent');
  const [extraDiscountValue, setExtraDiscountValue] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState([]);

  // --- Notes & Terms ---
  const [notes, setNotes] = useState([]);
  const [terms, setTerms] = useState([]);

  // --- Toggles ---
  const [reverseCharge, setReverseCharge] = useState(false);
  const [eWaybill, setEWaybill] = useState(false);
  const [eInvoice, setEInvoice] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // --- Summary ---
  const [enableTds, setEnableTds] = useState(false);
  const [enableTcs, setEnableTcs] = useState(false);
  const [roundOff, setRoundOff] = useState(false);

  // --- Bank & Payment ---
  const [selectedBank, setSelectedBank] = useState(null);
  const [payments, setPayments] = useState([]);
  const [markFullyPaid, setMarkFullyPaid] = useState(false);

  // --- Signature ---
  const [selectedSignature, setSelectedSignature] = useState(null);

  // --- Modals ---
  const [customerModal, setCustomerModal] = useState({ open: false, mode: 'create', customer: null });
  const [addCustomerPanelOpen, setAddCustomerPanelOpen] = useState(false);
  const [productModal, setProductModal] = useState({ open: false, mode: 'create', product: null });
  const [bankModal, setBankModal] = useState(false);
  const [signatureModal, setSignatureModal] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', ifsc: '', branch: '', upi_id: '' });
  const [sigName, setSigName] = useState('');

  // --- Validation ---
  const [errors, setErrors] = useState({});
  const loadedRef = useRef(false);
  const initialized = useRef(false);

  // --- sameState: supplier state vs customer state for IGST/CGST+SGST ---
  const sameState = useMemo(() => {
    if (!companyState || !selectedCustomer?.state) return null;
    return companyState.toLowerCase() === selectedCustomer.state.toLowerCase();
  }, [companyState, selectedCustomer]);

  // --- Load invoice + reference data ---
  useEffect(() => {
    if (!id) return;
    Promise.all([
      invoiceService.getInvoice(id),
      invoiceService.listCustomers().then(d => { if (!loadedRef.current) setCustomers(Array.isArray(d) ? d : []); }).catch(e => console.warn('Failed to load customers', e)),
      invoiceService.listProducts().then(d => {
        if (loadedRef.current) return;
        const pd = d || {};
        setProducts(Array.isArray(pd.products) ? pd.products : []);
        setCategories(Array.isArray(pd.categories) ? pd.categories : []);
      }).catch(e => console.warn('Failed to load products', e)),
      invoiceService.listBanks().then(d => { if (!loadedRef.current) setBanks(Array.isArray(d) ? d : []); }).catch(e => console.warn('Failed to load banks', e)),
      invoiceService.listSignatures().then(d => { if (!loadedRef.current) setSignatures(Array.isArray(d) ? d : []); }).catch(e => console.warn('Failed to load signatures', e)),
      invoiceService.listPrefixes({ docType: 'invoice' }).then(d => { if (!loadedRef.current) setPrefixes((d?.items || []).filter(p => p.isActive !== false)); }).catch(e => console.warn('Failed to load prefixes', e)),
      invoiceService.listUnits().then(d => { if (!loadedRef.current) setUnits(Array.isArray(d) ? d : []); }).catch(e => console.warn('Failed to load units', e)),
      invoiceService.listWarehouses().then(d => { if (!loadedRef.current) setWarehouses(Array.isArray(d) ? d : []); }).catch(e => console.warn('Failed to load warehouses', e)),
      invoiceService.getDocumentSettings().then(d => { if (d?.default_due_days) setDueDateOffset(Number(d.default_due_days)); }).catch(e => console.warn('Failed to load document settings', e)),
      invoiceService.getCurrentCompany().then(company => {
        if (company?.state) setCompanyState(company.state);
      }).catch(e => console.warn('Failed to load current company', e)),
    ]).then(([invoice]) => {
      if (!invoice) return;
      loadedRef.current = true;
      setPrefix(invoice.prefix || 'INV');
      setInvoiceNumber(invoice.invoiceNumber || invoice.invoice_number || '');
      setInvoiceDate(invoice.invoiceDate || invoice.invoice_date || new Date().toISOString().split('T')[0]);
      setDueDate(invoice.dueDate || invoice.due_date || '');
      setReference(invoice.reference || '');
      if (invoice.customer || invoice.customerId) {
        setSelectedCustomer(invoice.customer || { id: invoice.customerId });
        setCustomerQuery(invoice.customer?.name || '');
      }
      setItems(Array.isArray(invoice.items) ? invoice.items.map(it => ({ ...it, _key: it._key || generateKey() })) : []);
      setNotes(toNoteArray(invoice.notes));
      setTerms(toNoteArray(invoice.terms));
      setExtraDiscountType(invoice.extraDiscountType || 'percent');
      setExtraDiscountValue(Number(invoice.extraDiscountValue) || 0);
      setAdditionalCharges(Array.isArray(invoice.additionalCharges) ? invoice.additionalCharges : []);
      setReverseCharge(!!invoice.reverseCharge);
      setEWaybill(!!invoice.eWaybill);
      setEInvoice(!!invoice.eInvoice);
      setEnableTds(!!invoice.enableTds);
      setEnableTcs(!!invoice.enableTcs);
      setRoundOff(!!invoice.roundOff);
      setDocType(invoice.docType || invoice.documentType || '');
      setCustomHeaderValues(invoice.customFieldValues || invoice.customHeaderValues || {});
      if (invoice.bank || invoice.bankId) {
        setSelectedBank(invoice.bank || { id: invoice.bankId });
      }
      setPayments(toPaymentArray(invoice.payments));
      if (invoice.signature || invoice.signatureId) {
        setSelectedSignature(invoice.signature || { id: invoice.signatureId });
      }
      initialized.current = true;
      setLoadingInvoice(false);
    }).catch((e) => {
      notificationManager.error('Invoice', e.message || 'Failed to load invoice.');
      navigate('/sales/invoices');
    });
  }, [id, navigate]);

  // --- DocType change → reload prefixes & settings ---
  useEffect(() => {
    if (!docType) return;
    invoiceService.listPrefixes({ docType }).then(d => {
      const items = (d?.items || []).filter(p => p.isActive !== false);
      setPrefixes(items);
    }).catch(e => console.warn('Failed to load prefixes for docType', e));
    invoiceService.getDocumentSettings().then(d => {
      if (d?.default_due_days) setDueDateOffset(Number(d.default_due_days));
    }).catch(e => console.warn('Failed to load document settings for docType', e));
  }, [docType]);

  // --- Computed totals ---
  const computed = useMemo(() => {
    return computeInvoice({
      items, extraDiscountType, extraDiscountValue, additionalCharges,
      roundOff, payments, sameState: sameState === true,
    });
  }, [items, extraDiscountType, extraDiscountValue, additionalCharges, roundOff, payments, sameState]);

  // --- Customer CRUD ---
  const openCreateCustomer = () => setAddCustomerPanelOpen(true);
  const closeAddCustomerPanel = () => setAddCustomerPanelOpen(false);
  const closeCustomerModal = () => setCustomerModal(p => ({ ...p, open: false }));
  const editCustomer = () => {
    if (selectedCustomer) setCustomerModal({ open: true, mode: 'edit', customer: selectedCustomer });
  };
  const submitCustomer = async (form) => {
    const errs = validateCustomer(form);
    if (Object.keys(errs).length) return;
    try {
      if (customerModal.mode === 'create') {
        const c = await invoiceService.createCustomer(form);
        setCustomers(p => [...p, c]);
        setSelectedCustomer(c);
        notificationManager.success('Customer', 'Customer created.');
      } else if (selectedCustomer) {
        const c = await invoiceService.updateCustomer(selectedCustomer.id, form);
        setCustomers(p => p.map(x => x.id === c.id ? c : x));
        setSelectedCustomer(c);
        notificationManager.success('Customer', 'Customer updated.');
      }
      closeCustomerModal();
    } catch (e) { notificationManager.error('Customer', e.message); }
  };

  // --- Customer selection auto-fill ---
  const handleSelectCustomer = useCallback(async (customer) => {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name || '');
    setErrors(prev => { const n = { ...prev }; delete n.customer; return n; });

    if (customer.payment_terms?.days) {
      const d = new Date(invoiceDate || new Date());
      d.setDate(d.getDate() + Number(customer.payment_terms.days));
      setDueDate(d.toISOString().split('T')[0]);
    }

    try {
      const outstanding = await invoiceService.getCustomerOutstanding(customer.id);
      setCustomerOutstanding(outstanding);
      const limit = Number(customer.credit_limit) || 0;
      if (limit > 0 && (outstanding.totalOutstanding || 0) >= limit) {
        setCreditLimitExceeded(true);
      } else {
        setCreditLimitExceeded(false);
      }
    } catch (e) { console.warn('Failed to get customer outstanding', e); setCustomerOutstanding(null); }

    if (customer.is_active === false) {
      setErrors(prev => ({ ...prev, customer: 'Cannot invoice an inactive customer.' }));
    }
  }, [invoiceDate]);

  // --- Product ---
  const openCreateProduct = () => setProductModal({ open: true, mode: 'create', product: null });
  const closeProductModal = () => setProductModal(p => ({ ...p, open: false }));
  const submitProduct = async (form) => {
    const errs = validateProduct(form);
    if (Object.keys(errs).length) return;
    try {
      const p = await invoiceService.createProduct(form);
      setProducts(prev => [...prev, p]);
      closeProductModal();
      notificationManager.success('Product', `"${p.name}" created.`);
    } catch (e) { notificationManager.error('Product', e.message); }
  };

  const addProduct = useCallback((product) => {
    setItems(prev => [...prev, {
      _key: generateKey(), name: product.name || product, description: product.description || '',
      quantity: Number(defaultQty) || 1, unitPrice: Number(product.unit_price) || 0,
      taxRate: Number(product.tax_rate) || 0, discountType: 'percent', discountValue: 0,
      product_id: product.id || null,
      stock_quantity: Number(product.stock_quantity) || 0,
      unit: product.unit || '',
      hsnSac: product.hsn_code || product.hsnSac || '',
    }]);
    setProductQuery('');
  }, [defaultQty]);

  const addNewProductLine = useCallback(() => {
    setItems(prev => [...prev, {
      _key: generateKey(), name: '', description: '',
      quantity: 1, unitPrice: 0, taxRate: 0, discountType: 'percent', discountValue: 0,
      product_id: null, stock_quantity: 0,
    }]);
  }, []);

  const onChangeItem = useCallback((index, updated) => {
    setItems(prev => { const n = [...prev]; n[index] = updated; return n; });
  }, []);

  const onRemoveItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  // --- Discount ---
  const addCharge = useCallback((c) => setAdditionalCharges(p => [...p, c]), []);
  const removeCharge = useCallback((i) => setAdditionalCharges(p => p.filter((_, j) => j !== i)), []);
  const updateCharge = useCallback((i, c) => setAdditionalCharges(p => { const n = [...p]; n[i] = c; return n; }), []);

  // --- Notes ---
  const addNote = useCallback(() => setNotes(p => [...p, { id: generateKey(), text: '' }]), []);
  const removeNote = useCallback((i) => setNotes(p => p.filter((_, j) => j !== i)), []);
  const updateNote = useCallback((i, n) => setNotes(p => { const next = [...p]; next[i] = n; return next; }), []);
  const addTerm = useCallback(() => setTerms(p => [...p, { id: generateKey(), text: '' }]), []);
  const removeTerm = useCallback((i) => setTerms(p => p.filter((_, j) => j !== i)), []);
  const updateTerm = useCallback((i, t) => setTerms(p => { const next = [...p]; next[i] = t; return next; }), []);

  // --- AI ---
  const draftWithAI = useCallback(async () => {
    setAiBusy(true);
    try {
      const ctx = `Edit invoice with ${items.length} items. ${selectedCustomer ? `Customer: ${selectedCustomer.name}` : ''}`;
      const result = await invoiceService.draftInvoiceWithAI(ctx);
      if (result?.items) {
        setItems(result.items.map(it => ({
          _key: generateKey(), name: it.name || '', quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0, taxRate: Number(it.taxRate) || 0,
          discountType: 'percent', discountValue: 0,
        })));
      }
      if (result?.notes) setNotes(p => [...p, { id: generateKey(), text: result.notes }]);
      if (result?.terms) setTerms(p => [...p, { id: generateKey(), text: result.terms }]);
      notificationManager.success('AI Draft', 'Invoice draft updated.');
    } catch (e) {
      notificationManager.error('AI Draft', e.message || 'Failed.');
    } finally { setAiBusy(false); }
  }, [items, selectedCustomer]);

  const aiSuggestNote = useCallback(async () => {
    try {
      const suggestion = await invoiceService.suggestNote(notes.map(n => n.text).join(' '), 'General invoice note');
      if (suggestion) setNotes(p => [...p, { id: generateKey(), text: suggestion }]);
    } catch (e) {
      notificationManager.error('AI Suggest', e.message || 'Failed to suggest note.');
    }
  }, [notes]);

  // --- Payments ---
  const addPayment = useCallback(() => {
    setPayments(p => [...p, { id: generateKey(), notes: '', amount: 0, paymentDate: new Date().toISOString().split('T')[0], mode: '' }]);
  }, []);
  const removePayment = useCallback((i) => setPayments(p => p.filter((_, j) => j !== i)), []);
  const updatePayment = useCallback((i, pmt) => setPayments(p => { const n = [...p]; n[i] = pmt; return n; }), []);

  // --- Banks ---
  const addNewBank = useCallback(async () => {
    const errs = validateBank(bankForm);
    if (Object.keys(errs).length) return;
    try {
      const b = await invoiceService.createBank(bankForm);
      setBanks(p => [...p, b]);
      setSelectedBank(b);
      setBankModal(false);
    } catch (e) { notificationManager.error('Bank', e.message); }
  }, [bankForm]);

  // --- Unsaved changes ---
  const isFormDirty = useMemo(() => {
    if (!initialized.current) return false;
    return items.length > 0 || !!selectedCustomer || notes.length > 0 || terms.length > 0;
  }, [items, selectedCustomer, notes, terms]);
  const { showConfirm, confirmNavigation, proceed: confirmProceed, cancel: confirmCancel } = useUnsavedChanges(isFormDirty);

  const safeNavigate = useCallback((path) => {
    confirmNavigation(() => navigate(path));
  }, [confirmNavigation, navigate]);

  // --- Save ---
  const buildPayload = useCallback((status) => {
    const autoPayments = markFullyPaid && (!payments || payments.length === 0)
      ? [{ amount: computed.grandTotal, date: invoiceDate, method: 'cash' }]
      : payments;
    return {
      id, prefix, invoiceNumber, invoiceDate, dueDate, reference,
      customerId: selectedCustomer?.id, customer: selectedCustomer,
      docType,
      items, extraDiscountType, extraDiscountValue, additionalCharges,
      notes, terms, reverseCharge, eWaybill, eInvoice,
      enableTds, enableTcs, roundOff,
      bankId: selectedBank?.id, payments: autoPayments,
      signatureId: selectedSignature?.id, status,
      customFieldValues: customHeaderValues,
      sameState: sameState === true,
      ...computed,
    };
  }, [id, prefix, invoiceNumber, invoiceDate, dueDate, reference, selectedCustomer, docType, items, extraDiscountType, extraDiscountValue, additionalCharges, notes, terms, reverseCharge, eWaybill, eInvoice, enableTds, enableTcs, roundOff, selectedBank, payments, selectedSignature, customHeaderValues, computed, sameState, markFullyPaid]);

  const validate = useCallback((strict) => {
    const payload = buildPayload(strict ? 'pending' : 'draft');
    const errs = validateInvoice(payload, { strict });
    const headerErrs = validateCustomHeaders(customHeaderDefs, customHeaderValues);
    Object.assign(errs, headerErrs);

    // Financial year validation
    if (invoiceDate) {
      const fy = validateFinancialYear(invoiceDate);
      if (fy) {
        const now = new Date();
        if (now < fy.start || now > fy.end) {
          errs.invoiceDate = `Date falls in FY ${fy.fy} which is not the current financial year.`;
        }
      }
    }

    if (selectedCustomer) {
      const creditErrs = validateCreditLimit(selectedCustomer, computed.grandTotal);
      Object.assign(errs, creditErrs);
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [buildPayload, customHeaderDefs, customHeaderValues, selectedCustomer, computed]);

  const performSave = useCallback(async (status, postAction) => {
    if (!validate(status !== 'draft')) {
      notificationManager.warning('Validation', 'Please fix errors before saving.');
      return;
    }

    if (prefix && invoiceNumber && id) {
      try {
        const dupCheck = await invoiceService.checkDuplicateNumber(prefix, invoiceNumber, id);
        if (!dupCheck.available) {
          notificationManager.warning('Duplicate', `Invoice number ${prefix}-${invoiceNumber} already exists.`);
          return;
        }
      } catch (e) {
        notificationManager.error('Duplicate Check', e.message || 'Failed to check duplicate.');
      }
    }

    setSaving(true);
    try {
      const result = await invoiceService.saveInvoice(buildPayload(status));
      notificationManager.success('Invoice', `Invoice ${status === 'draft' ? 'draft saved' : 'updated'}.`);

      if (postAction === 'print') {
        window.open(`/invoices/${id}/print`, '_blank');
      } else if (postAction === 'share') {
        notificationManager.info('Share', `Share invoice ${prefix}-${invoiceNumber} — email/WhatsApp service will be available soon.`);
      } else if (postAction === 'new') {
        navigate('/invoices/new');
        return;
      }
      safeNavigate('/sales/invoices');
    } catch (e) {
      notificationManager.error('Invoice', e.message || 'Failed.');
    } finally { setSaving(false); }
  }, [buildPayload, validate, safeNavigate, navigate, prefix, invoiceNumber, id]);

  const saveInvoice = useCallback(() => performSave('pending', null), [performSave]);
  const saveDraft = useCallback(() => performSave('draft', null), [performSave]);
  const saveAndPrint = useCallback(() => performSave('pending', 'print'), [performSave]);
  const saveAndShare = useCallback(() => performSave('pending', 'share'), [performSave]);
  const saveAndNew = useCallback(() => performSave('pending', 'new'), [performSave]);

  const canSave = items.length > 0 && !!selectedCustomer;

  // Map API prefixes to { value, label } format for InvoiceHeader
  const prefixOptions = useMemo(() => {
    return prefixes.map(p => ({
      value: p.prefix || p.value || p,
      label: p.prefix || p.label || p,
    }));
  }, [prefixes]);

  if (loadingInvoice) {
    return (
      <div className="inv-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div>Loading invoice...</div>
      </div>
    );
  }

  return (
    <div className="inv-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <InvoiceHeader
        prefix={prefix} invoiceNumber={invoiceNumber}
        onPrefixChange={setPrefix} onInvoiceNumberChange={setInvoiceNumber}
        onSave={saveInvoice} onDraft={saveDraft}
        onSaveAndPrint={saveAndPrint}
        onSaveAndShare={saveAndShare}
        onSaveAndNew={saveAndNew}
        saving={saving} canSave={canSave}
        title="Edit Invoice"
        prefixes={prefixOptions}
      />

      {/* Subbar */}
      <div className="inv-subbar" style={{ flexShrink: 0 }}>
        <div className="inv-subbar-left">
          <span className="inv-label">Type</span>
          <InvoiceTypeSelector value={docType} onChange={setDocType} />
        </div>
        <div className="inv-subbar-right">
          <button className="inv-link-action" onClick={() => setDocSettingsOpen(true)}>
            <Icon name="gear" size={14} /> Settings
          </button>
        </div>
      </div>

      <InvoiceDetails
        customers={customers} customerQuery={customerQuery}
        onCustomerQuery={setCustomerQuery} selectedCustomer={selectedCustomer}
        onSelectCustomer={handleSelectCustomer} onEditCustomer={editCustomer}
        invoiceDate={invoiceDate} dueDate={dueDate}
        onInvoiceDate={setInvoiceDate} onDueDate={setDueDate}
        reference={reference} onReference={setReference}
        dueDateOffset={dueDateOffset}
        onAutoDueDate={(invDate) => {
          if (!invDate) return;
          const d = new Date(invDate);
          if (selectedCustomer?.payment_terms?.days) {
            d.setDate(d.getDate() + Number(selectedCustomer.payment_terms.days));
          } else {
            d.setDate(d.getDate() + dueDateOffset);
          }
          setDueDate(d.toISOString().split('T')[0]);
        }}
        onOpenCreateCustomer={openCreateCustomer}
        errors={errors}
        customerOutstanding={customerOutstanding}
        creditLimitExceeded={creditLimitExceeded}
      />

      <DynamicCustomHeaders
        values={customHeaderValues}
        onChange={(key, value) => setCustomHeaderValues((prev) => ({ ...prev, [key]: value }))}
        docType={docType}
        chipMode
        onOpenSettings={() => setCustomHeaderSettingsOpen(true)}
        errors={errors}
        onHeadersLoaded={setCustomHeaderDefs}
        refreshKey={headerRefreshKey}
      />

      {/* Products & Services - Flex section that fills remaining space */}
      <section className="inv-card" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0 }}>
          <ProductsToolbar
            category={categoryFilter} onCategory={setCategoryFilter}
            categories={categories} productQuery={productQuery}
            onProductQuery={setProductQuery} products={products}
            qty={defaultQty} onQty={setDefaultQty}
            onAddProduct={addProduct}
            showDescription={showDescription}
            onToggleShowDescription={setShowDescription}
            onDraftWithAI={draftWithAI} aiBusy={aiBusy}
            disabledAdd={!productQuery.trim()}
            onAddNewProduct={openCreateProduct}
            columnManager={
              <ColumnVisibilityManager
                visibleKeys={visibleKeys}
                onToggle={toggleColumn}
                allColumns={allColumns}
              />
            }
          />
        </div>

        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          <InvoiceTable
            items={items} onChangeItem={onChangeItem}
            onRemoveItem={onRemoveItem} showDescription={showDescription}
            onAddNewProduct={addNewProductLine}
            visibleColumns={visibleColumns}
            units={units}
            warehouses={warehouses}
          />
        </div>

        <div style={{ flexShrink: 0 }}>
          <InvoiceDiscount
            items={items}
            extraDiscountType={extraDiscountType}
            extraDiscountValue={extraDiscountValue}
            onExtraDiscountType={setExtraDiscountType}
            onExtraDiscountValue={setExtraDiscountValue}
            additionalCharges={additionalCharges}
            onAddCharge={addCharge}
            onRemoveCharge={removeCharge}
            onUpdateCharge={updateCharge}
            subtotal={computed.subtotal}
            lineDiscountTotal={computed.lineDiscountTotal}
            invoiceDiscount={computed.invoiceDiscount}
          />
        </div>
      </section>

      {/* Bottom Grid */}
      <div className="inv-bottom-grid" style={{ flexShrink: 0 }}>
        <InvoiceNotes
          notes={notes} onAddNote={addNote} onRemoveNote={removeNote} onUpdateNote={updateNote}
          terms={terms} onAddTerm={addTerm} onRemoveTerm={removeTerm} onUpdateTerm={updateTerm}
          onAiSuggest={aiSuggestNote}
          reverseCharge={reverseCharge} onReverseCharge={setReverseCharge}
          eWaybill={eWaybill} onEWaybill={setEWaybill}
          eInvoice={eInvoice} onEInvoice={setEInvoice}
          attachments={attachments} onAddAttachment={(file) => setAttachments(prev => [...prev, file])} onRemoveAttachment={(i) => setAttachments(p => p.filter((_, j) => j !== i))}
        />

        <InvoiceSummary
          enableTds={enableTds} onTds={setEnableTds}
          enableTcs={enableTcs} onTcs={setEnableTcs}
          extraDiscountValue={extraDiscountValue} onExtraDiscountValue={setExtraDiscountValue}
          taxableAmount={computed.taxableAmount}
          taxTotal={computed.taxTotal}
          discountTotal={computed.discountTotal}
          roundOff={roundOff} onRoundOff={setRoundOff}
          beforeRound={computed.beforeRound} grandTotal={computed.grandTotal}
          selectedBank={selectedBank} banks={banks}
          onSelectBank={setSelectedBank}
          onAddNewBank={() => setBankModal(true)}
          payments={payments} onAddPayment={addPayment}
          onRemovePayment={removePayment} onUpdatePayment={updatePayment}
          markFullyPaid={markFullyPaid} onMarkFullyPaid={setMarkFullyPaid}
          balanceDue={computed.balanceDue}
          signatures={signatures} selectedSignature={selectedSignature}
          onSelectSignature={setSelectedSignature}
          onAddNewSignature={() => setSignatureModal(true)}
          sigName={sigName}
        />
      </div>

      <InvoiceFooter />

      {/* Modals */}
      <CustomerModal open={customerModal.open} mode={customerModal.mode}
        initial={customerModal.customer} onClose={closeCustomerModal}
        onSubmit={submitCustomer} />

      <ProductModal open={productModal.open} mode={productModal.mode}
        initial={productModal.product} categories={categories}
        onClose={closeProductModal} onSubmit={submitProduct} />

      <Modal open={bankModal} onClose={() => setBankModal(false)}
        title="Add New Bank" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBankModal(false)}>Cancel</Button>
            <Button icon="building" onClick={addNewBank}>Add Bank</Button>
          </>
        }>
        <form className="inv-modal-form" onSubmit={e => { e.preventDefault(); addNewBank(); }}>
          <Field label="Bank Name" required>
            <Input value={bankForm.bank_name} onChange={e => setBankForm(p => ({ ...p, bank_name: e.target.value }))} placeholder="Bank name" />
          </Field>
          <div className="inv-modal-row">
            <Field label="Account Number">
              <Input value={bankForm.account_number} onChange={e => setBankForm(p => ({ ...p, account_number: e.target.value }))} placeholder="Account number" />
            </Field>
            <Field label="IFSC">
              <Input value={bankForm.ifsc} onChange={e => setBankForm(p => ({ ...p, ifsc: e.target.value }))} placeholder="IFSC code" />
            </Field>
          </div>
          <div className="inv-modal-row">
            <Field label="Branch">
              <Input value={bankForm.branch} onChange={e => setBankForm(p => ({ ...p, branch: e.target.value }))} placeholder="Branch" />
            </Field>
            <Field label="UPI ID">
              <Input value={bankForm.upi_id} onChange={e => setBankForm(p => ({ ...p, upi_id: e.target.value }))} placeholder="UPI ID" />
            </Field>
          </div>
        </form>
      </Modal>

      <Modal open={signatureModal} onClose={() => setSignatureModal(false)}
        title="Add New Signature" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSignatureModal(false)}>Cancel</Button>
            <Button icon="pen-tool" onClick={async () => {
              try {
                const s = await invoiceService.createSignature({ name: sigName });
                setSignatures(p => [...p, s]);
                setSelectedSignature(s);
                setSignatureModal(false);
              } catch (e) { notificationManager.error('Signature', e.message); }
            }}>Add Signature</Button>
          </>
        }>
        <form className="inv-modal-form" onSubmit={e => e.preventDefault()}>
          <Field label="Signature Name" required>
            <Input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="e.g. Authorised Signatory" />
          </Field>
        </form>
      </Modal>

      <AddCustomerPanel open={addCustomerPanelOpen} onClose={closeAddCustomerPanel} onSubmit={submitCustomer} />

      <DocumentSettings open={docSettingsOpen} onClose={() => setDocSettingsOpen(false)} />

      <CustomHeaderPanel open={customHeaderSettingsOpen} onClose={() => { setCustomHeaderSettingsOpen(false); setHeaderRefreshKey(k => k + 1); }} />

      <ConfirmDialog
        open={showConfirm}
        onClose={confirmCancel}
        onConfirm={confirmProceed}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave this page?"
        confirmText="Leave"
        cancelText="Stay"
        variant="danger"
      />

    </div>
  );
}
