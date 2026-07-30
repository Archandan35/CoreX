import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Users, Search, Package, ShoppingCart, CreditCard, Zap,
  Calculator, Barcode, Monitor, Grid3X3, X, Plus, Minus,
  Trash2, Receipt, Pause, Percent, TrendingUp, TrendingDown,
  UserPlus, UserCheck, Box, FileText, ChevronUp, Tag, Banknote,
  SplitSquareHorizontal, Circle, User, LogOut, Settings, HelpCircle,
  Maximize2, Minimize2, RefreshCw, Save, Printer,
} from 'lucide-react';
import { useToolbar } from '../../components/layout/ToolbarContext.jsx';

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Formal Shirt', code: 'SH001', category: 'Shirt', price: 850, color: 'blue', sizes: { M: 10, L: 15 } },
  { id: 2, name: 'Blue Jeans', code: 'JN001', category: 'Jeans', price: 1250, color: 'navy', sizes: { 32: 8, 34: 12 } },
  { id: 3, name: 'Polo T-Shirt', code: 'TS001', category: 'T-Shirt', price: 650, color: 'darknavy', sizes: { M: 20, L: 18 } },
  { id: 4, name: 'Casual Shirt', code: 'SH002', category: 'Shirt', price: 750, color: 'pink', sizes: { M: 6, L: 9 } },
  { id: 5, name: 'Ladies Dress', code: 'DR001', category: 'Dress', price: 1500, color: 'leaf', sizes: { S: 5, M: 8 } },
  { id: 6, name: 'Slim Fit Jeans', code: 'JN002', category: 'Jeans', price: 1399, color: 'navy', sizes: { 30: 6, 32: 10 } },
  { id: 7, name: 'Cotton T-Shirt', code: 'TS002', category: 'T-Shirt', price: 499, color: 'blue', sizes: { M: 25, L: 20 } },
  { id: 8, name: 'Designer Kurta', code: 'KR001', category: 'Kurta', price: 1899, color: 'leaf', sizes: { M: 7, L: 5 } },
];

const MOCK_CUSTOMERS = [
  { id: 1, name: 'Rajesh Kumar', mobile: '9876543210', gst: 'GST123456' },
  { id: 2, name: 'Priya Sharma', mobile: '9876543211', gst: 'GST123457' },
  { id: 3, name: 'Amit Singh', mobile: '9876543212', gst: 'GST123458' },
  { id: 4, name: 'Neha Patel', mobile: '9876543213', gst: 'GST123459' },
  { id: 5, name: 'Vikram Reddy', mobile: '9876543214', gst: 'GST123460' },
];

const RECENT_ITEMS = [
  { id: 1, name: 'Formal Shirt', code: 'SH001', thumb: 'blue' },
  { id: 2, name: 'Blue Jeans', code: 'JN001', thumb: 'navy' },
  { id: 3, name: 'Polo T-Shirt', code: 'TS001', thumb: 'darknavy' },
  { id: 4, name: 'Casual Shirt', code: 'SH002', thumb: 'pink' },
  { id: 5, name: 'Ladies Dress', code: 'DR001', thumb: 'leaf' },
];

const THUMB_ICONS = {
  blue: <Package size={18} />,
  navy: <Package size={18} />,
  darknavy: <Package size={18} />,
  pink: <Package size={18} />,
  leaf: <Package size={18} />,
};

