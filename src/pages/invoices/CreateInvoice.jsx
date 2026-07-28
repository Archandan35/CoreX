import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import AddProductPanel from '../../components/invoice/AddProductPanel.jsx';
import DocumentSettings from '../../components/invoice/DocumentSettings.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';

import Icon from '../../components/ui/Icon.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import useUnsavedChanges from '../../hooks/useUnsavedChanges.js';
import { invoiceService } from '../../services/invoice/index.js';
import { computeInvoice } from '../../business/invoice/calculations.js';
import {
  validateInvoice, isValid, validateCustomer, validateProduct, validateBank,
} from '../../business/invoice/validation.js';
import {
  DEFAULT_DUE_DATE_OFFSET_DAYS, PAYMENT_MODE_OPTIONS,
} from '../../constants/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';

function generateKey() {
  return Math.random().toString(36).substring(2, 10);
}

export default function CreateInvoice() {
  const navigate = useNavigate();

  // --- Data ---
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [signatures, setSignatures] = useState([]);

  // --- Header ---
  const [prefix, setPrefix] = useState('INV');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Customer ---
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');

  // --- Headers ---
  const [customHeaderValues, setCustomHeaderValues] = useState({});
  const [docSettingsOpen, setDocSettingsOpen] = useState(false);

  // --- Products ---
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [defaultQty, setDefaultQty] = useState(1);
  const [items, setItems] = useState([]);
  const [showDescription, setShowDescription] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);

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
  const [addProductPanelOpen, setAddProductPanelOpen] = useState(false);
  const [productModal, setProductModal] = useState({ open: false, mode: 'create', product: null });
  const [bankModal, setBankModal] = useState(false);
  const [signatureModal, setSignatureModal] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', ifsc: '', branch: '', upi_id: '' });
  const [sigName, setSigName] = useState('');

  // --- Validation ---
  const [errors, setErrors] = useState({});
  const initialized = useRef(false);

  // --- Load data ---
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    Promise.all([
      invoiceService.listCustomers().then(d => setCustomers(Array.isArray(d) ? d : [])).catch(() => {}),
      invoiceService.listProducts().then(d => {
        const pd = d || {};
        setProducts(Array.isArray(pd.products) ? pd.products : []);
        setCategories(Array.isArray(pd.categories) ? pd.categories : []);
      }).catch(() => {}),
      invoiceService.listBanks().then(d => setBanks(Array.isArray(d) ? d : [])).catch(() => {}),
      invoiceService.listSignatures().then(d => setSignatures(Array.isArray(d) ? d : [])).catch(() => {}),
    ]);
  }, []);

  // --- Fetch next invoice number ---
  useEffect(() => {
    invoiceService.nextInvoiceNumber(prefix).then(n => { if (n) setInvoiceNumber(n); }).catch(() => {});
  }, [prefix]);

  // --- Auto due date ---
  useEffect(() => {
    if (invoiceDate && !dueDate) {
      const d = new Date(invoiceDate);
      d.setDate(d.getDate() + DEFAULT_DUE_DATE_OFFSET_DAYS);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [invoiceDate, dueDate]);

  const autoDueDate = useCallback((invDate) => {
    if (!invDate) return;
    const d = new Date(invDate);
    d.setDate(d.getDate() + DEFAULT_DUE_DATE_OFFSET_DAYS);
    setDueDate(d.toISOString().split('T')[0]);
  }, []);

  // --- Computed totals ---
  const computed = useMemo(() => {
    return computeInvoice({
      items, extraDiscountType, extraDiscountValue, additionalCharges,
      roundOff, payments, sameState: false,
    });
  }, [items, extraDiscountType, extraDiscountValue, additionalCharges, roundOff, payments]);

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
      } else if (selectedCustomer) {
        const c = await invoiceService.updateCustomer(selectedCustomer.id, form);
        setCustomers(p => p.map(x => x.id === c.id ? c : x));
        setSelectedCustomer(c);
      }
      closeCustomerModal();
    } catch (e) { notificationManager.error('Customer', e.message); }
  };

  // --- Product ---
  const openCreateProduct = () => setAddProductPanelOpen(true);
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
    } catch (e) { notificationManager.error('Product', e.message); }
  };

  const addProduct = useCallback((product) => {
    setItems(prev => [...prev, {
      _key: generateKey(), name: product.name || product, description: product.description || '',
      quantity: Number(defaultQty) || 1, unitPrice: Number(product.unit_price) || 0,
      taxRate: Number(product.tax_rate) || 0, discountType: 'percent', discountValue: 0,
      product_id: product.id || null,
      stock_quantity: Number(product.stock_quantity) || 0,
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
    } catch {}
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
  const buildPayload = useCallback((status) => ({
    prefix, invoiceNumber, invoiceDate, dueDate, reference,
    customerId: selectedCustomer?.id, customer: selectedCustomer,
    items, extraDiscountType, extraDiscountValue, additionalCharges,
    notes, terms, reverseCharge, eWaybill, eInvoice,
    enableTds, enableTcs, roundOff,
    bankId: selectedBank?.id, payments,
    signatureId: selectedSignature?.id, status,
    ...computed,
  }), [prefix, invoiceNumber, invoiceDate, dueDate, reference, selectedCustomer, items, extraDiscountType, extraDiscountValue, additionalCharges, notes, terms, reverseCharge, eWaybill, eInvoice, enableTds, enableTcs, roundOff, selectedBank, payments, selectedSignature, computed]);

  const validate = useCallback((strict) => {
    const errs = validateInvoice(buildPayload(strict ? 'pending' : 'draft'), { strict });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [buildPayload]);

  const save = useCallback(async (status) => {
    if (!validate(status !== 'draft')) {
      notificationManager.warning('Validation', 'Please fix errors before saving.');
      return;
    }
    setSaving(true);
    try {
      await invoiceService.saveInvoice(buildPayload(status));
      notificationManager.success('Invoice', `Invoice ${status === 'draft' ? 'draft saved' : 'saved'}.`);
      safeNavigate('/');
    } catch (e) {
      notificationManager.error('Invoice', e.message || 'Failed.');
    } finally { setSaving(false); }
  }, [buildPayload, validate, navigate]);

  const saveInvoice = useCallback(() => save('pending'), [save]);
  const saveDraft = useCallback(() => save('draft'), [save]);
  const canSave = items.length > 0 && !!selectedCustomer;

  return (
    <div className="inv-page">
      <InvoiceHeader
        prefix={prefix} invoiceNumber={invoiceNumber}
        onPrefixChange={setPrefix} onInvoiceNumberChange={setInvoiceNumber}
        onSave={saveInvoice} onDraft={saveDraft}
        saving={saving} canSave={canSave}
      />

      {/* Subbar */}
      <div className="inv-subbar">
        <div className="inv-subbar-left">
          <span className="inv-label">Type</span>
          <div className="inv-type-select">
            Regular <Icon name="chevron-down" size={14} />
          </div>
        </div>
        <div className="inv-subbar-right">
          <button className="inv-link-action" onClick={() => setHeaderSettingsOpen(true)}>
            <Icon name="info" size={14} /> Custom Headers
          </button>
          <button className="inv-link-action" onClick={() => setDocSettingsOpen(true)}>
            <Icon name="gear" size={14} /> Settings
          </button>
        </div>
      </div>

      <InvoiceDetails
        customers={customers} customerQuery={customerQuery}
        onCustomerQuery={setCustomerQuery} selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer} onEditCustomer={editCustomer}
        invoiceDate={invoiceDate} dueDate={dueDate}
        onInvoiceDate={setInvoiceDate} onDueDate={setDueDate}
        reference={reference} onReference={setReference}
        dueDateOffset={DEFAULT_DUE_DATE_OFFSET_DAYS} onAutoDueDate={autoDueDate}
        onOpenCreateCustomer={openCreateCustomer}
        errors={errors}
      />

      <DynamicCustomHeaders
        values={customHeaderValues}
        onChange={(key, value) => setCustomHeaderValues((prev) => ({ ...prev, [key]: value }))}
        docType="invoices"
      />

      {/* Products & Services */}
      <section className="inv-card">
        <ProductsToolbar
          category={categoryFilter} onCategory={setCategoryFilter}
          categories={categories} productQuery={productQuery}
          onProductQuery={setProductQuery} products={products}
          qty={defaultQty} onQty={setDefaultQty}
          onAddProduct={addProduct} onCreateProduct={openCreateProduct}
          showDescription={showDescription}
          onToggleShowDescription={setShowDescription}
          onDraftWithAI={draftWithAI} aiBusy={aiBusy}
          disabledAdd={!productQuery.trim()}
          onAddNewProduct={() => setAddProductPanelOpen(true)}
        />

        <InvoiceTable
          items={items} onChangeItem={onChangeItem}
          onRemoveItem={onRemoveItem} showDescription={showDescription}
          onAddNewProduct={addNewProductLine}
        />

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
      </section>

      {/* Bottom Grid */}
      <div className="inv-bottom-grid">
        <InvoiceNotes
          notes={notes} onAddNote={addNote} onRemoveNote={removeNote} onUpdateNote={updateNote}
          terms={terms} onAddTerm={addTerm} onRemoveTerm={removeTerm} onUpdateTerm={updateTerm}
          onAiSuggest={aiSuggestNote}
          reverseCharge={reverseCharge} onReverseCharge={setReverseCharge}
          eWaybill={eWaybill} onEWaybill={setEWaybill}
          eInvoice={eInvoice} onEInvoice={setEInvoice}
          attachments={attachments} onAddAttachment={setAttachments} onRemoveAttachment={(i) => setAttachments(p => p.filter((_, j) => j !== i))}
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

      <AddProductPanel open={addProductPanelOpen} onClose={closeAddProductPanel} onSubmit={handleAddProduct} />

      <DocumentSettings open={docSettingsOpen} onClose={() => setDocSettingsOpen(false)} />

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