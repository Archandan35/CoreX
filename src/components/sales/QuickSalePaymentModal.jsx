import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X, Banknote, Zap, CreditCard, SplitSquareHorizontal,
  CheckCircle2, Copy, Share2, RefreshCw, Printer,
  Download, Mail, MessageCircle, AlertCircle, Clock,
  ChevronRight, ArrowLeft, Plus, Trash2, FileText,
  Smartphone, Wifi, AlertTriangle, XCircle, Loader2,
} from 'lucide-react';

const QUICK_AMOUNTS = [0, 100, 200, 500, 1000, 2000];
const UPI_TIMER_SECONDS = 300;
const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote, color: '#22c55e', features: ['Fast payment', 'No processing fee'] },
  { key: 'upi', label: 'UPI', icon: Zap, color: '#3b82f6', features: ['QR Payment', 'Google Pay, PhonePe, Paytm'] },
  { key: 'card', label: 'Card', icon: CreditCard, color: '#8b5cf6', features: ['Credit Card', 'Debit Card', 'Tap Card'] },
  { key: 'split', label: 'Split Payment', icon: SplitSquareHorizontal, color: '#f59e0b', features: ['Multiple payments', 'Cash + UPI + Card'] },
];
const CARD_TYPES = ['Visa', 'Mastercard', 'RuPay', 'Amex'];

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export default function QuickSalePaymentModal({
  open, onClose, grandTotal, subtotal, discountAmount, discount, tax, taxRate,
  cartItems, currencySymbol, selectedCustomer, onComplete,
}) {
  const [step, setStep] = useState('method');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [upiTimer, setUpiTimer] = useState(UPI_TIMER_SECONDS);
  const [upiStatus, setUpiStatus] = useState('waiting');
  const [cardType, setCardType] = useState('');
  const [cardStatus, setCardStatus] = useState('idle');
  const [cardAuthCode, setCardAuthCode] = useState('');
  const [cardRefNum, setCardRefNum] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);
  const [splitMethod, setSplitMethod] = useState('cash');
  const [splitAmount, setSplitAmount] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [failedReason, setFailedReason] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const cashInputRef = useRef(null);
  const upiIntervalRef = useRef(null);
  const splitInputRef = useRef(null);

  const cashChange = useMemo(() => {
    const received = Number(cashReceived) || 0;
    return received > grandTotal ? round2(received - grandTotal) : 0;
  }, [cashReceived, grandTotal]);

  const canCompleteCash = useMemo(() => (Number(cashReceived) || 0) >= grandTotal && grandTotal > 0, [cashReceived, grandTotal]);

  const splitRemaining = useMemo(() => {
    const paid = splitPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return round2(Math.max(0, grandTotal - paid));
  }, [splitPayments, grandTotal]);

  const canCompleteSplit = useMemo(() => splitRemaining === 0 && splitPayments.length > 0, [splitRemaining, splitPayments]);

  useEffect(() => {
    if (!open) {
      setStep('method');
      setSelectedMethod(null);
      setCashReceived('');
      setUpiStatus('waiting');
      setUpiTimer(UPI_TIMER_SECONDS);
      setCardType('');
      setCardStatus('idle');
      setSplitPayments([]);
      setSuccessData(null);
      setShowReceipt(false);
      setProcessing(false);
      if (upiIntervalRef.current) clearInterval(upiIntervalRef.current);
    }
  }, [open]);

  useEffect(() => {
    if (step === 'cash' && cashInputRef.current) cashInputRef.current.focus();
    if (step === 'split' && splitInputRef.current) splitInputRef.current.focus();
  }, [step]);

  useEffect(() => {
    if (step === 'upi') {
      setUpiTimer(UPI_TIMER_SECONDS);
      setUpiStatus('waiting');
      upiIntervalRef.current = setInterval(() => {
        setUpiTimer(prev => {
          if (prev <= 1) { clearInterval(upiIntervalRef.current); setUpiStatus('expired'); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(upiIntervalRef.current);
    }
  }, [step]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (step === 'method') {
        if (e.key === 'F1') { e.preventDefault(); selectMethod('cash'); }
        if (e.key === 'F2') { e.preventDefault(); selectMethod('upi'); }
        if (e.key === 'F3') { e.preventDefault(); selectMethod('card'); }
        if (e.key === 'F4') { e.preventDefault(); selectMethod('split'); }
      }
      if (e.key === 'Enter') {
        if (step === 'cash' && canCompleteCash) { e.preventDefault(); completeCashPayment(); }
        if (step === 'upi' && upiStatus === 'received') { e.preventDefault(); completeUpiPayment(); }
        if (step === 'card' && cardStatus === 'approved') { e.preventDefault(); completeCardPayment(); }
        if (step === 'split' && canCompleteSplit) { e.preventDefault(); completeSplitPayment(); }
        if (step === 'success' && !showReceipt) { e.preventDefault(); setShowReceipt(true); }
        if (step === 'success' && showReceipt) { e.preventDefault(); handleNewSale(); }
      }
      if (e.key === 'F5') {
        e.preventDefault();
        if (step === 'cash' && canCompleteCash) completeCashPayment();
        if (step === 'upi' && upiStatus === 'received') completeUpiPayment();
        if (step === 'card' && cardStatus === 'approved') completeCardPayment();
        if (step === 'split' && canCompleteSplit) completeSplitPayment();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, step, canCompleteCash, upiStatus, cardStatus, canCompleteSplit, showReceipt]);

  const selectMethod = useCallback((method) => { setSelectedMethod(method); setStep(method); }, []);
  const handleBack = useCallback(() => { setStep('method'); setSelectedMethod(null); }, []);

  const buildInvoiceData = useCallback((method, paid, change) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const invoiceNumber = `QS-${Date.now().toString(36).toUpperCase()}`;
    const items = cartItems.map((item, i) => {
      const rate = item.taxRate || taxRate || 0;
      const gross = round2(item.qty * item.price);
      const taxAmt = round2((gross * rate) / 100);
      return {
        product_id: item.productId, name: item.name, description: '', show_description: false,
        quantity: item.qty, unit_price: item.price, discount_type: 'percent', discount_value: 0,
        discount_amount: 0, tax_rate: rate, tax_amount: taxAmt,
        line_total: round2(gross + taxAmt), sort_order: i,
      };
    });
    const payment = {
      amount: paid, payment_date: dateStr, payment_mode: method,
      notes: method === 'cash' ? `Cash received: ${cashReceived}, Change: ${change}` :
        method === 'upi' ? 'UPI Payment' : method === 'card' ? `Card: ${cardType}` : 'Split Payment',
    };
    return {
      prefix: 'QS-', invoice_number: invoiceNumber, customer_id: selectedCustomer?.id || null,
      invoice_date: dateStr, due_date: dateStr, subtotal, discount_total: discountAmount,
      taxable_amount: round2(subtotal - discountAmount), cgst_total: round2(tax / 2),
      sgst_total: round2(tax / 2), igst_total: 0, tax_total: tax,
      additional_charges_total: 0, grand_total: grandTotal, amount_paid: paid,
      balance_due: round2(Math.max(0, grandTotal - paid)),
      status: paid >= grandTotal ? 'paid' : 'partially_paid',
      notes: '', terms: '', reverse_charge: false, create_ewaybill: false, create_einvoice: false,
      tds_enabled: false, tcs_enabled: false, round_off: 0, items, payments: [payment],
    };
  }, [cartItems, subtotal, discountAmount, tax, taxRate, grandTotal, selectedCustomer, cashReceived, cardType]);

  const posServiceSaveInvoice = async (data) => {
    const { posService } = await import('../../services/pos/POSService.js');
    return posService.saveInvoice(data);
  };

  const completeCashPayment = useCallback(async () => {
    if (!canCompleteCash || processing) return;
    setProcessing(true);
    try {
      const paid = Number(cashReceived);
      const change = round2(paid - grandTotal);
      const inv = buildInvoiceData('cash', paid, change);
      await posServiceSaveInvoice(inv);
      setSuccessData({ method: 'Cash', amountPaid: paid, changeReturned: change, invoiceNumber: inv.invoice_number, timestamp: new Date().toLocaleString() });
      setStep('success');
      if (onComplete) onComplete(inv);
    } catch (err) { setFailedReason(err.message || 'Payment failed'); setStep('failed'); }
    finally { setProcessing(false); }
  }, [canCompleteCash, processing, cashReceived, grandTotal, buildInvoiceData, onComplete]);

  const completeUpiPayment = useCallback(async () => {
    if (upiStatus !== 'received' || processing) return;
    setProcessing(true);
    try {
      const inv = buildInvoiceData('upi', grandTotal, 0);
      inv.payments[0].transaction_id = 'UPI-' + Date.now().toString(36).toUpperCase();
      await posServiceSaveInvoice(inv);
      setSuccessData({ method: 'UPI', amountPaid: grandTotal, changeReturned: 0, invoiceNumber: inv.invoice_number, transactionId: inv.payments[0].transaction_id, timestamp: new Date().toLocaleString() });
      setStep('success');
      if (onComplete) onComplete(inv);
    } catch (err) { setFailedReason(err.message || 'Payment failed'); setStep('failed'); }
    finally { setProcessing(false); }
  }, [upiStatus, processing, grandTotal, buildInvoiceData, onComplete]);

  const completeCardPayment = useCallback(async () => {
    if (cardStatus !== 'approved' || processing) return;
    setProcessing(true);
    try {
      const inv = buildInvoiceData('card', grandTotal, 0);
      inv.payments[0].transaction_id = cardRefNum;
      inv.payments[0].notes = `Card: ${cardType}, Auth: ${cardAuthCode}, Ref: ${cardRefNum}`;
      await posServiceSaveInvoice(inv);
      setSuccessData({ method: `Card (${cardType})`, amountPaid: grandTotal, changeReturned: 0, invoiceNumber: inv.invoice_number, transactionId: cardRefNum, authCode: cardAuthCode, timestamp: new Date().toLocaleString() });
      setStep('success');
      if (onComplete) onComplete(inv);
    } catch (err) { setFailedReason(err.message || 'Payment failed'); setStep('failed'); }
    finally { setProcessing(false); }
  }, [cardStatus, processing, cardType, cardAuthCode, cardRefNum, grandTotal, buildInvoiceData, onComplete]);

  const completeSplitPayment = useCallback(async () => {
    if (!canCompleteSplit || processing) return;
    setProcessing(true);
    try {
      const inv = buildInvoiceData('split', round2(grandTotal - splitRemaining), 0);
      inv.payments = splitPayments.map(sp => ({ amount: sp.amount, payment_date: new Date().toISOString().split('T')[0], payment_mode: sp.method, notes: sp.method }));
      await posServiceSaveInvoice(inv);
      setSuccessData({ method: 'Split Payment', amountPaid: round2(grandTotal - splitRemaining), changeReturned: 0, invoiceNumber: inv.invoice_number, splitDetails: splitPayments, timestamp: new Date().toLocaleString() });
      setStep('success');
      if (onComplete) onComplete(inv);
    } catch (err) { setFailedReason(err.message || 'Payment failed'); setStep('failed'); }
    finally { setProcessing(false); }
  }, [canCompleteSplit, processing, splitPayments, grandTotal, splitRemaining, buildInvoiceData, onComplete]);

  const addSplitPayment = useCallback(() => {
    const amt = Number(splitAmount);
    if (!amt || amt <= 0 || amt > splitRemaining) return;
    setSplitPayments(prev => [...prev, { method: splitMethod, amount: amt, id: Date.now() }]);
    setSplitAmount('');
  }, [splitMethod, splitAmount, splitRemaining]);

  const removeSplitPayment = useCallback((id) => setSplitPayments(prev => prev.filter(p => p.id !== id)), []);

  const simulateUpiPayment = useCallback(() => { setUpiStatus('received'); if (upiIntervalRef.current) clearInterval(upiIntervalRef.current); }, []);

  const simulateCardPayment = useCallback(() => {
    setCardStatus('processing');
    setTimeout(() => {
      setCardStatus('approved');
      setCardAuthCode('AUTH-' + Math.random().toString(36).substring(2, 8).toUpperCase());
      setCardRefNum('REF-' + Date.now().toString(36).toUpperCase());
    }, 1500);
  }, []);

  const handleNewSale = useCallback(() => { onClose(); }, [onClose]);

  const formatTimer = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!open) return null;

  return (
    <div className="qsp-overlay">
      <div className="qsp-modal">
        {step === 'method' && <MethodScreen onSelect={selectMethod} onClose={onClose} grandTotal={grandTotal} subtotal={subtotal} discountAmount={discountAmount} tax={tax} currencySymbol={currencySymbol} />}
        {step === 'cash' && <CashScreen grandTotal={grandTotal} cashReceived={cashReceived} setCashReceived={setCashReceived} cashChange={cashChange} canComplete={canCompleteCash} onComplete={completeCashPayment} onBack={handleBack} onClose={onClose} currencySymbol={currencySymbol} cashInputRef={cashInputRef} processing={processing} subtotal={subtotal} discountAmount={discountAmount} tax={tax} />}
        {step === 'upi' && <UpiScreen grandTotal={grandTotal} upiTimer={upiTimer} upiStatus={upiStatus} onSimulate={simulateUpiPayment} onComplete={completeUpiPayment} onBack={handleBack} onClose={onClose} currencySymbol={currencySymbol} processing={processing} formatTimer={formatTimer} subtotal={subtotal} discountAmount={discountAmount} tax={tax} />}
        {step === 'card' && <CardScreen grandTotal={grandTotal} cardType={cardType} setCardType={setCardType} cardStatus={cardStatus} cardAuthCode={cardAuthCode} cardRefNum={cardRefNum} onSimulate={simulateCardPayment} onComplete={completeCardPayment} onBack={handleBack} onClose={onClose} currencySymbol={currencySymbol} processing={processing} subtotal={subtotal} discountAmount={discountAmount} tax={tax} />}
        {step === 'split' && <SplitScreen grandTotal={grandTotal} splitPayments={splitPayments} splitRemaining={splitRemaining} splitMethod={splitMethod} setSplitMethod={setSplitMethod} splitAmount={splitAmount} setSplitAmount={setSplitAmount} onAdd={addSplitPayment} onRemove={removeSplitPayment} canComplete={canCompleteSplit} onComplete={completeSplitPayment} onBack={handleBack} onClose={onClose} currencySymbol={currencySymbol} processing={processing} subtotal={subtotal} discountAmount={discountAmount} tax={tax} cashInputRef={splitInputRef} />}
        {step === 'success' && <SuccessScreen data={successData} currencySymbol={currencySymbol} showReceipt={showReceipt} setShowReceipt={setShowReceipt} onNewSale={handleNewSale} onClose={onClose} />}
        {step === 'failed' && <FailedScreen reason={failedReason} onRetry={() => setStep(selectedMethod)} onChangeMethod={handleBack} onClose={onClose} />}
        {step === 'cancelled' && <CancelledScreen onResume={() => setStep(selectedMethod)} onChangeMethod={handleBack} onReturnToCart={onClose} />}
      </div>
    </div>
  );
}

function SummaryBar({ subtotal, discountAmount, tax, grandTotal, currencySymbol }) {
  return (
    <div className="qsp-summary">
      <div className="qsp-sum-row"><span>Subtotal</span><span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
      {discountAmount > 0 && <div className="qsp-sum-row"><span>Discount</span><span className="qsp-sum-disc">-{currencySymbol}{discountAmount.toFixed(2)}</span></div>}
      <div className="qsp-sum-row"><span>Tax</span><span>{currencySymbol}{tax.toFixed(2)}</span></div>
      <div className="qsp-sum-row"><span>Round Off</span><span>{currencySymbol}0.00</span></div>
      <div className="qsp-sum-divider" />
      <div className="qsp-sum-total"><span>Grand Total</span><span>{currencySymbol}{grandTotal.toFixed(2)}</span></div>
    </div>
  );
}

function ScreenHeader({ icon: Icon, title, subtitle, onBack, onClose, color }) {
  return (
    <div className="qsp-scr-header">
      {onBack && <button className="qsp-scr-back" onClick={onBack}><ArrowLeft size={22} /></button>}
      <div className="qsp-scr-header-text">
        <div className="qsp-scr-title" style={color ? { color } : {}}>{Icon && <Icon size={24} />} {title}</div>
        {subtitle && <div className="qsp-scr-subtitle">{subtitle}</div>}
      </div>
      <button className="qsp-scr-close" onClick={onClose}><X size={22} /></button>
    </div>
  );
}

function ScreenFooter({ onCancel, onBack, cancelLabel, backLabel, onAction, actionLabel, actionDisabled, actionLoading }) {
  return (
    <div className="qsp-scr-footer">
      {onBack && <button className="qsp-btn qsp-btn-ghost" onClick={onBack}>{backLabel || 'Back'}</button>}
      {onCancel && !onBack && <button className="qsp-btn qsp-btn-ghost" onClick={onCancel}>{cancelLabel || 'Cancel'}</button>}
      {onAction && <button className="qsp-btn qsp-btn-primary" disabled={actionDisabled || actionLoading} onClick={onAction}>{actionLoading ? 'Processing...' : actionLabel}</button>}
    </div>
  );
}

function MethodScreen({ onSelect, onClose, grandTotal, subtotal, discountAmount, tax, currencySymbol }) {
  return (
    <>
      <ScreenHeader title="Select Payment Method" subtitle="Choose the customer's payment method to complete the sale." onClose={onClose} />
      <div className="qsp-scr-body">
        <SummaryBar subtotal={subtotal} discountAmount={discountAmount} tax={tax} grandTotal={grandTotal} currencySymbol={currencySymbol} />
        <div className="qsp-method-grid">
          {PAYMENT_METHODS.map(pm => {
            const Icon = pm.icon;
            return (
              <button key={pm.key} className="qsp-method-card" onClick={() => onSelect(pm.key)}>
                <div className="qsp-method-icon" style={{ background: pm.color + '15', color: pm.color }}><Icon size={32} /></div>
                <div className="qsp-method-label">{pm.label}</div>
                <div className="qsp-method-features">{pm.features.map((f, i) => <span key={i}>{f}</span>)}</div>
                <ChevronRight size={16} className="qsp-method-arrow" />
              </button>
            );
          })}
        </div>
      </div>
      <div className="qsp-scr-footer">
        <button className="qsp-btn qsp-btn-ghost" onClick={onClose}>Cancel</button>
        <div className="qsp-shortcuts"><span>F1 Cash</span><span>F2 UPI</span><span>F3 Card</span><span>F4 Split</span><span>ESC Cancel</span></div>
      </div>
    </>
  );
}

function CashScreen({ grandTotal, cashReceived, setCashReceived, cashChange, canComplete, onComplete, onBack, onClose, currencySymbol, cashInputRef, processing, subtotal, discountAmount, tax }) {
  return (
    <>
      <ScreenHeader icon={Banknote} title="Cash Payment" subtitle="Enter the amount received from the customer." onBack={onBack} onClose={onClose} color="#22c55e" />
      <div className="qsp-scr-body">
        <SummaryBar subtotal={subtotal} discountAmount={discountAmount} tax={tax} grandTotal={grandTotal} currencySymbol={currencySymbol} />
        <div className="qsp-cash-card">
          <div className="qsp-cash-label">Amount Payable</div>
          <div className="qsp-cash-amount">{currencySymbol}{grandTotal.toFixed(2)}</div>
        </div>
        <div className="qsp-cash-input-wrap">
          <label className="qsp-field-label">Cash Received</label>
          <input ref={cashInputRef} className="qsp-cash-input" type="number" min="0" step="0.01" placeholder="Enter received amount" value={cashReceived} onChange={e => setCashReceived(e.target.value)} />
        </div>
        <div className="qsp-quick-amts">
          {QUICK_AMOUNTS.map(amt => (
            <button key={amt} className={`qsp-quick-btn ${Number(cashReceived) === amt ? 'active' : ''}`} onClick={() => setCashReceived(String(amt))}>
              {amt === 0 ? 'Exact' : `${currencySymbol}${amt}`}
            </button>
          ))}
        </div>
        {cashReceived && (
          <div className={`qsp-cash-result ${Number(cashReceived) >= grandTotal ? 'positive' : 'negative'}`}>
            {Number(cashReceived) >= grandTotal ? (
              <div className="qsp-cash-result-inner">
                <div className="qsp-cash-result-row"><span>Cash Received</span><span>{currencySymbol}{Number(cashReceived).toFixed(2)}</span></div>
                <div className="qsp-cash-result-row large"><span>Change Return</span><span>{currencySymbol}{cashChange.toFixed(2)}</span></div>
              </div>
            ) : (
              <div className="qsp-cash-result-inner">
                <div className="qsp-cash-result-row large"><span>Remaining Amount</span><span>{currencySymbol}{round2(grandTotal - Number(cashReceived)).toFixed(2)}</span></div>
              </div>
            )}
          </div>
        )}
        <div className="qsp-cash-options">
          <label className="qsp-checkbox"><input type="checkbox" defaultChecked /> Open Cash Drawer</label>
          <label className="qsp-checkbox"><input type="checkbox" defaultChecked /> Print Receipt</label>
          <label className="qsp-checkbox"><input type="checkbox" /> Email Receipt</label>
          <label className="qsp-checkbox"><input type="checkbox" /> SMS Receipt</label>
        </div>
      </div>
      <ScreenFooter onBack={onBack} onCancel={onClose} onAction={onComplete} actionLabel="Complete Payment" actionDisabled={!canComplete} actionLoading={processing} />
    </>
  );
}

function UpiScreen({ grandTotal, upiTimer, upiStatus, onSimulate, onComplete, onBack, onClose, currencySymbol, processing, formatTimer, subtotal, discountAmount, tax }) {
  const upiId = 'corex@upi';
  const qrSvg = useMemo(() => {
    const size = 220, cells = [], mc = 25, ms = size / mc;
    for (let i = 0; i < mc; i++) for (let j = 0; j < mc; j++) {
      const f = (i < 7 && j < 7) || (i < 7 && j >= mc - 7) || (i >= mc - 7 && j < 7);
      const c = i >= 3 && i <= 5 && j >= 3 && j <= 5;
      if (f || c || ((i + j) % 3 === 0 && i > 7 && j > 7)) cells.push(<rect key={`${i}-${j}`} x={j * ms} y={i * ms} width={ms} height={ms} fill="#000" />);
    }
    return <svg viewBox={`0 0 ${size} ${size}`} width="220" height="220" style={{ background: '#fff', borderRadius: 12, padding: 10 }}>{cells}</svg>;
  }, []);

  return (
    <>
      <ScreenHeader icon={Zap} title="UPI Payment" subtitle="Scan QR code or use UPI ID to pay." onBack={onBack} onClose={onClose} color="#3b82f6" />
      <div className="qsp-scr-body">
        <SummaryBar subtotal={subtotal} discountAmount={discountAmount} tax={tax} grandTotal={grandTotal} currencySymbol={currencySymbol} />
        <div className="qsp-upi-layout">
          <div className="qsp-upi-left">
            <div className="qsp-upi-qr-wrap">
              {qrSvg}
              <div className="qsp-upi-store">Store Name</div>
              <div className="qsp-upi-id-row">
                <span>{upiId}</span>
                <button className="qsp-copy-btn" onClick={() => navigator.clipboard?.writeText(upiId)}><Copy size={13} /></button>
              </div>
            </div>
          </div>
          <div className="qsp-upi-right">
            <div className="qsp-upi-info-card">
              <div className="qsp-upi-info-row"><span>Amount</span><span className="qsp-upi-info-total">{currencySymbol}{grandTotal.toFixed(2)}</span></div>
              <div className="qsp-upi-info-row"><span>Invoice</span><span>QS-{Date.now().toString(36).toUpperCase().slice(0, 6)}</span></div>
              <div className="qsp-upi-info-row"><span>Timer</span><span className="qsp-upi-timer">{formatTimer(upiTimer)}</span></div>
            </div>
            <div className={`qsp-upi-status-badge qsp-upi-${upiStatus}`}>
              {upiStatus === 'waiting' && <><Clock size={16} /> Waiting for customer payment...</>}
              {upiStatus === 'received' && <><CheckCircle2 size={16} /> Payment Received!</>}
              {upiStatus === 'expired' && <><AlertCircle size={16} /> QR Code Expired</>}
            </div>
            <div className="qsp-upi-actions">
              {upiStatus === 'waiting' && <><button className="qsp-btn qsp-btn-outline-sm" onClick={onSimulate}><Zap size={13} /> Simulate Payment</button><button className="qsp-btn qsp-btn-outline-sm" onClick={() => navigator.share?.({ title: 'Pay via UPI', text: `Pay ${currencySymbol}${grandTotal.toFixed(2)} to ${upiId}` })}><Share2 size={13} /> Share Link</button></>}
              {upiStatus === 'expired' && <button className="qsp-btn qsp-btn-outline-sm" onClick={() => { setUpiTimer(300); }}><RefreshCw size={13} /> Refresh QR</button>}
            </div>
          </div>
        </div>
      </div>
      <ScreenFooter onBack={onBack} onCancel={onClose} onAction={onComplete} actionLabel="Payment Received" actionDisabled={upiStatus !== 'received'} actionLoading={processing} />
    </>
  );
}

function CardScreen({ grandTotal, cardType, setCardType, cardStatus, cardAuthCode, cardRefNum, onSimulate, onComplete, onBack, onClose, currencySymbol, processing, subtotal, discountAmount, tax }) {
  return (
    <>
      <ScreenHeader icon={CreditCard} title="Card Payment" subtitle="Select card type and process payment." onBack={onBack} onClose={onClose} color="#8b5cf6" />
      <div className="qsp-scr-body">
        <SummaryBar subtotal={subtotal} discountAmount={discountAmount} tax={tax} grandTotal={grandTotal} currencySymbol={currencySymbol} />
        <div className="qsp-card-layout">
          <div className="qsp-card-left">
            <div className="qsp-card-amount-display">
              <div className="qsp-card-amount-label">Amount</div>
              <div className="qsp-card-amount-value">{currencySymbol}{grandTotal.toFixed(2)}</div>
            </div>
            <div className="qsp-card-terminal">
              <CreditCard size={56} strokeWidth={1.5} />
              <div className="qsp-card-terminal-label">POS Terminal</div>
              <div className="qsp-card-terminal-hint">Insert, Swipe, or Tap Card</div>
            </div>
          </div>
          <div className="qsp-card-right">
            <div className={`qsp-card-status-badge qsp-card-${cardStatus}`}>
              {cardStatus === 'idle' && <><AlertCircle size={16} /> Select card type to continue</>}
              {cardStatus === 'processing' && <><Loader2 size={16} className="spin" /> Processing...</>}
              {cardStatus === 'approved' && <><CheckCircle2 size={16} /> Approved</>}
              {cardStatus === 'declined' && <><XCircle size={16} /> Declined</>}
            </div>
            <div className="qsp-card-type-grid">
              {CARD_TYPES.map(ct => (
                <button key={ct} className={`qsp-card-type-btn ${cardType === ct ? 'active' : ''}`} onClick={() => { setCardType(ct); setCardStatus('idle'); }}>
                  <CreditCard size={16} /> {ct}
                </button>
              ))}
            </div>
            {cardStatus === 'approved' && (
              <div className="qsp-card-details">
                <div className="qsp-card-detail-row"><span>Auth Code</span><span>{cardAuthCode}</span></div>
                <div className="qsp-card-detail-row"><span>Reference</span><span>{cardRefNum}</span></div>
              </div>
            )}
            {cardType && cardStatus === 'idle' && (
              <button className="qsp-btn qsp-btn-primary full" onClick={onSimulate}><CreditCard size={14} /> Process Card</button>
            )}
          </div>
        </div>
      </div>
      <ScreenFooter onBack={onBack} onCancel={onClose} onAction={onComplete} actionLabel="Complete Sale" actionDisabled={cardStatus !== 'approved'} actionLoading={processing} />
    </>
  );
}

function SplitScreen({ grandTotal, splitPayments, splitRemaining, splitMethod, setSplitMethod, splitAmount, setSplitAmount, onAdd, onRemove, canComplete, onComplete, onBack, onClose, currencySymbol, processing, subtotal, discountAmount, tax, cashInputRef }) {
  const methodColors = { cash: '#22c55e', upi: '#3b82f6', card: '#8b5cf6' };
  const methodIcons = { cash: Banknote, upi: Zap, card: CreditCard };
  return (
    <>
      <ScreenHeader icon={SplitSquareHorizontal} title="Split Payment" subtitle="Use multiple payment methods in a single transaction." onBack={onBack} onClose={onClose} color="#f59e0b" />
      <div className="qsp-scr-body">
        <SummaryBar subtotal={subtotal} discountAmount={discountAmount} tax={tax} grandTotal={grandTotal} currencySymbol={currencySymbol} />
        <div className="qsp-split-remaining-card" data-state={splitRemaining === 0 ? 'zero' : 'pending'}>
          <span>Remaining</span>
          <span className="qsp-split-remaining-val">{currencySymbol}{splitRemaining.toFixed(2)}</span>
        </div>
        {splitPayments.length > 0 && (
          <div className="qsp-split-table">
            <div className="qsp-split-table-head"><span>Payment Method</span><span>Amount</span><span>Action</span></div>
            {splitPayments.map(sp => {
              const MIcon = methodIcons[sp.method] || Banknote;
              return (
                <div key={sp.id} className="qsp-split-table-row">
                  <div className="qsp-split-method-cell" style={{ color: methodColors[sp.method] }}><MIcon size={15} /> {sp.method.charAt(0).toUpperCase() + sp.method.slice(1)}</div>
                  <span className="qsp-split-amt-cell">{currencySymbol}{Number(sp.amount).toFixed(2)}</span>
                  <button className="qsp-split-del-btn" onClick={() => onRemove(sp.id)}><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
        <div className="qsp-split-add-row">
          <select className="qsp-split-sel" value={splitMethod} onChange={e => setSplitMethod(e.target.value)}>
            <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
          </select>
          <input ref={cashInputRef} className="qsp-split-amt-input" type="number" min="0" step="0.01" placeholder="Amount" value={splitAmount} onChange={e => setSplitAmount(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onAdd(); }} />
          <button className="qsp-btn qsp-btn-primary-sm" onClick={onAdd} disabled={!splitAmount || Number(splitAmount) <= 0}><Plus size={13} /> Add</button>
        </div>
      </div>
      <ScreenFooter onBack={onBack} onCancel={onClose} onAction={onComplete} actionLabel="Complete Payment" actionDisabled={!canComplete} actionLoading={processing} />
    </>
  );
}

function SuccessScreen({ data, currencySymbol, showReceipt, setShowReceipt, onNewSale, onClose }) {
  return (
    <>
      <div className="qsp-success-header">
        <div className="qsp-success-icon"><CheckCircle2 size={72} /></div>
        <div className="qsp-success-title">Payment Successful!</div>
        <div className="qsp-success-sub">Transaction completed successfully.</div>
        <button className="qsp-scr-close" onClick={onClose}><X size={22} /></button>
      </div>
      <div className="qsp-scr-body">
        {!showReceipt ? (
          <div className="qsp-success-card">
            <div className="qsp-success-row"><span>Invoice Number</span><span>{data.invoiceNumber}</span></div>
            {data.orderNumber && <div className="qsp-success-row"><span>Order Number</span><span>{data.orderNumber}</span></div>}
            <div className="qsp-success-row"><span>Customer</span><span>Walk-in Customer</span></div>
            <div className="qsp-success-row"><span>Payment Method</span><span>{data.method}</span></div>
            <div className="qsp-success-row highlight"><span>Paid Amount</span><span>{currencySymbol}{data.amountPaid?.toFixed(2)}</span></div>
            {data.changeReturned > 0 && <div className="qsp-success-row green"><span>Change Returned</span><span>{currencySymbol}{data.changeReturned.toFixed(2)}</span></div>}
            {data.transactionId && <div className="qsp-success-row"><span>Transaction ID</span><span>{data.transactionId}</span></div>}
            {data.authCode && <div className="qsp-success-row"><span>Auth Code</span><span>{data.authCode}</span></div>}
            <div className="qsp-success-row"><span>Cashier</span><span>Admin</span></div>
            <div className="qsp-success-row"><span>Date & Time</span><span>{data.timestamp}</span></div>
          </div>
        ) : (
          <div className="qsp-receipt-preview">
            <div className="qsp-receipt-paper">
              <div className="qsp-receipt-logo">Store Logo</div>
              <div className="qsp-receipt-store">Store Name</div>
              <div className="qsp-receipt-gst">GST: 29AABCU9603R1ZM</div>
              <div className="qsp-receipt-divider" />
              <div className="qsp-receipt-row"><span>Invoice</span><span>{data.invoiceNumber}</span></div>
              <div className="qsp-receipt-row"><span>Date</span><span>{data.timestamp}</span></div>
              <div className="qsp-receipt-row"><span>Cashier</span><span>Admin</span></div>
              <div className="qsp-receipt-divider" />
              <div className="qsp-receipt-row"><span>Payment</span><span>{data.method}</span></div>
              <div className="qsp-receipt-row bold"><span>Total</span><span>{currencySymbol}{data.amountPaid?.toFixed(2)}</span></div>
              {data.changeReturned > 0 && <div className="qsp-receipt-row"><span>Change</span><span>{currencySymbol}{data.changeReturned.toFixed(2)}</span></div>}
              <div className="qsp-receipt-divider" />
              <div className="qsp-receipt-thank">Thank you for your purchase!</div>
            </div>
          </div>
        )}
        <div className="qsp-receipt-actions">
          <button className="qsp-btn qsp-btn-outline"><Printer size={14} /> Print Receipt</button>
          <button className="qsp-btn qsp-btn-outline"><Download size={14} /> Download PDF</button>
          <button className="qsp-btn qsp-btn-outline"><Mail size={14} /> Email</button>
        </div>
      </div>
      <div className="qsp-scr-footer">
        {!showReceipt ? (
          <button className="qsp-btn qsp-btn-primary" onClick={() => setShowReceipt(true)}>View Receipt</button>
        ) : (
          <button className="qsp-btn qsp-btn-primary" onClick={onNewSale}><Plus size={14} /> New Sale</button>
        )}
      </div>
    </>
  );
}

function FailedScreen({ reason, onRetry, onChangeMethod, onClose }) {
  return (
    <>
      <ScreenHeader title="Payment Failed" onClose={onClose} color="#ef4444" />
      <div className="qsp-scr-body qsp-center">
        <div className="qsp-fail-icon"><XCircle size={72} /></div>
        <div className="qsp-fail-title">Payment Failed</div>
        <div className="qsp-fail-box">
          <div className="qsp-fail-reason-title">Possible reasons:</div>
          <div className="qsp-fail-reasons">
            {['Payment declined', 'Network timeout', 'Insufficient funds', 'Card removed', 'UPI timeout'].map(r => <div key={r}>• {r}</div>)}
          </div>
          {reason && <div className="qsp-fail-error">Error: {reason}</div>}
        </div>
      </div>
      <div className="qsp-scr-footer">
        <button className="qsp-btn qsp-btn-ghost" onClick={onClose}>Cancel Sale</button>
        <button className="qsp-btn qsp-btn-outline" onClick={onChangeMethod}>Change Method</button>
        <button className="qsp-btn qsp-btn-primary" onClick={onRetry}>Retry Payment</button>
      </div>
    </>
  );
}

function CancelledScreen({ onResume, onChangeMethod, onReturnToCart }) {
  return (
    <>
      <ScreenHeader title="Payment Cancelled" onClose={onReturnToCart} color="#f59e0b" />
      <div className="qsp-scr-body qsp-center">
        <div className="qsp-cancel-icon"><AlertTriangle size={72} /></div>
        <div className="qsp-cancel-title">Payment Cancelled</div>
        <div className="qsp-cancel-msg">The payment was cancelled before completion.<br/>No transaction has been recorded.</div>
      </div>
      <div className="qsp-scr-footer">
        <button className="qsp-btn qsp-btn-ghost" onClick={onReturnToCart}>Return to Cart</button>
        <button className="qsp-btn qsp-btn-outline" onClick={onChangeMethod}>Change Method</button>
        <button className="qsp-btn qsp-btn-primary" onClick={onResume}>Resume Payment</button>
      </div>
    </>
  );
}