const THUMB_CLASSES = {
  blue: 'qs-thumb blue',
  navy: 'qs-thumb navy',
  darknavy: 'qs-thumb darknavy',
  pink: 'qs-thumb pink',
  leaf: 'qs-thumb leaf',
};

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function QuickSale() {
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'Formal Shirt', code: 'SH001', meta: 'Blue | M', price: 850, qty: 2, thumb: 'blue', productId: 1 },
    { id: 2, name: 'Blue Jeans', code: 'JN001', meta: '32 | Blue', price: 1250, qty: 1, thumb: 'navy', productId: 2 },
    { id: 3, name: 'Polo T-Shirt', code: 'TS001', meta: 'M | Navy', price: 650, qty: 1, thumb: 'darknavy', productId: 3 },
  ]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('%');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');
  const [calcResult, setCalcResult] = useState(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showProductResults, setShowProductResults] = useState(false);
  const [productResults, setProductResults] = useState([]);
  const cartBodyRef = useRef(null);
  const customerInputRef = useRef(null);
  const productInputRef = useRef(null);

  const debouncedCustomerSearch = useDebounce(customerSearch, 300);
  const debouncedProductSearch = useDebounce(productSearch, 300);

  const filteredCustomers = useMemo(() => {
    if (!debouncedCustomerSearch.trim()) return [];
    const q = debouncedCustomerSearch.toLowerCase();
    return MOCK_CUSTOMERS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      c.gst.toLowerCase().includes(q)
    );
  }, [debouncedCustomerSearch]);

  useEffect(() => {
    if (!debouncedProductSearch.trim()) {
      setProductResults([]);
      setShowProductResults(false);
      return;
    }
    const q = debouncedProductSearch.toLowerCase();
    const results = INITIAL_PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q)
    );
    setProductResults(results);
    setShowProductResults(true);
  }, [debouncedProductSearch]);

  useEffect(() => {
    setShowCustomerResults(filteredCustomers.length > 0 && customerSearch.trim().length > 0);
  }, [filteredCustomers, customerSearch]);

  const addToCart = useCallback((product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      const thumbMap = { blue: 'blue', navy: 'navy', darknavy: 'darknavy', pink: 'pink', leaf: 'leaf' };
      return [...prev, {
        id: Date.now(),
        name: product.name,
        code: product.code,
        meta: `${product.code} | Default`,
        price: product.price,
        qty: 1,
        thumb: thumbMap[product.color] || 'blue',
        productId: product.id,
      }];
    });
    setProductSearch('');
    setShowProductResults(false);
  }, []);

  const addRecentItem = useCallback((item) => {
    const product = INITIAL_PRODUCTS.find(p => p.code === item.code);
    if (product) addToCart(product);
  }, [addToCart]);

  const updateQty = useCallback((id, delta) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  }, []);

  const removeItem = useCallback((id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const selectCustomer = useCallback((customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerResults(false);
  }, []);

  const subtotal = useMemo(() =>
    cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cartItems]
  );
  const discountAmount = useMemo(() => {
    if (discountType === '%') return subtotal * (discount / 100);
    return discount;
  }, [subtotal, discount, discountType]);
  const tax = useMemo(() => (subtotal - discountAmount) * 0.12, [subtotal, discountAmount]);
  const grandTotal = useMemo(() => subtotal - discountAmount + tax, [subtotal, discountAmount, tax]);

  const handleCalculatorInput = useCallback((value) => {
    if (value === 'C') {
      setCalcDisplay('0');
      setCalcExpression('');
      setCalcResult(null);
      return;
    }
    if (value === '=') {
      try {
        const result = Function(`"use strict"; return (${calcExpression})`)();
        setCalcDisplay(String(result));
        setCalcResult(result);
        setCalcExpression(String(result));
      } catch {
        setCalcDisplay('Error');
        setCalcResult(null);
      }
      return;
    }
    if (value === '⌫') {
      setCalcExpression(prev => prev.slice(0, -1) || '0');
      setCalcDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      return;
    }
    setCalcExpression(prev => (prev === '0' && value !== '.') ? value : prev + value);
    setCalcDisplay(prev => (prev === '0' && value !== '.') ? value : prev + value);
  }, [calcExpression]);

  const applyCalcResult = useCallback(() => {
    if (calcResult !== null) {
      setDiscount(Number(calcResult));
      setShowCalculator(false);
    }
  }, [calcResult]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showCalculator) {
        const key = e.key;
        if (key >= '0' && key <= '9') { e.preventDefault(); handleCalculatorInput(key); return; }
        if (['+', '-', '*', '/', '%'].includes(key)) { e.preventDefault(); handleCalculatorInput(key); return; }
        if (key === '.') { e.preventDefault(); handleCalculatorInput('.'); return; }
        if (key === 'Enter') { e.preventDefault(); handleCalculatorInput('='); return; }
        if (key === 'Backspace') { e.preventDefault(); handleCalculatorInput('⌫'); return; }
        if (key === 'Escape') { e.preventDefault(); setShowCalculator(false); return; }
        return;
      }
      if (e.key === 'F1') { e.preventDefault(); customerInputRef.current?.focus(); }
      if (e.key === 'F2') { e.preventDefault(); setShowCalculator(true); }
      if (e.key === 'F3') { e.preventDefault(); alert('Cart held successfully!'); }
      if (e.key === 'F4') { e.preventDefault(); alert('Processing payment...'); }
      if (e.key === 'F5') { e.preventDefault(); productInputRef.current?.focus(); }
      if (e.key === 'F6') { e.preventDefault(); if (cartItems.length > 0 && window.confirm('Cancel current sale?')) setCartItems([]); }
      if (e.key === 'Escape') {
        if (showCustomerResults) setShowCustomerResults(false);
        else if (showProductResults) setShowProductResults(false);
        else if (cartItems.length > 0) {
          if (window.confirm('Cancel current sale?')) setCartItems([]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCalculator, showCustomerResults, showProductResults, cartItems, handleCalculatorInput]);

  const { setToolbarItems } = useToolbar();

  useEffect(() => {
    setToolbarItems([
      {
        icon: <Calculator size={14} />,
        label: ' Calculate',
        action: () => setShowCalculator(true),
        className: 'topbar__qs-btn qs-btn-primary',
      },
      {
        icon: <Barcode size={14} />,
        label: ' Barcode',
        action: () => productInputRef.current?.focus(),
        className: 'topbar__qs-btn qs-btn-outline',
      },
    ]);
    return () => setToolbarItems([]);
  }, [setToolbarItems]);

  return (
    <div className="qs-app">
      <header className="qs-topbar">
        <nav className="qs-tabs">
          <button className="qs-tab active">Quick Sale</button>
          <button className="qs-tab">Orders</button>
        </nav>
      </header>

      <div className="qs-dashboard">
        <div className="qs-main-col">
          <div className="qs-stats-grid">
            <div className="qs-stat-card qs-card-green">
              <div className="qs-stat-top">
                <div className="qs-stat-icon green">
                  <TrendingUp size={17} />
                </div>
                <div className="qs-stat-label">Today&apos;s Total Sale</div>
              </div>
              <div className="qs-stat-body">
                <div className="qs-stat-value">₹ 32,450.00</div>
                <div className="qs-stat-compare">
                  vs Yesterday
                  <span className="qs-change up">
                    <ChevronUp size={12} strokeWidth={3} />
                    12.6%
                  </span>
                </div>
              </div>
            </div>

            <div className="qs-stat-card qs-card-red">
              <div className="qs-stat-top">
                <div className="qs-stat-icon red">
                  <TrendingDown size={17} />
                </div>
                <div className="qs-stat-label">Today&apos;s Total Return / Exchange</div>
              </div>
              <div className="qs-stat-body">
                <div className="qs-stat-value">₹ 1,250.00</div>
                <div className="qs-stat-compare">
                  vs Yesterday
                  <span className="qs-change down">
                    <ChevronDown size={12} strokeWidth={3} />
                    3.1%
                  </span>
                </div>
              </div>
            </div>

            <div className="qs-stat-card qs-card-blue">
              <div className="qs-stat-top">
                <div className="qs-stat-icon blue">
                  <ShoppingCart size={17} />
                </div>
                <div className="qs-stat-label">Today&apos;s Total Item Sale</div>
              </div>
              <div className="qs-stat-body">
                <div className="qs-stat-value">156</div>
                <div className="qs-stat-compare">
                  vs Yesterday
                  <span className="qs-change up">
                    <ChevronUp size={12} strokeWidth={3} />
                    18 Items
                  </span>
                </div>
              </div>
            </div>

            <div className="qs-stat-card qs-card-violet">
              <div className="qs-stat-top">
                <div className="qs-stat-icon violet">
                  <BarChartIcon size={17} />
                </div>
                <div className="qs-stat-label">Today&apos;s Total Profit</div>
              </div>
              <div className="qs-stat-body">
                <div className="qs-stat-value">₹ 12,680.00</div>
                <div className="qs-stat-compare">
                  vs Yesterday
                  <span className="qs-change up">
                    <ChevronUp size={12} strokeWidth={3} />
                    15.3%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="qs-panels-grid">
            <section className="qs-panel">
              <div className="qs-panel-header">
                <div className="qs-panel-title">
                  <Users size={19} />
                  Customer
                </div>
                <button className="qs-chevron-btn" aria-label="Collapse">
                  <ChevronUp size={18} />
                </button>
              </div>
              <div className="qs-input-with-icon" style={{ position: 'relative' }}>
                <span className="qs-left-icon"><Search size={16} /></span>
                <input
                  ref={customerInputRef}
                  type="text"
                  placeholder="Enter customer mobile number or name or GST number"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => customerSearch.trim() && setShowCustomerResults(true)}
                  onBlur={() => setTimeout(() => setShowCustomerResults(false), 200)}
                />
                {showCustomerResults && filteredCustomers.length > 0 && (
                  <div className="qs-search-dropdown">
                    {filteredCustomers.map(c => (
                      <button key={c.id} className="qs-search-dropdown-item" onMouseDown={() => selectCustomer(c)}>
                        <User size={14} />
                        <span>{c.name} <small>{c.mobile}</small></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="qs-divider-or">OR</div>
              <button className="qs-btn-new-customer" onClick={() => alert('New Customer form would open')}>
                <Plus size={15} />
                New Customer
              </button>
              <div className="qs-empty-state">
                <div className="qs-empty-illustration">
                  <FileText size={90} strokeWidth={1.5} />
                </div>
                <div className="qs-empty-title">
                  {selectedCustomer ? selectedCustomer.name : 'No Customer Selected'}
                </div>
                <div className="qs-empty-sub">
                  {selectedCustomer
                    ? `${selectedCustomer.mobile}`
                    : 'Search customer by mobile number, name or GST number to get started.'}
                </div>
              </div>
            </section>

            <section className="qs-panel">
              <div className="qs-panel-header">
                <div className="qs-panel-title">
                  <Package size={19} />
                  Product Search
                </div>
              </div>
              <div className="qs-product-search-input" style={{ position: 'relative' }}>
                <span className="qs-left-icon"><Search size={16} /></span>
                <input
                  ref={productInputRef}
                  type="text"
                  placeholder="Search product by name, code, SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onFocus={() => productResults.length > 0 && setShowProductResults(true)}
                  onBlur={() => setTimeout(() => setShowProductResults(false), 200)}
                />
                <span className="qs-barcode-btn" onClick={() => alert('Barcode scanner activated')}>
                  <Barcode size={17} />
                </span>
                {showProductResults && productResults.length > 0 && (
                  <div className="qs-search-dropdown qs-search-dropdown-wide">
                    {productResults.map(p => (
                      <button key={p.id} className="qs-search-dropdown-item" onMouseDown={() => addToCart(p)}>
                        <Package size={14} />
                        <span><b>{p.name}</b> <small>{p.code} - ₹{p.price}</small></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="qs-empty-state">
                <div className="qs-empty-illustration">
                  <Package size={110} strokeWidth={1.3} />
                </div>
                <div className="qs-empty-title">Search or Scan to add items</div>
                <div className="qs-empty-sub">Type product name, code, SKU or scan barcode to quickly add items to cart</div>
              </div>
            </section>
          </div>

          <section className="qs-recent-items">
            <div className="qs-recent-title">Recent Items</div>
            <div className="qs-recent-grid">
              {RECENT_ITEMS.map(item => (
                <button key={item.id} className="qs-stat-card qs-recent-stat-card" onClick={() => addRecentItem(item)}>
                  <div className={THUMB_CLASSES[item.thumb]}>
                    {THUMB_ICONS[item.thumb]}
                  </div>
                  <div className="qs-recent-item-text">
                    <div className="qs-stat-value-sm">{item.name}</div>
                    <div className="qs-stat-label">{item.code}</div>
                  </div>
                </button>
              ))}
              <button className="qs-stat-card qs-view-all-stat">
                <Grid3X3 size={22} style={{color:'var(--inv-indigo, #5B4FE9)'}} />
                <div className="qs-stat-value-sm" style={{color:'var(--inv-indigo, #5B4FE9)'}}>View All</div>
              </button>
            </div>
          </section>
        </div>

        <aside className="qs-cart-panel">
          <div className="qs-cart-header">
            Cart ({cartItems.length})
            <button onClick={() => { if (cartItems.length > 0 && window.confirm('Clear all items?')) setCartItems([]); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
              <Trash2 size={18} />
            </button>
          </div>

          <div className="qs-cart-body" ref={cartBodyRef}>
            {cartItems.map(item => (
              <div key={item.id} className="qs-cart-item">
                <div className={`qs-cart-thumb ${item.thumb}`}>
                  <Package size={22} />
                </div>
                <div className="qs-cart-item-info">
                  <div className="qs-cart-item-top">
                    <div className="qs-cart-item-name">{item.name}</div>
                    <div className="qs-cart-item-price">₹{item.price.toFixed(2)}</div>
                    <button className="qs-cart-item-close" onClick={() => removeItem(item.id)}>
                      <X size={15} />
                    </button>
                  </div>
                  <div className="qs-cart-item-meta">{item.meta}</div>
                  <div className="qs-cart-item-bottom">
                    <div className="qs-qty-stepper">
                      <button onClick={() => updateQty(item.id, -1)}><Minus size={13} strokeWidth={2.5} /></button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)}><Plus size={13} strokeWidth={2.5} /></button>
                    </div>
                    <div className="qs-cart-item-total">₹{(item.price * item.qty).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
            {cartItems.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--qs-text-gray)' }}>
                Cart is empty. Search or scan products to add.
              </div>
            )}
          </div>

          <div className="qs-cart-summary">
            <div className="qs-summary-row muted">
              <span>Subtotal ({cartItems.length} Items)</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="qs-summary-row muted">
              <span>Discount</span>
              <div className="qs-discount-controls">
                <input className="qs-discount-input" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
                <span className="qs-discount-select" onClick={() => setDiscountType(t => t === '%' ? 'flat' : '%')}>
                  {discountType === '%' ? '%' : '₹'}
                  <ChevronDown size={13} />
                </span>
                <span>−₹{discountAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="qs-summary-row muted">
              <span>Tax (12%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="qs-summary-divider" />
            <div className="qs-grand-total-row">
              <span>Grand Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="qs-cart-actions">
            <div className="qs-action-row">
              <button className="qs-action-btn qs-pay-now" onClick={() => { if (cartItems.length === 0) { alert('Cart is empty'); return; } alert(`Payment of ₹${grandTotal.toFixed(2)} processed!`); }}>
                <CreditCard size={17} />
                Pay Now <span className="qs-shortcut">F5</span>
              </button>
              <button className="qs-action-btn qs-hold" onClick={() => { if (cartItems.length === 0) { alert('Cart is empty'); return; } alert('Cart held successfully!'); }}>
                <Pause size={16} />
                Hold <span className="qs-shortcut">F4</span>
              </button>
            </div>
            <button className="qs-action-btn qs-cancel" onClick={() => { if (cartItems.length === 0) return; if (window.confirm('Cancel current sale?')) setCartItems([]); }}>
              <X size={16} />
              Cancel <span className="qs-shortcut">ESC</span>
            </button>
          </div>

          <div className="qs-payment-methods">
            {[
              { label: 'Cash', icon: <Banknote size={16} />, cls: 'cash' },
              { label: 'UPI', icon: <Zap size={16} />, cls: 'upi' },
              { label: 'Card', icon: <CreditCard size={16} />, cls: 'card' },
              { label: 'Split', icon: <SplitSquareHorizontal size={16} />, cls: 'split' },
            ].map((pm, i) => (
              <button key={i} className={`qs-pm-card ${pm.cls}`} onClick={() => { if (cartItems.length === 0) { alert('Cart is empty'); return; } alert(`Payment via ${pm.label}`); }}>
                <div className={`qs-pm-icon ${pm.cls}`}>{pm.icon}</div>
                <span className="qs-pm-label">{pm.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <footer className="qs-bottom-toolbar">
        {[
          { label: 'Customer', icon: <Users size={16} />, cls: 'customer', shortcut: 'F1', action: () => customerInputRef.current?.focus() },
          { label: 'Discount', icon: <Tag size={16} />, cls: 'discount', shortcut: 'F2', action: () => setShowCalculator(true) },
          { label: 'Hold Cart', icon: <ShoppingCart size={16} />, cls: 'hold', shortcut: 'F3', action: () => { if (cartItems.length === 0) { alert('Cart is empty'); return; } alert('Cart held!'); } },
          { label: 'Payment', icon: <CreditCard size={16} />, cls: 'payment', shortcut: 'F4', action: () => { if (cartItems.length === 0) { alert('Cart is empty'); return; } alert(`Payment of ₹${grandTotal.toFixed(2)}`); } },
          { label: 'Barcode', icon: <Barcode size={16} />, cls: 'barcode', shortcut: 'F5', action: () => productInputRef.current?.focus() },
          { label: 'Cancel', icon: <X size={16} />, cls: 'cancel', shortcut: 'F6', action: () => { if (cartItems.length > 0 && window.confirm('Cancel current sale?')) setCartItems([]); } },
        ].map((btn, i) => (
          <button key={i} className={`qs-action-card ${btn.cls}`} onClick={btn.action}>
            <div className={`qs-action-icon ${btn.cls}`}>{btn.icon}</div>
            <span className="qs-action-label">{btn.label}</span>
            <span className="qs-action-shortcut">{btn.shortcut}</span>
          </button>
        ))}
      </footer>

      {showCalculator && (
        <div className="qs-calc-overlay" onClick={() => setShowCalculator(false)}>
          <div className="qs-calc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qs-calc-header">
              <Calculator size={18} />
              <span>Calculator</span>
              <button className="qs-calc-close" onClick={() => setShowCalculator(false)}><X size={18} /></button>
            </div>
            <div className="qs-calc-display">{calcDisplay}</div>
            <div className="qs-calc-grid">
              {['C', '⌫', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '00', '='].map((key) => (
                <button
                  key={key}
                  className={`qs-calc-btn ${key === '=' ? 'qs-calc-eq' : ''} ${key === 'C' ? 'qs-calc-clear' : ''} ${['+', '-', '*', '/', '%'].includes(key) ? 'qs-calc-op' : ''}`}
                  onClick={() => handleCalculatorInput(key)}
                >
                  {key}
                </button>
              ))}
            </div>
            <div className="qs-calc-footer">
              <button className="qs-calc-apply" onClick={applyCalcResult}>Apply to Discount</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BarChartIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
