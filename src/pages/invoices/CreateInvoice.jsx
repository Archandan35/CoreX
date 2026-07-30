import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductModal from '../../components/invoice/ProductModal.jsx';
import CustomerModal from '../../components/invoice/CustomerModal.jsx';
import AddCustomerPanel from '../../components/invoice/AddCustomerPanel.jsx';
import AddProductPanel from '../../components/invoice/AddProductPanel.jsx';
import DocumentSettings from '../../components/invoice/DocumentSettings.jsx';
import CustomHeaderPanel from '../../components/invoice/CustomHeaderPanel.jsx';
import ChargesModal from '../../components/invoice/modals/ChargesModal.jsx';
import DynamicCustomHeaders from '../../components/invoice/DynamicCustomHeaders.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';

import Icon from '../../components/ui/Icon.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import useUnsavedChanges from '../../hooks/useUnsavedChanges.js';
import PermissionGate from '../../components/ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { invoiceService } from '../../services/invoice/index.js';
import { computeInvoice } from '../../business/invoice/calculations.js';
import {
  validateInvoice, validateCustomer, validateProduct, validateBank,
  validateCustomHeaders, validateCreditLimit, validateFinancialYear,
} from '../../business/invoice/validation.js';
import { DEFAULT_DUE_DATE_OFFSET_DAYS, TAX_RATE_OPTIONS, PAYMENT_MODE_OPTIONS, INVOICE_ATTACHMENT_MAX_FILES, DOC_TYPES } from '../../constants/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';
import { invalidateCache } from '../../services/ui-sync/index.js';
import { fileService } from '../../services/file/index.js';

function generateKey() {
  return Math.random().toString(36).substring(2, 10);
}

