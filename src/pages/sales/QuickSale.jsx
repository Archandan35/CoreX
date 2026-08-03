import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Users, Search, Package, ShoppingCart, CreditCard, Zap,
  Calculator, Barcode, Monitor, Grid3X3, ChevronDown, X, Plus, Minus,
  Trash2, Pause, ChevronUp, Tag, Banknote,
  SplitSquareHorizontal, FileText,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { useToolbar } from '../../components/layout/ToolbarContext.jsx';
import { useFullscreen } from '../../components/layout/FullscreenContext.jsx';
import { posService } from '../../services/pos/POSService.js';
import { notificationManager } from '../../managers/NotificationManager.js';

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const THUMB_COLORS = {
  blue: '#3b82f6', navy: '#1e40af', darknavy: '#1e2a4a',
  pink: '#ec4899', leaf: '#22c55e', red: '#ef4444',
  purple: '#8b5cf6', gray: '#9ca3af',
};

function ProductThumb({ color, size = 18 }) {
  const bg = THUMB_COLORS[color] || '#6b7280';
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: '6px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Package size={size} color="#fff" />
    </div>
  );
}

export default function QuickSale() {
  const [cartItems, setCartItems] = useState([]);
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
  const [productSearchFocused, setProductSearchFocused] = useState(false);
  const [recentItems, setRecentItems] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cartBodyRef = useRef(null);
  const customerInputRef = useRef(null);
  const productInputRef = useRef(null);
  const qsAppRef = useRef(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const debouncedCustomerSearch = useDebounce(customerSearch, 300);
  const debouncedProductSearch = useDebounce(productSearch, 300);

  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [setCompanyState] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [settings, company, products, stats, recent] = await Promise.all([
          posService.getSettings(),
          posService.getCompany(),
          posService.searchProducts(''),
          posService.getDashboardStats(),
          posService.getRecentProducts(5),
        ]);

        setCurrencySymbol(posService.getCurrencySymbol(settings));
        setDefaultTaxRate(posService.getDefaultTaxRate(settings, company));
        setCompanyState(posService.getCompanyState(company));
        setAllProducts(products);
        setRecentItems(recent);
        setDashboardStats(stats);
      } catch (e) {
        setError(e.message || 'Failed to load data');
        notificationManager.error('Load Error', e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [setCompanyState]);

  const filteredCustomers = useMemo(() => {
    if (!debouncedCustomerSearch.trim()) return [];
    return posService.searchCustomers(debouncedCustomerSearch);
  }, [debouncedCustomerSearch]);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!debouncedCustomerSearch.trim()) {
        setShowCustomerResults(false);
        return;
      }
      try {
        const results = await posService.searchCustomers(debouncedCustomerSearch);
        setShowCustomerResults(results.length > 0);
      } catch {
        setShowCustomerResults(false);
      }
    };
    fetchCustomers();
  }, [debouncedCustomerSearch]);

  useEffect(() => {
    setShowCustomerResults(filteredCustomers.length > 0 && customerSearch.trim().length > 0);
  }, [filteredCustomers, customerSearch]);

  useEffect(() => {
    if (!debouncedProductSearch.trim()) {
      setProductResults([]);
      setShowProductResults(false);
      return;
    }
    const q = debouncedProductSearch.toLowerCase();
    const results = allProducts.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || p.sku || '').toLowerCase().includes(q) ||
      (p.hsn_code || '').toLowerCase().includes(q)
    );
    setProductResults(results);
    setShowProductResults(true);
  }, [debouncedProductSearch, allProducts]);

  const addToCart = useCallback((product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      const price = posService.calculateProductPrice(product, {});
      const taxRate = posService.calculateTaxRate(product, {});
      return [...prev, {
        id: Date.now(),
        name: product.name,
        code: product.code || product.sku,
        meta: `${product.code || product.sku} | ${product.color || 'Default'} | ${product.size || 'M'}`,
        price: price,
        qty: 1,
        thumb: product.color || 'blue',
        productId: product.id,
        taxRate: taxRate,
      }];
    });
    setProductSearch('');
    setShowProductResults(false);
  }, []);

  const addRecentItem = useCallback((item) => {
    addToCart(item);
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

  const cartWithTotals = useMemo(() => {
    return cartItems.map(item => {
      const { gross, discount: lineDisc, taxable, taxAmount, lineTotal } =
        posService.calculateLineTotal(item.qty, item.price, discountType, 0, item.taxRate || defaultTaxRate);
      return { ...item, gross, lineDisc, taxable, taxAmount, lineTotal };
    });
  }, [cartItems, discountType, defaultTaxRate]);

  const subtotal = useMemo(() =>
    round2Sum(cartWithTotals.map(i => i.gross)),
    [cartWithTotals]
  );

  const discountAmount = useMemo(() => {
    if (discountType === '%') return round2(subtotal * (discount / 100));
    return discount;
  }, [subtotal, discount, discountType]);

  const taxableAmount = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  const tax = useMemo(() => {
    const rate = defaultTaxRate;
    return round2(taxableAmount * (rate / 100));
  }, [taxableAmount, defaultTaxRate]);

  const grandTotal = useMemo(() => taxableAmount + tax, [taxableAmount, tax]);

  const handleCalculatorInput = useCallback((value) => {
    if (value === 'C') {
      setCalcDisplay('0');
      setCalcExpression('');
      setCalcResult(null);
      return;
    }
    if (value === '=') {
      try {
        const result = Function('"use strict"; return (' + calcExpression + ')')();
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
      { type: 'tab', label: 'Quick Sale', className: 'topbar__tab active', action: () => {} },
      { type: 'tab', label: 'Orders', className: 'topbar__tab', action: () => {} },
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
      {
        icon: <Monitor size={14} />,
        label: isFullscreen ? ' Exit Full' : ' Full View',
        action: toggleFullscreen,
        className: 'topbar__qs-btn topbar__view-toggle',
      },
    ]);
    return () => setToolbarItems([]);
  }, [setToolbarItems, isFullscreen, toggleFullscreen]);

  if (loading) {
    return (
      <div className="qs-app" ref={qsAppRef}>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--inv-text-sub, #8B8D9B)' }}>
          Loading POS...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qs-app" ref={qsAppRef}>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--inv-red, #EF4444)' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => `${currencySymbol}${round2(amount).toFixed(2)}`;

  return (
    <div className="qs-app" ref={qsAppRef}>
      <div className="qs-dashboard">
        <div className="qs-main-col">
          {dashboardStats && (
            <div className="qs-stats-grid">
              <div className="qs-stat-card qs-card-green">
                <div className="qs-stat-top">
                  <div className="qs-stat-icon green">
                    <TrendingUp size={17} />
                  </div>
                  <div className="qs-stat-label">Today's Total Sale</div>
                </div>
                <div className="qs-stat-body">
                  <div className="qs-stat-value">{formatCurrency(dashboardStats.totalSale)}</div>
                  <div className="qs-stat-compare">
                    vs Yesterday
                    <span className={`qs-change ${dashboardStats.saleChange >= 0 ? 'up' : 'down'}`}>
                      {dashboardStats.saleChange >= 0 ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
                      {Math.abs(Number(dashboardStats.saleChange))}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="qs-stat-card qs-card-red">
                <div className="qs-stat-top">
                  <div className="qs-stat-icon red">
                    <TrendingDown size={17} />
                  </div>
                  <div className="qs-stat-label">Today's Total Return / Exchange</div>
                </div>
                <div className="qs-stat-body">
                  <div className="qs-stat-value">{formatCurrency(dashboardStats.totalReturn)}</div>
                  <div className="qs-stat-compare">
                    vs Yesterday
                    <span className={`qs-change ${dashboardStats.returnChange >= 0 ? 'down' : 'up'}`}>
                      {dashboardStats.returnChange >= 0 ? <ChevronDown size={12} strokeWidth={3} /> : <ChevronUp size={12} strokeWidth={3} />}
                      {Math.abs(Number(dashboardStats.returnChange))}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="qs-stat-card qs-card-blue">
                <div className="qs-stat-top">
                  <div className="qs-stat-icon blue">
                    <ShoppingCart size={17} />
                  </div>
                  <div className="qs-stat-label">Today's Total Item Sale</div>
                </div>
                <div className="qs-stat-body">
                  <div className="qs-stat-value">{dashboardStats.totalItems}</div>
                  <div className="qs-stat-compare">
                    vs Yesterday
                    <span className="qs-change up">
                      <ChevronUp size={12} strokeWidth={3} />
                      {dashboardStats.itemChange} Items
                    </span>
                  </div>
                </div>
              </div>

              <div className="qs-stat-card qs-card-violet">
                <div className="qs-stat-top">
                  <div className="qs-stat-icon violet">
                    <BarChartIcon size={17} />
                  </div>
                  <div className="qs-stat-label">Today's Total Profit</div>
                </div>
                <div className="qs-stat-body">
                  <div className="qs-stat-value">{formatCurrency(dashboardStats.totalProfit)}</div>
                  <div className="qs-stat-compare">
                    vs Yesterday
                    <span className="qs-change up">
                      <ChevronUp size={12} strokeWidth={3} />
                      {dashboardStats.profitChange}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                        <Users size={14} />
                        <span>{c.name} <small>{c.mobile || c.phone || c.contact_number}</small></span>
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
                    ? `${selectedCustomer.mobile || selectedCustomer.phone || selectedCustomer.contact_number || ''}`
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
              <div className={`qs-product-search-input ${productSearchFocused ? 'search-focused' : ''}`} style={{ position: 'relative' }}>
                <span className="qs-left-icon"><Search size={16} /></span>
                <input
                  ref={productInputRef}
                  type="text"
                  placeholder="Search product by name, code, SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onFocus={() => { setProductSearchFocused(true); productResults.length > 0 && setShowProductResults(true); }}
                  onBlur={() => setTimeout(() => { setShowProductResults(false); setProductSearchFocused(false); }, 200)}
                />
                <span className="qs-barcode-btn" onClick={() => alert('Barcode scanner activated')}>
                  <Barcode size={17} />
                </span>
                {showProductResults && productResults.length > 0 && (
                  <div className="qs-search-dropdown qs-search-dropdown-wide">
                    {productResults.map(p => (
                      <button key={p.id} className="qs-search-dropdown-item" onMouseDown={() => addToCart(p)}>
                        <Package size={14} />
                        <span><b>{p.name}</b> <small>{p.code || p.sku} - {currencySymbol}{posService.calculateProductPrice(p, {})}</small></span>
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
            <div className="qs-recent-title">Recent Sold Items</div>
            <div className="qs-recent-grid">
              {recentItems.map(item => (
                <button key={item.id} className="qs-stat-card qs-recent-stat-card" onClick={() => addRecentItem(item)}>
                  <div className="qs-thumb" style={{ background: THUMB_COLORS[item.color] || '#6b7280' }}>
                    <ProductThumb color={item.color} size={16} />
                  </div>
                  <div className="qs-recent-item-text">
                    <div className="qs-stat-value-sm">{item.name}</div>
                    <div className="qs-stat-label">{item.code || item.sku}</div>
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
            <button onClick={() => { if (cartItems.length > 0 && window.confirm('Clear all items?')) setCartItems([]); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={18} />
            </button>
          </div>

          <div className="qs-cart-body" ref={cartBodyRef}>
            {cartItems.map(item => (
              <div key={item.id} className="qs-cart-item">
                <div className={`qs-cart-thumb ${item.thumb || 'blue'}`}>
                  <ProductThumb color={item.thumb || 'blue'} size={18} />
                </div>
                <div className="qs-cart-item-info">
                  <div className="qs-cart-item-top">
                    <div className="qs-cart-item-name">{item.name}</div>
                    <div className="qs-cart-item-price">{currencySymbol}{item.price.toFixed(2)}</div>
                  </div>
                  <div className="qs-cart-item-meta">{item.meta}</div>
                  <div className="qs-cart-item-bottom">
                    <div className="qs-qty-stepper">
                      <button onClick={() => updateQty(item.id, -1)}><Minus size={13} strokeWidth={2.5} /></button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)}><Plus size={13} strokeWidth={2.5} /></button>
                    </div>
                    <div className="qs-cart-item-total">{currencySymbol}{round2(item.price * item.qty).toFixed(2)}</div>
                  </div>
                </div>
                <button className="qs-cart-item-close" onClick={() => removeItem(item.id)} title="Remove item">
                  <Trash2 size={15} />
                  <span className="sr-only">Clear</span>
                </button>
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
              <span>{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            <div className="qs-summary-row muted">
              <span>Discount</span>
              <div className="qs-discount-controls">
                <span className="qs-discount-type-toggle" onClick={() => setDiscountType(t => t === '%' ? 'flat' : '%')}>
                  {discountType === '%' ? 'Percentage' : 'Fixed'}
                  <ChevronDown size={13} />
                </span>
                <input className="qs-discount-input" type="number" min="0" step="1" value={discount} onChange={(e) => setDiscount(parseInt(e.target.value) || 0)} />
                <span>−{currencySymbol}{discountAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="qs-summary-row muted">
              <span>Tax ({defaultTaxRate}%)</span>
              <span>{currencySymbol}{tax.toFixed(2)}</span>
            </div>
            <div className="qs-summary-divider" />
            <div className="qs-grand-total-row">
              <span>Grand Total</span>
              <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="qs-cart-actions">
            <div className="qs-action-row">
              <button className="qs-action-btn qs-pay-now" onClick={() => { if (cartItems.length === 0) { alert('Cart is empty'); return; } alert(`Payment of ${currencySymbol}${grandTotal.toFixed(2)} processed!`); }}>
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
          { label: 'Payment', icon: <CreditCard size={16} />, cls: 'payment', shortcut: 'F4', action: () => { if (cartItems.length === 0) { alert('Cart is empty'); return; } alert(`${currencySymbol}${grandTotal.toFixed(2)}`); } },
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

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function round2Sum(arr) {
  return arr.reduce((s, n) => s + (round2(n) || 0), 0);
}
