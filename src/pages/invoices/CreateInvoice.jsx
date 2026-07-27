import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import InvoiceHeader from '../../components/invoice/InvoiceHeader.jsx';
import InvoiceDetails from '../../components/invoice/InvoiceDetails.jsx';
import CustomHeaders from '../../components/invoice/CustomHeaders.jsx';
import ProductsToolbar from '../../components/invoice/ProductsToolbar.jsx';
import CustomerModal from '../../components/invoice/CustomerModal.jsx';
import ProductModal from '../../components/invoice/ProductModal.jsx';
import InvoiceTable from '../../components/invoice/InvoiceTable.jsx';
import InvoiceDiscount from '../../components/invoice/InvoiceDiscount.jsx';
import InvoiceNotes from '../../components/invoice/InvoiceNotes.jsx';
import InvoiceOptions from '../../components/invoice/InvoiceOptions.jsx';
import InvoiceSummary from '../../components/invoice/InvoiceSummary.jsx';
import InvoiceBank from '../../components/invoice/InvoiceBank.jsx';
import InvoiceSignature from '../../components/invoice/InvoiceSignature.jsx';
import InvoiceFooter from '../../components/invoice/InvoiceFooter.jsx';
import NotificationToast from '../../components/ui/Toast.jsx';
import { invoiceService } from '../../services/invoice/index.js';
import { computeInvoice } from '../../business/invoice/calculations.js';
import {
  validateInvoice, isValid, validateCustomer, validateProduct,
  validateAttachment, withinAttachmentLimit,
} from '../../business/invoice/validation.js';
import { DEFAULT_CUSTOM_HEADERS, DEFAULT_DUE_DATE_OFFSET_DAYS, INVOICE_NUMBER_PAD } from '../../constants/index.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { notificationManager } from '../../managers/NotificationManager.js';

function padNumber(num, width) {
  return String(num).padStart(width, '0');
}

function generateKey() {
  return Math.random().toString(36).substring(2, 10);
}