export default function CreateInvoice() {
  const navigate = useNavigate();

  // --- Master data ---
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [prefixes, setPrefixes] = useState([]);
  const [dueDateOffset, setDueDateOffset] = useState(DEFAULT_DUE_DATE_OFFSET_DAYS);
  const [companyState, setCompanyState] = useState('');

  // --- Header ---
  const [prefix, setPrefix] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Customer ---
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOutstanding, setCustomerOutstanding] = useState(null);
  const [creditLimitExceeded, setCreditLimitExceeded] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
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
  const [showChargesModal, setShowChargesModal] = useState(false);
  const fileInputRef = useRef(null);

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
  const [addProductPanelOpen, setAddProductPanelOpen] = useState(false);
  const [productModal, setProductModal] = useState({ open: false, mode: 'create', product: null });
  const [bankModal, setBankModal] = useState(false);
  const [signatureModal, setSignatureModal] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', ifsc: '', branch: '', upi_id: '' });
  const [sigName, setSigName] = useState('');

  // --- Validation ---
  const [errors, setErrors] = useState({});
  const initialized = useRef(false);
  const justSavedRef = useRef(false);

  // --- sameState: supplier state vs customer state for IGST/CGST+SGST ---
  const sameState = useMemo(() => {
    if (!companyState || !selectedCustomer?.state) return null;
    return companyState.toLowerCase() === selectedCustomer.state.toLowerCase();
  }, [companyState, selectedCustomer]);

  // --- Load master data ---
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    Promise.all([
      invoiceService.listCustomers().then(d => setCustomers(Array.isArray(d) ? d : [])).catch(e => console.warn('Failed to load customers', e)),
      invoiceService.listProducts().then(d => {
        const pd = d || {};
        setProducts(Array.isArray(pd.products) ? pd.products : []);
        setCategories(Array.isArray(pd.categories) ? pd.categories : []);
      }).catch(e => console.warn('Failed to load products', e)),
      invoiceService.listBanks().then(d => setBanks(Array.isArray(d) ? d : [])).catch(e => console.warn('Failed to load banks', e)),
      invoiceService.listSignatures().then(d => setSignatures(Array.isArray(d) ? d : [])).catch(e => console.warn('Failed to load signatures', e)),
      invoiceService.listPrefixes({ docType: 'invoice' }).then(d => {
        const items = d?.items || [];
        setPrefixes(items.filter(p => p.isActive !== false));
      }).catch(e => console.warn('Failed to load prefixes', e)),
      invoiceService.getDocumentSettings().then(d => {
        if (d?.default_due_days) setDueDateOffset(Number(d.default_due_days));
        if (d?.default_prefix) setPrefix(d.default_prefix || '');
      }).catch(e => console.warn('Failed to load document settings', e)),
      invoiceService.getCurrentCompany().then(company => {
        if (company?.state) setCompanyState(company.state);
        if (company?.name) {
          document.documentElement.style.setProperty('--inv-business-name', `"${company.name}"`);
        }
      }).catch(e => console.warn('Failed to load current company', e)),
    ]);
  }, []);

  // Set initial prefix from loaded prefixes
  useEffect(() => {
    if (prefixes.length > 0 && !prefix) {
      const def = prefixes.find(p => p.isDefault) || prefixes[0];
      setPrefix(def.prefix || def.value || def.label || def);
    }
  }, [prefixes, prefix]);

  // --- Fetch next invoice number ---
  useEffect(() => {
    invoiceService.nextInvoiceNumber(prefix).then(n => { if (n) setInvoiceNumber(n); }).catch(e => console.warn('Failed to fetch next invoice number', e));
  }, [prefix]);

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

  // --- Auto due date ---
  useEffect(() => {
    if (invoiceDate && !dueDate) {
      const d = new Date(invoiceDate);
      d.setDate(d.getDate() + dueDateOffset);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [invoiceDate, dueDate, dueDateOffset]);

  // --- Customer selection: auto-fill address, GSTIN, state, terms, outstanding ---
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
    } catch (e) {
      console.warn('Failed to get customer outstanding', e);
      setCustomerOutstanding(null);
    }

    if (customer.is_active === false) {
      setErrors(prev => ({ ...prev, customer: 'Cannot invoice an inactive customer.' }));
    }
  }, [invoiceDate]);

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
  const submitCustomer = async (form) => {
    const errs = validateCustomer(form);
    if (Object.keys(errs).length) return;
    try {
      if (customerModal.mode === 'create') {
        const c = await invoiceService.createCustomer(form);
        setCustomers(p => [...p, c]);
        handleSelectCustomer(c);
        notificationManager.success('Customer', 'Customer created.');
      } else if (selectedCustomer) {
        const c = await invoiceService.updateCustomer(selectedCustomer.id, form);
        setCustomers(p => p.map(x => x.id === c.id ? c : x));
        handleSelectCustomer(c);
        notificationManager.success('Customer', 'Customer updated.');
      }
      closeCustomerModal();
      closeAddCustomerPanel();
    } catch (e) { notificationManager.error('Customer', e.message); }
  };

  // --- Product ---
  const closeAddProductPanel = () => setAddProductPanelOpen(false);
  const closeProductModal = () => setProductModal(p => ({ ...p, open: false }));
  const handleAddProduct = useCallback((product) => {
    if (!product) return;
    setProducts(prev => [...prev, product]);
    setAddProductPanelOpen(false);
    const item = {
      _key: generateKey(), name: product.name || '',
      description: product.description || '',
      quantity: Number(defaultQty) || 1, unitPrice: Number(product.unit_price) || 0,
      taxRate: Number(product.tax_rate) || 0, discountType: 'percent', discountValue: 0,
      product_id: product.id || null,
      stock_quantity: Number(product.stock_quantity) || 0,
      unit: product.unit || '',
      hsnSac: product.hsn_code || product.hsnSac || '',
    };
    setItems(prev => [...prev, item]);
    setProductQuery('');
    notificationManager.success('Product', `"${product.name}" added to invoice.`);
  }, [defaultQty, setProductQuery]);
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
      const ctx = `Create an invoice with ${items.length} items. ${selectedCustomer ? `Customer: ${selectedCustomer.name}` : ''}`;
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
      notificationManager.success('AI Draft', 'Invoice draft generated.');
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
      notificationManager.success('Bank', 'Bank added.');
    } catch (e) { notificationManager.error('Bank', e.message); }
  }, [bankForm]);

  // --- Unsaved changes ---
  const isFormDirty = useMemo(() => {
    if (!initialized.current) return false;
    if (justSavedRef.current) return false;
    return items.length > 0 || !!selectedCustomer || notes.length > 0 || terms.length > 0
      || payments.length > 0 || additionalCharges.length > 0 || extraDiscountValue > 0
      || Object.keys(customHeaderValues).length > 0 || attachments.length > 0
      || reverseCharge || eWaybill || eInvoice || enableTds || enableTcs || roundOff
      || !!selectedBank || !!selectedSignature || !!reference;
  }, [items, selectedCustomer, notes, terms, payments, additionalCharges, extraDiscountValue, customHeaderValues, attachments, reverseCharge, eWaybill, eInvoice, enableTds, enableTcs, roundOff, selectedBank, selectedSignature, reference]);
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
      prefix, invoiceNumber, invoiceDate, dueDate, reference,
      customerId: selectedCustomer?.id, customer: selectedCustomer,
      docType,
      items, extraDiscountType, extraDiscountValue, additionalCharges,
      notes, terms, reverseCharge, eWaybill, eInvoice,
      enableTds, enableTcs, roundOff,
      bankId: selectedBank?.id, payments: autoPayments,
      signatureId: selectedSignature?.id, status,
      customFieldValues: customHeaderValues,
      sameState: sameState === true,
      attachmentCount: attachments.length,
      ...computed,
    };
  }, [prefix, invoiceNumber, invoiceDate, dueDate, reference, selectedCustomer, docType, items, extraDiscountType, extraDiscountValue, additionalCharges, notes, terms, reverseCharge, eWaybill, eInvoice, enableTds, enableTcs, roundOff, selectedBank, payments, selectedSignature, customHeaderValues, computed, sameState, markFullyPaid, attachments]);

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

    // Credit limit validation
    if (selectedCustomer) {
      const creditErrs = validateCreditLimit(selectedCustomer, computed.grandTotal);
      Object.assign(errs, creditErrs);
    }

    // Duplicate invoice number validation (async — checked separately)
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [buildPayload, customHeaderDefs, customHeaderValues, selectedCustomer, computed]);

  const performSave = useCallback(async (status, postAction) => {
    if (!validate(status !== 'draft')) {
      notificationManager.warning('Validation', 'Please fix errors before saving.');
      return;
    }

    // Duplicate invoice number check
    if (prefix && invoiceNumber) {
      try {
        const dupCheck = await invoiceService.checkDuplicateNumber(prefix, invoiceNumber);
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

      // Upload attachments after save
      if (attachments.length > 0) {
        try {
          for (const file of attachments) {
            const validation = validateAttachment(file);
            if (validation) {
              notificationManager.warning('Attachments', `"${file.name}" - ${validation}. Skipping.`);
              continue;
            }
            await fileService.upload(file, `/invoices/${result.id}`);
          }
        } catch (uploadErr) {
          notificationManager.warning('Attachments', 'Invoice saved but file upload failed. You can re-attach later.');
        }
      }

      await invalidateCache('invoices');
      justSavedRef.current = true;
      notificationManager.success('Invoice', `Invoice ${status === 'draft' ? 'draft saved' : 'saved'}.`);

      if (postAction === 'print') {
        window.open(`/invoices/${result.id}/print`, '_blank');
      } else if (postAction === 'share') {
        notificationManager.info('Share', `Share invoice ${prefix}-${invoiceNumber} — email/WhatsApp service will be available soon.`);
      } else if (postAction === 'new') {
        navigate('/invoices/new');
        return;
      }
      safeNavigate('/');
    } catch (e) {
      notificationManager.error('Invoice', e.message || 'Failed.');
    } finally { setSaving(false); }
  }, [buildPayload, validate, safeNavigate, navigate, prefix, invoiceNumber, attachments]);

  const saveInvoice = useCallback(() => performSave('pending', null), [performSave]);
  const saveDraft = useCallback(() => performSave('draft', null), [performSave]);
  const saveAndPrint = useCallback(() => performSave('pending', 'print'), [performSave]);
  const saveAndShare = useCallback(() => performSave('pending', 'share'), [performSave]);
  const saveAndNew = useCallback(() => performSave('pending', 'new'), [performSave]);

  const canSave = items.length > 0 && !!selectedCustomer;

  const handleClear = useCallback(() => {
    if (!isFormDirty) {
      setSelectedCustomer(null);
      setItems([]);
      setNotes([]);
      setTerms([]);
      setPayments([]);
      setAdditionalCharges([]);
      setExtraDiscountType('percent');
      setExtraDiscountValue(0);
      setCustomHeaderValues({});
      setReverseCharge(false);
      setEWaybill(false);
      setEInvoice(false);
      setEnableTds(false);
      setEnableTcs(false);
      setRoundOff(false);
      setSelectedBank(null);
      setSelectedSignature(null);
      setAttachments([]);
      setReference('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      return;
    }
    confirmNavigation(() => {
      setSelectedCustomer(null);
      setItems([]);
      setNotes([]);
      setTerms([]);
      setPayments([]);
      setAdditionalCharges([]);
      setExtraDiscountType('percent');
      setExtraDiscountValue(0);
      setCustomHeaderValues({});
      setReverseCharge(false);
      setEWaybill(false);
      setEInvoice(false);
      setEnableTds(false);
      setEnableTcs(false);
      setRoundOff(false);
      setSelectedBank(null);
      setSelectedSignature(null);
      setAttachments([]);
      setReference('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
    });
  }, [isFormDirty, confirmNavigation]);

  // Map API prefixes to { value, label } format for InvoiceHeader
  const prefixOptions = useMemo(() => {
    return prefixes.map(p => ({
      value: p.prefix || p.value || p,
      label: p.prefix || p.label || p,
    }));
  }, [prefixes]);

  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [prefixOpen, setPrefixOpen] = useState(false);
  const [docTypeOpen, setDocTypeOpen] = useState(false);
  const [catFilterOpen, setCatFilterOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);

  return (
    <PermissionGate permission={PERMISSIONS.INVOICE_CREATE}>
      <div className="page">

      {(() => {
        const inlineKeys = new Set(['customer','invoiceDate','dueDate','invoiceNumber','items','payments','creditLimit','lines']);
        const otherErrors = Object.entries(errors).filter(([k]) => !inlineKeys.has(k) && !k.startsWith('payment_'));
        if (otherErrors.length > 0) {
          return (
            <div style={{ marginBottom:'12px', padding:'10px 14px', background:'#fdeef2', border:'1px solid #f5c6cb', borderRadius:'8px', color:'#e5484d', fontSize:'13px' }}>
              <strong>Please fix the following errors:</strong>
              <ul style={{ margin:'6px 0 0', paddingLeft:'18px' }}>
                {otherErrors.map(([key, msg]) => (
                  <li key={key}>{typeof msg === 'string' ? msg : JSON.stringify(msg)}</li>
                ))}
              </ul>
            </div>
          );
        }
        return null;
      })()}

      {/* ===== Header card ===== */}
      <div className="ni-header-card">
        <div className="ni-topbar">
          <div className="ni-topbar-left">
            <span className="ni-back-arrow" onClick={() => safeNavigate('/sales/invoices')}><Icon name="arrow-left" /></span>
            <div className="ni-title-block">
              <h1>Create Invoice</h1>
              <div className="ni-sub">{companyState || 'Loading...'}</div>
            </div>
            <div className="ni-topbar-mid">
              <div className="ni-select-box" onClick={() => setPrefixOpen(!prefixOpen)} style={{position:'relative'}}>
                {prefix || 'Select Prefix'} <Icon name="chevronDown" />
                {prefixOpen && (
                  <div style={{position:'absolute',top:'100%',left:0,background:'#fff',border:'1px solid var(--ni-border)',borderRadius:'8px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)',zIndex:100,minWidth:'120px',marginTop:'4px'}}>
                    {prefixOptions.map(p => (
                      <div key={p.value} style={{padding:'8px 14px',fontSize:'13px',cursor:'pointer',fontWeight:p.value===prefix?'700':'400'}}
                        onClick={() => { setPrefix(p.value); setPrefixOpen(false); }}>{p.label}</div>
                    ))}
                  </div>
                )}
              </div>
              <input className="ni-input-box" style={{border:'1px solid var(--ni-border)',fontSize:'13px',fontWeight:600,fontFamily:'inherit'}}
                value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              {errors.invoiceNumber && <div style={{color:'#e5484d',fontSize:'11px',marginTop:'2px'}}>{errors.invoiceNumber}</div>}
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <button className="ni-btn-primary" onClick={saveInvoice} disabled={!canSave || saving}
              style={{borderRadius:'8px'}}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="ni-btn-secondary" onClick={saveDraft} disabled={!canSave || saving}
              style={{borderRadius:'8px'}}>
              Save Draft
            </button>
            <div style={{position:'relative'}}>
              <button className="ni-btn-primary" onClick={() => setSaveMenuOpen(!saveMenuOpen)} disabled={!canSave || saving}
                style={{borderRadius:'8px',padding:'11px 10px'}}>
                <Icon name="chevronDown" />
              </button>
              {saveMenuOpen && (
                <div style={{position:'absolute',top:'100%',right:0,background:'#fff',border:'1px solid var(--ni-border)',borderRadius:'8px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)',zIndex:100,minWidth:'170px',marginTop:'4px'}}>
                  <div style={{padding:'8px 14px',fontSize:'13px',cursor:'pointer',fontWeight:500}}
                    onClick={() => { setSaveMenuOpen(false); saveAndPrint(); }}><Icon name="print" /> Save & Print</div>
                  <div style={{padding:'8px 14px',fontSize:'13px',cursor:'pointer',fontWeight:500}}
                    onClick={() => { setSaveMenuOpen(false); saveAndShare(); }}><Icon name="send" /> Save & Share</div>
                  <div style={{padding:'8px 14px',fontSize:'13px',cursor:'pointer',fontWeight:500}}
                    onClick={() => { setSaveMenuOpen(false); saveAndNew(); }}><Icon name="plus" /> Save & New</div>
                  <div style={{borderTop:'1px solid var(--ni-border)'}}></div>
                  <div style={{padding:'8px 14px',fontSize:'13px',cursor:'pointer',fontWeight:500,color:'var(--ni-text-gray)'}}
                    onClick={() => { setSaveMenuOpen(false); handleClear(); }}><Icon name="trash" /> Clear</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="ni-header-divider"></div>

        <div className="ni-type-row">
          <div className="ni-type-left">
            Type
            <div className="ni-select-box" onClick={() => setDocTypeOpen(!docTypeOpen)} style={{position:'relative'}}>
              {docType || 'Regular'} <Icon name="chevronDown" />
              {docTypeOpen && (
                <div style={{position:'absolute',top:'100%',left:0,background:'#fff',border:'1px solid var(--ni-border)',borderRadius:'8px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)',zIndex:100,minWidth:'160px',marginTop:'4px',maxHeight:'250px',overflow:'auto'}}>
                  {DOC_TYPES.map(dt => (
                    <div key={dt} style={{padding:'8px 14px',fontSize:'13px',cursor:'pointer',fontWeight:dt===docType?'700':'400'}}
                      onClick={() => { setDocType(dt === 'Regular' ? '' : dt); setDocTypeOpen(false); }}>{dt}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="ni-type-right">
            <div className="ni-link-icon" onClick={() => setCustomHeaderSettingsOpen(true)}>
              <Icon name="info" /> Custom Headers
            </div>
            <div className="ni-link-icon" onClick={() => setDocSettingsOpen(true)}>
              <Icon name="gear" /> Settings
            </div>
          </div>
        </div>
      </div>

      {/* ===== Select Customer card ===== */}
      <div className="ni-card">
        <div className="ni-customer-top">
          <div className="ni-card-heading"><Icon name="user" /> Select Customer</div>
          <button className="ni-btn-outline" onClick={openCreateCustomer}><Icon name="plus" /> Create Customer</button>
        </div>

        {errors.customer && (
          <div style={{color:'#e5484d',fontSize:'12px',fontWeight:600,marginBottom:'12px',padding:'8px 12px',background:'#fdeef2',borderRadius:'8px'}}>
            <Icon name="alert-circle" size={14} /> {errors.customer}
          </div>
        )}
        <div className="ni-customer-grid">
          <div style={{position:'relative'}}>
            <div className="ni-field-label" style={{visibility:'hidden'}}>Customer</div>
            <div className="ni-field-input">
              <Icon name="search" />
              <input type="text" placeholder="Search customers by name, company, GSTIN, tags..."
                value={customerQuery} onChange={e => { setCustomerQuery(e.target.value); if (e.target.value !== selectedCustomer?.name) setSelectedCustomer(null); }} />
            </div>
            {customerQuery && !selectedCustomer && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid var(--ni-border)',borderRadius:'8px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)',zIndex:100,marginTop:'2px',maxHeight:'220px',overflow:'auto'}}>
                {customers.filter(c => (c.name||'').toLowerCase().includes(customerQuery.toLowerCase()) || (c.mobile||'').includes(customerQuery) || (c.gstin||'').toLowerCase().includes(customerQuery.toLowerCase())).slice(0,8).map(c => (
                  <div key={c.id} style={{padding:'8px 14px',fontSize:'13px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}
                    onClick={() => handleSelectCustomer(c)}>
                    <span style={{fontWeight:600}}>{c.name}</span>
                    <span style={{color:'var(--ni-text-light-gray)',fontSize:'11px'}}>{c.gstin || c.mobile || ''}</span>
                  </div>
                ))}
                {customers.filter(c => (c.name||'').toLowerCase().includes(customerQuery.toLowerCase())).length === 0 && (
                  <div style={{padding:'10px 14px',fontSize:'12px',color:'var(--ni-text-gray)'}}>No customers found. <span style={{color:'var(--ni-purple)',cursor:'pointer',fontWeight:600}} onClick={openCreateCustomer}>Create new</span></div>
                )}
              </div>
            )}
            {selectedCustomer && (
              <div style={{fontSize:'11px',color:'var(--ni-text-gray)',marginTop:'4px'}}>
                {selectedCustomer.gstin && <span>GST: {selectedCustomer.gstin} | </span>}
                {selectedCustomer.state && <span>State: {selectedCustomer.state} | </span>}
                {customerOutstanding !== null && <span style={{color:customerOutstanding?.totalOutstanding > 0 ? '#e5484d' : 'inherit'}}>Due: ₹{Number(customerOutstanding?.totalOutstanding || 0).toFixed(2)}</span>}
                {creditLimitExceeded && <span style={{color:'#e5484d',fontWeight:700,marginLeft:'8px'}}>Credit limit exceeded!</span>}
              </div>
            )}
          </div>
          <div>
            <div className="ni-field-label">Invoice Date</div>
            <div className="ni-field-input ni-between">
              <input type="text" value={invoiceDate || new Date().toISOString().split('T')[0]}
                onChange={e => { setInvoiceDate(e.target.value); }} />
              <Icon name="calendar" />
            </div>
            {errors.invoiceDate && <div style={{color:'#e5484d',fontSize:'11px',marginTop:'4px'}}>{errors.invoiceDate}</div>}
          </div>
          <div>
            <div className="ni-field-label">Due Date</div>
            <div className="ni-field-input ni-between">
              <input type="text" value={dueDate || ''}
                onChange={e => setDueDate(e.target.value)} />
              <Icon name="calendar" />
            </div>
            {errors.dueDate && <div style={{color:'#e5484d',fontSize:'11px',marginTop:'4px'}}>{errors.dueDate}</div>}
          </div>
          <div>
            <div className="ni-field-label">Reference <span className="ni-optional">(Optional)</span></div>
            <div className="ni-field-input">
              <input type="text" placeholder="Reference, e.g. PO Number, Sales Person names, Shipment Number etc..."
                value={reference} onChange={e => setReference(e.target.value)} />
            </div>
          </div>
        </div>

        <DynamicCustomHeaders
          values={customHeaderValues}
          onChange={(key, val) => setCustomHeaderValues(p => ({ ...p, [key]: val }))}
          docType={docType}
          chipMode
          onOpenSettings={() => setCustomHeaderSettingsOpen(true)}
          errors={errors}
          onHeadersLoaded={(defs) => setCustomHeaderDefs(defs)}
          refreshKey={headerRefreshKey}
        />
      </div>

      {/* ===== Products & Services card ===== */}
      <div className="ni-card">
        <div className="ni-products-top">
          <div className="ni-card-heading"><Icon name="package" /> Products &amp; Services <Icon name="help-circle" /></div>
          <div className="ni-products-top-right">
            <label className="ni-checkbox-label">
              <input type="checkbox" checked={showDescription} onChange={e => setShowDescription(e.target.checked)} /> Show description
            </label>
          </div>
        </div>

        <div className="ni-toolbar-row">
          <div className="ni-field-input ni-between" onClick={() => setCatFilterOpen(!catFilterOpen)} style={{position:'relative',cursor:'pointer'}}>
            <span>{categoryFilter || 'Filter Category'}</span>
            <Icon name="chevronDown" />
            {catFilterOpen && (
              <div style={{position:'absolute',top:'100%',left:0,background:'#fff',border:'1px solid var(--ni-border)',borderRadius:'8px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)',zIndex:100,minWidth:'180px',marginTop:'2px',maxHeight:'200px',overflow:'auto'}}>
                <div style={{padding:'8px 14px',fontSize:'13px',cursor:'pointer',fontWeight:!categoryFilter?'700':'400'}}
                  onClick={() => { setCategoryFilter(''); setCatFilterOpen(false); }}>All Categories</div>
                {categories.map(cat => (
                  <div key={cat.id || cat.name} style={{padding:'8px 14px',fontSize:'13px',cursor:'pointer',fontWeight:categoryFilter===cat.name?'700':'400'}}
                    onClick={() => { setCategoryFilter(cat.name); setCatFilterOpen(false); }}>{cat.name}</div>
                ))}
              </div>
            )}
          </div>
          <div className="ni-field-input">
            <Icon name="search" />
            <input type="text" placeholder="Search or scan barcode for existing products"
              value={productQuery} onChange={e => setProductQuery(e.target.value)} />
          </div>
          <div className="ni-field-input">
            <input type="text" placeholder="Qty" value={defaultQty} onChange={e => setDefaultQty(Number(e.target.value) || 1)} />
          </div>
          <button className="ni-btn-add-bill" onClick={() => {
            const q = productQuery.trim().toLowerCase();
            const found = products.find(p =>
              p.name?.toLowerCase() === q ||
              p.sku?.toLowerCase() === q ||
              p.barcode?.toLowerCase() === q ||
              p.item_code?.toLowerCase() === q
            );
            if (found) addProduct(found);
            else {
              const matches = products.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.sku?.toLowerCase().includes(q)
              );
              if (matches.length === 1) addProduct(matches[0]);
              else if (matches.length > 1) {
                setProductQuery(q);
                notificationManager.info('Product', `${matches.length} products match. Type exact name, SKU, or barcode.`);
              } else {
                notificationManager.info('Product', 'No matching product found. Add a new product or refine search.');
              }
            }
          }} disabled={!productQuery.trim()}><Icon name="plus" /> Add to Bill</button>
          <button className="ni-btn-ai" onClick={draftWithAI} disabled={aiBusy}>
            <Icon name="sparkles" /> Create Invoices with AI <span className="ni-beta-badge">BETA</span>
          </button>
        </div>

        {errors.items && <div style={{color:'#e5484d',fontSize:'12px',fontWeight:600,marginBottom:'8px',padding:'8px 12px',background:'#fdeef2',borderRadius:'8px'}}>{errors.items}</div>}

        <div className="ni-products-table">
          <div className="ni-products-table-header">
            <div>#</div>
            <div>Product Name{showDescription ? ' + Desc' : ''}</div>
            <div>Qty</div>
            <div>Unit Price</div>
            <div>Tax</div>
            <div>Disc</div>
            <div>Amount</div>
            <div className="ni-col-total">Total<span className="ni-sub">(Net + Tax)</span></div>
          </div>

          {items.length === 0 ? (
            <div className="ni-empty-state">
              <svg className="ni-empty-icon" viewBox="0 0 64 56" fill="none">
                <rect x="4" y="14" width="56" height="38" rx="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M4 16L30 36L60 16" stroke="currentColor" strokeWidth="2"/>
                <circle cx="50" cy="10" r="9" fill="#fff" stroke="currentColor" strokeWidth="2"/>
                <path d="M46 10h8M50 6v8" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
              <p>Search existing products to add to this list or add new product to get started!</p>
              <button className="ni-btn-add-product" onClick={() => setAddProductPanelOpen(true)}>
                <Icon name="plus" /> Add New Product
              </button>
            </div>
          ) : (
            <div>
              {items.map((item, idx) => {
                const lineAmount = item.quantity * item.unitPrice;
                const lineDisc = item.discountType === 'percent' ? lineAmount * (item.discountValue || 0) / 100 : (item.discountValue || 0);
                const lineNet = lineAmount - lineDisc;
                const lineTax = lineNet * (item.taxRate || 0) / 100;
                const lineTotal = lineNet + lineTax;
                return (
                <div key={item._key} className="ni-products-table-header" style={{ background:'#fff', borderBottom:'1px solid var(--ni-border)', gridTemplateColumns:'34px 1.6fr 70px 90px 70px 70px 80px 80px 34px', padding:'8px 16px', fontSize:'13px', fontWeight:400, alignItems:'center' }}>
                  <div style={{color:'var(--ni-text-light-gray)',fontSize:'11px'}}>{idx + 1}</div>
                  <div style={{minWidth:0}}>
                    <input style={{ border:'none', outline:'none', width:'100%', fontSize:'13px', fontFamily:'inherit',color:'var(--ni-text-dark)' }}
                      value={item.name} onChange={e => onChangeItem(idx, { ...item, name: e.target.value })} placeholder="Product / HSN" />
                    {item.hsnSac && <div style={{fontSize:'10px',color:'var(--ni-text-light-gray)'}}>HSN: {item.hsnSac}</div>}
                    {showDescription && (
                      <input style={{ border:'none', outline:'none', width:'100%', fontSize:'11px', color:'var(--ni-text-gray)', marginTop:'2px', fontFamily:'inherit' }}
                        value={item.description || ''} onChange={e => onChangeItem(idx, { ...item, description: e.target.value })} placeholder="Description" />
                    )}
                    {errors.lines?.[idx]?.name && <div style={{color:'#e5484d',fontSize:'10px',marginTop:'1px'}}>{errors.lines[idx].name}</div>}
                  </div>
                  <div>
                    <input style={{ border:'1px solid var(--ni-border)', borderRadius:'6px', padding:'6px 8px', width:'100%', fontSize:'13px', fontFamily:'inherit' }}
                      type="number" min="0" step="any" value={item.quantity} onChange={e => onChangeItem(idx, { ...item, quantity: Number(e.target.value) || 0 })} />
                    {errors.lines?.[idx]?.quantity && <div style={{color:'#e5484d',fontSize:'10px',marginTop:'1px'}}>{errors.lines[idx].quantity}</div>}
                  </div>
                  <div>
                    <input style={{ border:'1px solid var(--ni-border)', borderRadius:'6px', padding:'6px 8px', width:'100%', fontSize:'13px', fontFamily:'inherit' }}
                      type="number" min="0" step="any" value={item.unitPrice} onChange={e => onChangeItem(idx, { ...item, unitPrice: Number(e.target.value) || 0 })} />
                    {errors.lines?.[idx]?.unitPrice && <div style={{color:'#e5484d',fontSize:'10px',marginTop:'1px'}}>{errors.lines[idx].unitPrice}</div>}
                  </div>
                  <div style={{position:'relative'}}>
                    <select style={{border:'1px solid var(--ni-border)',borderRadius:'6px',padding:'6px 4px',fontSize:'12px',width:'100%',fontFamily:'inherit',background:'#fff'}}
                      value={item.taxRate} onChange={e => onChangeItem(idx, { ...item, taxRate: Number(e.target.value) })}>
                      {TAX_RATE_OPTIONS.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                    {errors.lines?.[idx]?.taxRate && <div style={{color:'#e5484d',fontSize:'10px',marginTop:'1px'}}>{errors.lines[idx].taxRate}</div>}
                  </div>
                  <div style={{display:'flex',gap:'2px',alignItems:'center'}}>
                    <select style={{border:'1px solid var(--ni-border)',borderRadius:'6px',padding:'6px 2px',fontSize:'11px',width:'40px',fontFamily:'inherit',background:'#fff'}}
                      value={item.discountType} onChange={e => onChangeItem(idx, { ...item, discountType: e.target.value })}>
                      <option value="percent">%</option>
                      <option value="fixed">₹</option>
                    </select>
                    <input style={{border:'1px solid var(--ni-border)',borderRadius:'6px',padding:'6px 4px',width:'36px',fontSize:'11px',fontFamily:'inherit'}}
                      type="number" min="0" value={item.discountValue || 0} onChange={e => onChangeItem(idx, { ...item, discountValue: Number(e.target.value) || 0 })} />
                  </div>
                  <div style={{textAlign:'right',fontSize:'12px'}}>₹ {lineNet.toFixed(2)}</div>
                  <div className="ni-col-total" style={{textAlign:'right'}}>
                    ₹ {lineTotal.toFixed(2)}
                    <span className="ni-sub" style={{display:'block',fontSize:'10px',color:'var(--ni-text-light-gray)'}}>
                      ₹ {lineNet.toFixed(2)} + ₹ {lineTax.toFixed(2)}
                    </span>
                  </div>
                  <div style={{cursor:'pointer',color:'var(--ni-text-light-gray)'}} onClick={() => onRemoveItem(idx)} title="Remove item">
                    <Icon name="x" size={14} />
                  </div>
                </div>
                );
              })}
              <div style={{padding:'8px 16px',display:'flex',gap:'8px',borderTop:'1px solid var(--ni-border)'}}>
                <button className="ni-btn-outline" onClick={addNewProductLine} style={{fontSize:'12px',padding:'6px 12px'}}>
                  <Icon name="plus" size={13} /> Add Line
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="ni-discount-row">
          <div className="ni-discount-left">
            <div className="ni-label"><Icon name="info" /> Apply discount(%) to all items</div>
            <div className="ni-discount-input">
              <input type="text" value={extraDiscountValue}
                onChange={e => setExtraDiscountValue(Number(e.target.value) || 0)} />
              <span className="ni-suffix">%</span>
            </div>
          </div>
          <div className="ni-discount-right">
            <div className="ni-items-summary">Items: {items.length}, Qty: {items.reduce((s, i) => s + Number(i.quantity), 0).toFixed(3)}</div>
            <button className="ni-btn-outline" onClick={() => setShowChargesModal(true)}><Icon name="plus" /> Additional Charges</button>
          </div>
        </div>
      </div>

      {/* ===== Bottom grid ===== */}
      <div className="ni-bottom-grid">

        {/* --- Notes, terms & more --- */}
        <div className="ni-card">
          <div className="ni-card-heading">Notes, terms &amp; more</div>

          <div className="ni-field-block">
            <div className="ni-field-block-header">
              <div className="ni-field-block-title"><Icon name="edit" /> Notes <Icon name="info" className="ni-info" /></div>
              <button className="ni-btn-outline" onClick={addNote}><Icon name="plus" /> New Note</button>
            </div>
            <div className="ni-notes-list">
              {notes.length === 0 && (
                <div style={{ color:'var(--ni-text-light-gray)', fontSize:'13px', marginBottom:'8px', padding:'8px 0' }}>
                  No notes added yet. Click "New Note" to add one.
                </div>
              )}
              {notes.map((n, i) => (
                <div key={n.id} className="ni-textarea-wrap" style={{ marginBottom:'8px' }}>
                  <textarea placeholder="Enter your notes, say thanks, or anything else..."
                    value={n.text}
                    onChange={e => updateNote(i, { ...n, text: e.target.value })} />
                  <div style={{ display:'flex', gap:'6px', marginTop:'4px' }}>
                    {i === 0 && <button className="ni-btn-ai-assist" onClick={aiSuggestNote}><Icon name="sparkles" /> AI Assist</button>}
                    <span style={{ cursor:'pointer', color:'var(--ni-text-light-gray)', fontSize:'12px', padding:'4px' }} onClick={() => removeNote(i)}><Icon name="x" /> Remove</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ni-field-block">
            <div className="ni-field-block-header">
              <div className="ni-field-block-title"><Icon name="file-text" /> Terms &amp; Conditions <Icon name="info" className="ni-info" /></div>
              <button className="ni-btn-outline" onClick={addTerm}><Icon name="plus" /> New Terms</button>
            </div>
            <div className="ni-terms-box">
              {terms.map((t, i) => (
                <div key={t.id} style={{ display:'flex', gap:'8px', marginBottom:'6px' }}>
                  <input style={{ border:'1px solid var(--ni-border)', borderRadius:'6px', padding:'8px', fontSize:'13px', width:'100%', fontFamily:'inherit' }}
                    value={t.text} onChange={e => updateTerm(i, { ...t, text: e.target.value })} placeholder="Enter terms and conditions..." />
                  <span style={{ cursor:'pointer', color:'var(--ni-text-light-gray)' }} onClick={() => removeTerm(i)}><Icon name="x" /></span>
                </div>
              ))}
            </div>
          </div>

          <div className="ni-toggle-row">
            <div className="ni-toggle-label"><Icon name="info" /> Reverse Charge Mechanism applicable?</div>
            <div className={`ni-toggle-switch ${reverseCharge ? 'ni-on' : ''}`} onClick={() => setReverseCharge(!reverseCharge)}></div>
          </div>
          <div className="ni-toggle-row">
            <div className="ni-toggle-label">Create E-Waybill</div>
            <div className={`ni-toggle-switch ${eWaybill ? 'ni-on' : ''}`} onClick={() => setEWaybill(!eWaybill)}></div>
          </div>
          <div className="ni-toggle-row">
            <div className="ni-toggle-label">Create E-Invoice</div>
            <div className={`ni-toggle-switch ${eInvoice ? 'ni-on' : ''}`} onClick={() => setEInvoice(!eInvoice)}></div>
          </div>

          <div className="ni-attach-block">
            <div className="ni-field-block-title"><Icon name="paperclip" /> Attach files <Icon name="info" className="ni-info" /></div>
            <input type="file" ref={fileInputRef} multiple style={{ display:'none' }}
              onChange={e => {
                const files = Array.from(e.target.files || []);
                setAttachments(p => [...p, ...files].slice(0, INVOICE_ATTACHMENT_MAX_FILES));
                e.target.value = '';
              }} />
            <button className="ni-btn-attach" onClick={() => fileInputRef.current?.click()}><Icon name="upload" /> Attach Files (Max: {INVOICE_ATTACHMENT_MAX_FILES - attachments.length})</button>
          </div>
        </div>

        {/* --- Totals / payment card --- */}
        <div className="ni-totals-card">
          <div className="ni-totals-green">
            <div className="ni-tds-tcs-row">
              <div className="ni-tds-tcs-item">
                <div className={`ni-toggle-switch ni-small ${enableTds ? 'ni-on' : ''}`} onClick={() => setEnableTds(!enableTds)}></div>
                TDS
              </div>
              <div className="ni-tds-tcs-item">
                <div className={`ni-toggle-switch ni-small ${enableTcs ? 'ni-on' : ''}`} onClick={() => setEnableTcs(!enableTcs)}></div>
                TCS
              </div>
            </div>

            <div className="ni-discount-selectors">
              <div className="ni-dd-box">
                <span className="ni-strike">Extra Discount</span> <Icon name="chevronDown" />
              </div>
              <div className="ni-dd-box">
                {extraDiscountValue || 0} <Icon name="chevronDown" />
              </div>
            </div>

            <div className="ni-totals-rows">
              <div className="ni-totals-line"><span>Taxable Amount</span><span>₹ {Number(computed.taxableAmount || 0).toFixed(2)}</span></div>
              <div className="ni-totals-line"><span>Total Tax</span><span>₹ {Number(computed.taxTotal || 0).toFixed(2)}</span></div>
              <div className="ni-totals-line ni-roundoff">
                <div className="ni-label-group">
                  Round Off
                  <div className={`ni-toggle-switch ni-small ${roundOff ? 'ni-on' : ''}`} onClick={() => setRoundOff(!roundOff)}></div>
                </div>
                <span>₹ {Number(computed.roundOffValue || 0).toFixed(2)}</span>
              </div>
              <div className="ni-totals-divider"></div>
              <div className="ni-total-amount-row">
                <span className="ni-label">Total Amount</span>
                <span className="ni-value">₹ {Number(computed.grandTotal || 0).toFixed(2)}</span>
              </div>
              <div className="ni-total-discount-row">Total Discount: ₹ {Number(computed.discountTotal || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="ni-totals-body">
            <div className="ni-section-row">
              <div className="ni-field-block-title"><Icon name="landmark" /> Select Bank <Icon name="info" className="ni-info" /></div>
              <div className="ni-link-purple" onClick={() => setBankModal(true)}><Icon name="plus" /> Add New Bank</div>
            </div>
            <div className="ni-bank-select" onClick={() => setBankOpen(!bankOpen)}>
              <div className="ni-bank-select-left">
                <div className="ni-bank-icon"><Icon name="landmark" /></div>
                {selectedBank ? `${selectedBank.bank_name} (${selectedBank.account_number?.slice(-4) || '...'})` : 'Select a bank'}
              </div>
              <Icon name="chevron-down" className="ni-chev" />
            </div>
            {bankOpen && (
              <div className="ni-dropdown" style={{ marginTop: 0, width: '100%' }}>
                {banks.length === 0 && <div className="ni-dropdown-item" style={{ cursor:'default', color:'var(--ni-text-light-gray)' }}>No banks found</div>}
                {banks.map(b => (
                  <div key={b.id} className="ni-dropdown-item" onClick={() => { setSelectedBank(b); setBankOpen(false); }}>
                    {b.bank_name} ({b.account_number?.slice(-4) || '...'})
                  </div>
                ))}
              </div>
            )}

            <div className="ni-payment-header-row">
              <div className="ni-label-title">Add payment (Payment Notes, Amount and Mode)</div>
              <label className="ni-checkbox-label">
                <input type="checkbox" checked={markFullyPaid} onChange={e => setMarkFullyPaid(e.target.checked)} /> Mark as fully paid
              </label>
            </div>

            {payments.length === 0 ? (
              <div style={{ color:'var(--ni-text-light-gray)', fontSize:'13px', marginBottom:'12px' }}>No payments added yet.</div>
            ) : (<>
              {errors.payments && <div style={{color:'#e5484d',fontSize:'12px',fontWeight:600,marginBottom:'8px',padding:'6px 10px',background:'#fdeef2',borderRadius:'6px'}}>{errors.payments}</div>}
              {payments.map((pmt, i) => (
              <div key={pmt.id} className="ni-payment-table" style={{ marginBottom:'12px' }}>
                <div>
                  <div className="ni-col-label">Notes</div>
                  <div className="ni-pt-input">
                    <input type="text" placeholder="Advance received, UTR number" value={pmt.notes}
                      onChange={e => updatePayment(i, { ...pmt, notes: e.target.value })} />
                  </div>
                </div>
                <div>
                  <div className="ni-col-label">Amount</div>
                  <div className="ni-pt-input"><input type="text" value={pmt.amount}
                    onChange={e => updatePayment(i, { ...pmt, amount: Number(e.target.value) || 0 })} /></div>
                </div>
                <div>
                  <div className="ni-col-label">Payment Date</div>
                  <div className="ni-pt-input">
                    <input type="text" value={pmt.paymentDate}
                      onChange={e => updatePayment(i, { ...pmt, paymentDate: e.target.value })} />
                    <Icon name="calendar" />
                  </div>
                </div>
                <div>
                  <div className="ni-col-label">Payment Mode</div>
                  <div className="ni-pt-input">
                    <select style={{ border:'none', outline:'none', fontSize:'13px', fontFamily:'inherit', background:'transparent', width:'100%', cursor:'pointer', color: pmt.mode ? 'inherit' : 'var(--ni-text-light-gray)' }}
                      value={pmt.mode || ''} onChange={e => updatePayment(i, { ...pmt, mode: e.target.value })}>
                      <option value="" disabled>Select mode</option>
                      {PAYMENT_MODE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="ni-pt-sub">
                    {selectedBank ? `${selectedBank.bank_name?.slice(0, 20)}...` : 'No bank selected'}
                    <Icon name="chevron-down" style={{ width:'11px',height:'11px',verticalAlign:'middle' }} />
                  </div>
                </div>
                {errors[`payment_${i}`] && <div style={{color:'#e5484d',fontSize:'11px',gridColumn:'1/-1',padding:'2px 0 0'}}>{errors[`payment_${i}`]}</div>}
              </div>
            ))}
            </>)}

            <div className="ni-split-payment-link" onClick={addPayment}><Icon name="plus" /> Split Payment</div>

            <div className="ni-signature-row">
              <div className="ni-field-block-title">Select Signature<span className="ni-required-dot"></span></div>
              <div className="ni-link-purple" onClick={() => setSignatureModal(true)}><Icon name="plus" /> Add New Signature</div>
            </div>
            <div className="ni-signature-grid">
              <div className="ni-signature-select" onClick={() => setSigOpen(!sigOpen)}>
                {selectedSignature?.name || 'No Signature'}
                <Icon name="chevronDown" />
              </div>
              {sigOpen && (
                <div className="ni-dropdown" style={{ width: '100%' }}>
                  {signatures.length === 0 && <div className="ni-dropdown-item" style={{ cursor:'default', color:'var(--ni-text-light-gray)' }}>No signatures found</div>}
                  {signatures.map(s => (
                    <div key={s.id} className="ni-dropdown-item" onClick={() => { setSelectedSignature(s); setSigOpen(false); }}>
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
              <div className="ni-signature-preview">
                <div className="ni-label">Signature on the document</div>
                <div className="ni-sig">{selectedSignature?.name || '—'}</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ===== Footer ===== */}
      <div className="ni-footer">
        <div className="ni-footer-logo"><Icon name="bolt" /> swipe</div>
        <div className="ni-footer-copy">&copy; 2026 NextSpeed Technologies Private Limited. All rights reserved.</div>
        <div className="ni-footer-secure"><Icon name="shield-check" /> Data is secured via bank-grade security</div>
      </div>

      {/* ===== Modals ===== */}
      <CustomerModal open={customerModal.open} mode={customerModal.mode}
        initial={customerModal.customer} onClose={closeCustomerModal}
        onSubmit={submitCustomer} />

      <ProductModal open={productModal.open} mode={productModal.mode}
        initial={productModal.product} categories={categories}
        onClose={closeProductModal} onSubmit={submitProduct} />

      <ChargesModal open={showChargesModal} onClose={() => setShowChargesModal(false)}
        charges={additionalCharges}
        onAdd={c => { setAdditionalCharges(p => [...p, c]); }}
        onRemove={i => { setAdditionalCharges(p => p.filter((_, idx) => idx !== i)); }}
        onUpdate={(i, c) => { setAdditionalCharges(p => p.map((x, idx) => idx === i ? c : x)); }} />

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
                notificationManager.success('Signature', 'Signature added.');
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

      <AddProductPanel open={addProductPanelOpen} onClose={closeAddProductPanel} onSubmit={handleAddProduct} />

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
    </PermissionGate>
  );
}