export default function CreateInvoice() {
  const navigate = useNavigate();

  // --- Entity data ---
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [companyName, setCompanyName] = useState('');

  // --- Header state ---
  const [prefix, setPrefix] = useState('INV');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [numberUnique, setNumberUnique] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Invoice details ---
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');

  // --- Custom headers ---
  const [headerDefs, setHeaderDefs] = useState(DEFAULT_CUSTOM_HEADERS);
  const [headerValues, setHeaderValues] = useState({});
  const [headerSettingsOpen, setHeaderSettingsOpen] = useState(false);

  // --- Products ---
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [defaultQty, setDefaultQty] = useState(1);
  const [items, setItems] = useState([]);
  const [showDescription, setShowDescription] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  // --- Discount ---
  const [extraDiscountType, setExtraDiscountType] = useState('percent');
  const [extraDiscountValue, setExtraDiscountValue] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState([]);

  // --- Notes & Terms ---
  const [notes, setNotes] = useState([]);
  const [terms, setTerms] = useState([]);

  // --- Options ---
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
  const [productModal, setProductModal] = useState({ open: false, mode: 'create', product: null });

  // --- Validation ---
  const [errors, setErrors] = useState({});
  const initialized = useRef(false);

  // Debonce for form validation
  const debouncedItems = useDebounce(items, 300);

  // --- Load initial data ---
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadData();
  }, []);

  async function loadData() {
    try {
      const [custData, prodData, bankData, sigData] = await Promise.all([
        invoiceService.listCustomers(),
        invoiceService.listProducts(),
        invoiceService.listBanks(),
        invoiceService.listSignatures(),
      ]);
      setCustomers(Array.isArray(custData) ? custData : []);
      const pd = prodData || {};
      setProducts(Array.isArray(pd.products) ? pd.products : []);
      setCategories(Array.isArray(pd.categories) ? pd.categories : []);
      setBanks(Array.isArray(bankData) ? bankData : []);
      setSignatures(Array.isArray(sigData) ? sigData : []);
    } catch {
      setCustomers([]);
      setProducts([]);
      setCategories([]);
      setBanks([]);
      setSignatures([]);
    }

    try {
      const num = await invoiceService.nextInvoiceNumber('INV');
      if (num) setInvoiceNumber(num);
    } catch {}
  }

  // --- Invoice number generation ---
  const checkNumberUnique = useCallback(async () => {
    try {
      const num = await invoiceService.nextInvoiceNumber(prefix);
      setNumberUnique(!num || num === invoiceNumber);
    } catch {
      setNumberUnique(true);
    }
  }, [prefix, invoiceNumber]);

  const handlePrefixChange = useCallback(async (newPrefix) => {
    setPrefix(newPrefix);
    try {
      const num = await invoiceService.nextInvoiceNumber(newPrefix);
      if (num) setInvoiceNumber(num);
    } catch {}
  }, []);

  // --- Auto due date ---
  const autoDueDate = useCallback((invDate) => {
    if (!invDate) return;
    const d = new Date(invDate);
    d.setDate(d.getDate() + DEFAULT_DUE_DATE_OFFSET_DAYS);
    setDueDate(d.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (invoiceDate && !dueDate) autoDueDate(invoiceDate);
  }, [invoiceDate, dueDate, autoDueDate]);

  // --- Computed totals ---
  const computed = useMemo(() => {
    const invoice = {
      items,
      extraDiscountType,
      extraDiscountValue,
      additionalCharges,
      roundOff,
      payments,
      sameState: selectedCustomer?.state === 'state',
    };
    return computeInvoice(invoice);
  }, [items, extraDiscountType, extraDiscountValue, additionalCharges, roundOff, payments, selectedCustomer]);

  // --- Customer operations ---
  const openCreateCustomer = () => setCustomerModal({ open: true, mode: 'create', customer: null });
  const closeCustomerModal = () => setCustomerModal((p) => ({ ...p, open: false }));

  const editCustomer = () => {
    if (selectedCustomer) setCustomerModal({ open: true, mode: 'edit', customer: selectedCustomer });
  };

  const submitCustomer = async (form) => {
    const errs = validateCustomer(form);
    if (Object.keys(errs).length) return;
    try {
      if (customerModal.mode === 'create') {
        const newCust = await invoiceService.createCustomer(form);
        setCustomers((prev) => [...prev, newCust]);
        setSelectedCustomer(newCust);
      } else if (customerModal.mode === 'edit' && selectedCustomer) {
        const updated = await invoiceService.updateCustomer(selectedCustomer.id, form);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setSelectedCustomer(updated);
      }
      closeCustomerModal();
    } catch (e) {
      notificationManager.error('Customer', e.message);
    }
  };

  // --- Product operations ---
  const openCreateProduct = () => setProductModal({ open: true, mode: 'create', product: null });
  const closeProductModal = () => setProductModal((p) => ({ ...p, open: false }));

  const submitProduct = async (form) => {
    const errs = validateProduct(form);
    if (Object.keys(errs).length) return;
    try {
      const newProd = await invoiceService.createProduct(form);
      setProducts((prev) => [...prev, newProd]);
      closeProductModal();
    } catch (e) {
      notificationManager.error('Product', e.message);
    }
  };

  // --- Add product to items ---
  const addProduct = useCallback((product) => {
    setItems((prev) => [
      ...prev,
      {
        _key: generateKey(),
        name: product.name,
        description: product.description || '',
        quantity: Number(defaultQty) || 1,
        unitPrice: Number(product.unit_price) || 0,
        taxRate: Number(product.tax_rate) || 0,
        discountType: 'percent',
        discountValue: 0,
      },
    ]);
    setProductQuery('');
  }, [defaultQty]);

  const addNewProductLine = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        _key: generateKey(),
        name: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        discountType: 'percent',
        discountValue: 0,
      },
    ]);
  }, []);

  // --- Line item editing ---
  const onChangeItem = useCallback((index, updated) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  const onRemoveItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --- Discount ---
  const addCharge = useCallback((charge) => {
    setAdditionalCharges((prev) => [...prev, charge]);
  }, []);

  const removeCharge = useCallback((index) => {
    setAdditionalCharges((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCharge = useCallback((index, updated) => {
    setAdditionalCharges((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  // --- Notes & Terms ---
  const addNote = useCallback(() => {
    setNotes((prev) => [...prev, { id: generateKey(), text: '' }]);
  }, []);

  const removeNote = useCallback((index) => {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateNote = useCallback((index, updated) => {
    setNotes((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  const addTerm = useCallback(() => {
    setTerms((prev) => [...prev, { id: generateKey(), text: '' }]);
  }, []);

  const removeTerm = useCallback((index) => {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTerm = useCallback((index, updated) => {
    setTerms((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  // --- AI ---
  const draftWithAI = useCallback(async () => {
    setAiBusy(true);
    try {
      const context = `Create an invoice with ${items.length} items. ${selectedCustomer ? `Customer: ${selectedCustomer.name}` : ''}`;
      const result = await invoiceService.draftInvoiceWithAI(context);
      if (result?.items) {
        const mapped = result.items.map((it) => ({
          _key: generateKey(),
          name: it.name || '',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          taxRate: Number(it.taxRate) || 0,
          discountType: 'percent',
          discountValue: 0,
        }));
        setItems(mapped);
      }
      if (result?.notes) setNotes((prev) => [...prev, { id: generateKey(), text: result.notes }]);
      if (result?.terms) setTerms((prev) => [...prev, { id: generateKey(), text: result.terms }]);
      notificationManager.success('AI Draft', 'Invoice draft generated successfully.');
    } catch (e) {
      notificationManager.error('AI Draft', e.message || 'Failed to generate draft.');
    } finally {
      setAiBusy(false);
    }
  }, [items, selectedCustomer]);

  const aiSuggestNote = useCallback(async () => {
    try {
      const intent = 'General invoice note';
      const existing = notes.map((n) => n.text).join(' ');
      const suggestion = await invoiceService.suggestNote(existing, intent);
      if (suggestion) setNotes((prev) => [...prev, { id: generateKey(), text: suggestion }]);
    } catch {}
  }, [notes]);

  // --- Attachments ---
  const addAttachment = useCallback((file) => {
    setAttachments((prev) => [...prev, file]);
  }, []);

  const removeAttachment = useCallback((index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --- Payments ---
  const addPayment = useCallback(() => {
    setPayments((prev) => [
      ...prev,
      { id: generateKey(), notes: '', amount: 0, paymentDate: new Date().toISOString().split('T')[0], mode: '' },
    ]);
  }, []);

  const removePayment = useCallback((index) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updatePayment = useCallback((index, updated) => {
    setPayments((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  // --- Banks ---
  const addBank = useCallback(async (form) => {
    const newBank = await invoiceService.createBank(form);
    setBanks((prev) => [...prev, newBank]);
    setSelectedBank(newBank);
  }, []);

  const editBank = useCallback(async (id, form) => {
    const updated = await invoiceService.updateBank(id, form);
    setBanks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    if (selectedBank?.id === updated.id) setSelectedBank(updated);
  }, [selectedBank]);

  const deleteBank = useCallback(async (id) => {
    await invoiceService.deleteBank(id);
    setBanks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBank?.id === id) setSelectedBank(null);
  }, [selectedBank]);

  // --- Signatures ---
  const addSignature = useCallback(async (form) => {
    const newSig = await invoiceService.createSignature(form);
    setSignatures((prev) => [...prev, newSig]);
    setSelectedSignature(newSig);
  }, []);

  const deleteSignature = useCallback(async (id) => {
    await invoiceService.deleteSignature(id);
    setSignatures((prev) => prev.filter((s) => s.id !== id));
    if (selectedSignature?.id === id) setSelectedSignature(null);
  }, [selectedSignature]);

  // --- Custom headers ---
  const addHeader = useCallback((label) => {
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    setHeaderDefs((prev) => [...prev, { key, label }]);
  }, []);

  const removeHeader = useCallback((key) => {
    setHeaderDefs((prev) => prev.filter((h) => h.key !== key));
    setHeaderValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // --- Save / Draft ---
  const buildPayload = useCallback((status) => ({
    prefix,
    invoiceNumber,
    invoiceDate,
    dueDate,
    reference,
    customerId: selectedCustomer?.id,
    customer: selectedCustomer,
    customHeaders: headerValues,
    items,
    extraDiscountType,
    extraDiscountValue,
    additionalCharges,
    notes,
    terms,
    reverseCharge,
    eWaybill,
    eInvoice,
    enableTds,
    enableTcs,
    roundOff,
    bankId: selectedBank?.id,
    payments,
    signatureId: selectedSignature?.id,
    status,
    ...computed,
  }), [
    prefix, invoiceNumber, invoiceDate, dueDate, reference,
    selectedCustomer, headerValues, items,
    extraDiscountType, extraDiscountValue, additionalCharges,
    notes, terms, reverseCharge, eWaybill, eInvoice,
    enableTds, enableTcs, roundOff,
    selectedBank, payments, selectedSignature, computed,
  ]);

  const validate = useCallback((strict) => {
    const payload = buildPayload(strict ? 'pending' : 'draft');
    const errs = validateInvoice(payload, { strict });
    setErrors(errs);
    return isValid(errs);
  }, [buildPayload]);

  const save = useCallback(async (status) => {
    const strict = status !== 'draft';
    if (!validate(strict)) {
      notificationManager.warning('Validation', 'Please fix the errors before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(status);
      await invoiceService.saveInvoice(payload);
      notificationManager.success('Invoice', `Invoice ${status === 'draft' ? 'draft saved' : 'saved successfully'}.`);
      navigate('/');
    } catch (e) {
      notificationManager.error('Invoice', e.message || 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  }, [buildPayload, validate, navigate]);

  const saveInvoice = useCallback(() => save('pending'), [save]);
  const saveDraft = useCallback(() => save('draft'), [save]);

  // --- Validation messages ---
  const canSave = items.length > 0 && !!selectedCustomer;

  // --- Filtered product matches for toolbar ---
  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return products;
    return products.filter((p) => String(p.category_id) === String(categoryFilter));
  }, [products, categoryFilter]);

  return (
    <div className="inv-page">
      <InvoiceHeader
        companyName={companyName}
        prefix={prefix}
        invoiceNumber={invoiceNumber}
        onPrefixChange={handlePrefixChange}
        onInvoiceNumberChange={setInvoiceNumber}
        onCheckNumberUnique={checkNumberUnique}
        numberUnique={numberUnique}
        onSave={saveInvoice}
        onDraft={saveDraft}
        onOpenHeaders={() => setHeaderSettingsOpen(true)}
        onOpenSettings={() => {}}
        saving={saving}
        canSave={canSave}
      />

      <div className="inv-layout">
        <div className="inv-layout__main">
          <InvoiceDetails
            customers={customers}
            customerQuery={customerQuery}
            onCustomerQuery={setCustomerQuery}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onEditCustomer={editCustomer}
            invoiceDate={invoiceDate}
            dueDate={dueDate}
            onInvoiceDate={setInvoiceDate}
            onDueDate={setDueDate}
            reference={reference}
            onReference={setReference}
            dueDateOffset={DEFAULT_DUE_DATE_OFFSET_DAYS}
            onAutoDueDate={autoDueDate}
            customerModal={customerModal}
            onOpenCreateCustomer={openCreateCustomer}
            onCloseCustomerModal={closeCustomerModal}
            onSubmitCustomer={submitCustomer}
            errors={errors}
          />

          <CustomHeaders
            headers={headerDefs}
            values={headerValues}
            onChangeValue={(key, val) => setHeaderValues((prev) => ({ ...prev, [key]: val }))}
            onAddHeader={addHeader}
            onRemoveHeader={removeHeader}
            settingsOpen={headerSettingsOpen}
            onOpenSettings={() => setHeaderSettingsOpen(true)}
            onCloseSettings={() => setHeaderSettingsOpen(false)}
          />

          <div className="inv-products-section">
            <ProductsToolbar
              categories={categories}
              category={categoryFilter}
              onCategory={setCategoryFilter}
              productQuery={productQuery}
              onProductQuery={setProductQuery}
              products={filteredProducts}
              qty={defaultQty}
              onQty={setDefaultQty}
              onAddProduct={addProduct}
              onCreateProduct={openCreateProduct}
              onOpenProductSettings={() => {}}
              showDescription={showDescription}
              onToggleShowDescription={setShowDescription}
              onDraftWithAI={draftWithAI}
              aiBusy={aiBusy}
              disabledAdd={!productQuery.trim()}
            />

            <InvoiceTable
              items={items}
              onChangeItem={onChangeItem}
              onRemoveItem={onRemoveItem}
              showDescription={showDescription}
              onAddNewProduct={addNewProductLine}
              errors={errors}
            />
          </div>

          <InvoiceDiscount
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
            discountTotal={computed.discountTotal}
          />

          <InvoiceNotes
            notes={notes}
            terms={terms}
            onAddNote={addNote}
            onRemoveNote={removeNote}
            onUpdateNote={updateNote}
            onAddTerm={addTerm}
            onRemoveTerm={removeTerm}
            onUpdateTerm={updateTerm}
            onAiSuggest={aiSuggestNote}
          />

          <InvoiceOptions
            reverseCharge={reverseCharge}
            onReverseCharge={setReverseCharge}
            eWaybill={eWaybill}
            onEWaybill={setEWaybill}
            eInvoice={eInvoice}
            onEInvoice={setEInvoice}
            attachments={attachments}
            onAddAttachment={addAttachment}
            onRemoveAttachment={removeAttachment}
          />

          <InvoiceBank
            banks={banks}
            selectedBank={selectedBank}
            onSelectBank={setSelectedBank}
            onAddBank={addBank}
            onEditBank={editBank}
            onDeleteBank={deleteBank}
            payments={payments}
            onAddPayment={addPayment}
            onRemovePayment={removePayment}
            onUpdatePayment={updatePayment}
            markFullyPaid={markFullyPaid}
            onMarkFullyPaid={setMarkFullyPaid}
            grandTotal={computed.grandTotal}
            balanceDue={computed.balanceDue}
          />

          <InvoiceSignature
            signatures={signatures}
            selectedSignature={selectedSignature}
            onSelectSignature={setSelectedSignature}
            onAddSignature={addSignature}
            onDeleteSignature={deleteSignature}
          />
        </div>

        <div className="inv-layout__sidebar">
          <InvoiceSummary
            enableTds={enableTds}
            onTds={setEnableTds}
            enableTcs={enableTcs}
            onTcs={setEnableTcs}
            extraDiscountType={extraDiscountType}
            extraDiscountValue={extraDiscountValue}
            onExtraDiscountType={setExtraDiscountType}
            onExtraDiscountValue={setExtraDiscountValue}
            taxableAmount={computed.taxableAmount}
            taxTotal={computed.taxTotal}
            cgst={computed.cgst}
            sgst={computed.sgst}
            igst={computed.igst}
            discountTotal={computed.discountTotal}
            additionalChargesTotal={computed.additionalChargesTotal}
            roundOff={roundOff}
            onRoundOff={setRoundOff}
            beforeRound={computed.beforeRound}
            grandTotal={computed.grandTotal}
          />
        </div>
      </div>

      <InvoiceFooter />

      {/* Modals */}
      <CustomerModal
        open={customerModal.open}
        mode={customerModal.mode}
        initial={customerModal.customer}
        onClose={closeCustomerModal}
        onSubmit={submitCustomer}
      />

      <ProductModal
        open={productModal.open}
        mode={productModal.mode}
        initial={productModal.product}
        categories={categories}
        onClose={closeProductModal}
        onSubmit={submitProduct}
      />

      <NotificationToast />
    </div>
  );
}