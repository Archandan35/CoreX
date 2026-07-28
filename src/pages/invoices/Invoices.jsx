import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown.jsx';
import { usePermission } from '../../identity/authorization/PermissionContext.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import DocumentSettings from '../../components/invoice/DocumentSettings.jsx';
import { invoiceService } from '../../services/invoice/index.js';
import { notificationManager } from '../../managers/NotificationManager.js';

const TABS = ['All', 'Pending', 'Paid', 'Cancelled', 'Drafts'];

const DATE_RANGES = [
  { key: 'all', label: 'All time' },
  { key: 'this_year', label: 'This Year' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'this_month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
];

const VARIANT_TITLES = {
  invoices: 'Invoices',
  'credit-notes': 'Credit Notes',
  'e-invoices': 'E-Invoices',
  subscriptions: 'Subscriptions',
};

function formatAmount(n) {
  if (n == null || isNaN(n)) return '₹ 0.00';
  return `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return { main: '—', sub: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { main: dateStr, sub: '' };
  const main = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  let sub = '';
  if (diff === 0) sub = 'Today';
  else if (diff === 1) sub = 'Yesterday';
  else if (diff < 7) sub = `${diff} days ago`;
  else sub = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return { main, sub };
}

function getPaymentModes(payments) {
  if (!payments || !payments.length) return [{ label: '—', kind: 'draft', plus: null }];
  return payments.map((p) => ({
    label: p.mode || 'Other',
    kind: (p.mode || '').toLowerCase().replace(/\s+/g, '-'),
    plus: p.amount ? `+${Number(p.amount).toLocaleString('en-IN')}` : null,
  }));
}

function mapInvoice(raw) {
  const payments = raw.payments || [];
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balanceDue = (Number(raw.grandTotal) || 0) - totalPaid;
  let status = (raw.status || 'draft').charAt(0).toUpperCase() + (raw.status || 'draft').slice(1);
  if (status === 'Draft') status = 'Draft';
  else if (status === 'Pending') status = 'Pending';
  else if (totalPaid >= (Number(raw.grandTotal) || 0) && Number(raw.grandTotal) > 0) status = 'Paid';
  else if (status === 'Cancelled') status = 'Cancelled';
  else status = 'Pending';
  const cust = raw.customer || {};
  const dateInfo = formatDate(raw.invoiceDate);
  const billNo = [raw.prefix, raw.invoiceNumber].filter(Boolean).join('-') || raw.id || '—';
  return {
    id: raw.id || billNo,
    amount: Number(raw.grandTotal) || 0,
    status,
    modes: getPaymentModes(payments),
    billNo,
    createdBy: cust.name ? `by ${cust.name.split(' ')[0]}` : '',
    customer: cust.name || '—',
    customerSub: cust.phone || cust.email || '',
    dateMain: dateInfo.main,
    dateSub: dateInfo.sub,
    balanceDue,
    invoiceDate: raw.invoiceDate,
    grandTotal: raw.grandTotal,
    raw,
  };
}

function matchesDateRange(inv, rangeKey) {
  if (rangeKey === 'all' || !rangeKey) return true;
  const d = inv.invoiceDate ? new Date(inv.invoiceDate) : null;
  if (!d || isNaN(d.getTime())) return false;
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfQuarter = (() => { const q = Math.floor(now.getMonth() / 3); return new Date(now.getFullYear(), q * 3, 1); })();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  switch (rangeKey) {
    case 'this_year': return d >= startOfYear;
    case 'this_quarter': return d >= startOfQuarter;
    case 'this_month': return d >= startOfMonth;
    default: return true;
  }
}

export default function Invoices({ variant = 'invoices' }) {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(PERMISSIONS.INVOICE_CREATE);
  const canExport = hasPermission(PERMISSIONS.INVOICE_READ);
  const canDelete = hasPermission(PERMISSIONS.INVOICE_DELETE);

  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [docSettingsOpen, setDocSettingsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dateRange, setDateRange] = useState('this_year');
  const [sortField, setSortField] = useState('invoiceDate');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    invoiceService.listInvoices()
      .then((data) => {
        setAllInvoices(Array.isArray(data) ? data.map(mapInvoice) : []);
      })
      .catch(() => setAllInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allInvoices.filter((inv) => {
      const statusMatch =
        activeTab === 'All' ? true
        : activeTab === 'Drafts' ? inv.status === 'Draft'
        : inv.status === activeTab;
      const qMatch = !q
        || inv.billNo.toLowerCase().includes(q)
        || inv.customer.toLowerCase().includes(q)
        || (inv.id || '').toLowerCase().includes(q)
        || (inv.raw?.reference || '').toLowerCase().includes(q);
      return statusMatch && qMatch && matchesDateRange(inv, dateRange);
    });
  }, [allInvoices, activeTab, query, dateRange]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va, vb;
      if (sortField === 'amount') { va = a.amount; vb = b.amount; }
      else if (sortField === 'billNo') { va = a.billNo; vb = b.billNo; }
      else { va = a.invoiceDate || ''; vb = b.invoiceDate || ''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const toggleSort = useCallback((field) => {
    setSortField(field);
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const counts = useMemo(() => {
    const c = { All: allInvoices.length, Pending: 0, Paid: 0, Cancelled: 0, Drafts: 0 };
    allInvoices.forEach((inv) => {
      const key = inv.status === 'Draft' ? 'Drafts' : inv.status;
      if (c[key] !== undefined) c[key] += 1;
    });
    return c;
  }, [allInvoices]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, i) => s + i.amount, 0);
    const paid = filtered.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
    const pending = filtered.filter((i) => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
    return { total, paid, pending };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const onCreateInvoice = () => navigate('/invoices/new');

  const handleSelectAll = useCallback((e) => {
    if (e.target.checked) setSelectedIds(pageRows.map((r) => r.id));
    else setSelectedIds([]);
  }, [pageRows]);

  const handleSelectOne = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    invoiceService.listInvoices()
      .then((data) => {
        setAllInvoices(Array.isArray(data) ? data.map(mapInvoice) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(`Delete ${selectedIds.length} invoice(s)?`);
    if (!confirmed) return;
    let success = 0;
    for (const id of selectedIds) {
      try { await invoiceService.deleteInvoice(id); success++; } catch {}
    }
    if (success > 0) notificationManager.success('Invoices', `${success} invoice(s) deleted.`);
    handleRefresh();
    setSelectedIds([]);
  }, [selectedIds, handleRefresh]);

  const handleExportCsv = useCallback(async (close) => {
    close();
    try {
      await invoiceService.exportInvoicesCsv({ tab: activeTab, range: dateRange, q: query || undefined });
      notificationManager.success('Export', 'CSV export started. Check your downloads.');
    } catch (e) {
      notificationManager.error('Export', e.message);
    }
  }, [activeTab, dateRange, query]);

  const handleExportPdf = useCallback(async (close) => {
    close();
    try {
      await invoiceService.exportInvoicesPdf({ tab: activeTab, range: dateRange, q: query || undefined });
      notificationManager.success('Export', 'PDF export started. Check your downloads.');
    } catch (e) {
      notificationManager.error('Export', e.message);
    }
  }, [activeTab, dateRange, query]);

  const handleView = useCallback((id) => {
    navigate(`/invoices/${id}`);
  }, [navigate]);

  const handleSend = useCallback((inv, close) => {
    close?.();
    notificationManager.info('Send', `Send invoice ${inv.billNo} — email service will be available soon.`);
  }, []);

  const handleDeleteOne = useCallback(async (inv, close) => {
    close();
    const confirmed = window.confirm(`Delete invoice ${inv.billNo}?`);
    if (!confirmed) return;
    try {
      await invoiceService.deleteInvoice(inv.id);
      notificationManager.success('Invoices', `Invoice ${inv.billNo} deleted.`);
      handleRefresh();
    } catch (e) {
      notificationManager.error('Invoices', e.message);
    }
  }, [handleRefresh]);

  const handleDuplicate = useCallback(async (inv, close) => {
    close();
    try {
      const dup = await invoiceService.duplicateInvoice(inv.id);
      notificationManager.success('Invoices', `Invoice duplicated as ${[dup.prefix, dup.invoiceNumber].filter(Boolean).join('-')}`);
      handleRefresh();
    } catch (e) {
      notificationManager.error('Invoices', e.message);
    }
  }, [handleRefresh]);

  const handleDownloadPdf = useCallback((inv, close) => {
    close();
    notificationManager.info('PDF', `PDF download for ${inv.billNo} will be available once the PDF generation endpoint is configured.`);
  }, []);

  const handlePrint = useCallback((inv, close) => {
    close();
    window.print();
  }, []);

  const title = VARIANT_TITLES[variant] || 'Invoices';

  return (
    <div className="invoice-page">
      {/* Page header */}
      <div className="invoice-header">
        <h1 className="invoice-header__title">
          {title}
          <span className="invoice-header__play-badge" aria-hidden="true">
            <Icon name="play" size={11} fill />
          </span>
        </h1>
        <div className="invoice-header__actions">
          <button type="button" className="invoice-btn invoice-btn--ghost" onClick={() => setDocSettingsOpen(true)}>
            <Icon name="gear" size={17} /> Document Settings
          </button>
          {canCreate && variant === 'invoices' && (
            <button type="button" className="invoice-btn invoice-btn--primary" onClick={onCreateInvoice}>
              <Icon name="plus" size={17} /> Create {variant === 'invoices' ? 'Invoice' : title}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="invoice-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`invoice-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); setPage(1); }}
          >
            {tab}
            <span className="invoice-tab__count">{counts[tab] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="invoice-toolbar">
        <div className="invoice-search">
          <Icon name="search" size={17} />
          <input
            type="text"
            placeholder="Search by transaction, customers, invoice etc..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            aria-label="Search invoices"
          />
        </div>
        <Dropdown
          trigger={
            <button type="button" className="invoice-btn invoice-btn--ghost invoice-btn--auto">
              <Icon name="calendar" size={16} /> {DATE_RANGES.find((r) => r.key === dateRange)?.label || 'Date Range'} <Icon name="chevronDown" size={14} />
            </button>
          }
        >
          {(close) => (
            <div style={{ minWidth: 160 }}>
              {DATE_RANGES.map((r) => (
                <DropdownItem key={r.key} onClick={() => { setDateRange(r.key); close(); }}>
                  {r.label}
                </DropdownItem>
              ))}
            </div>
          )}
        </Dropdown>
        <Dropdown
          trigger={
            <button type="button" className="invoice-btn invoice-btn--ghost invoice-btn--auto">
              Actions <Icon name="chevronDown" size={14} />
            </button>
          }
        >
          {(close) => (
            <div style={{ minWidth: 180 }}>
              {canExport && (
                <DropdownItem onClick={() => handleExportCsv(close)}>
                  <Icon name="download" size={14} /> Export CSV
                </DropdownItem>
              )}
              {canExport && (
                <DropdownItem onClick={() => handleExportPdf(close)}>
                  <Icon name="file-text" size={14} /> Export PDF
                </DropdownItem>
              )}
              <DropdownItem onClick={() => { close(); handleRefresh(); }}>
                <Icon name="refresh-cw" size={14} /> Refresh
              </DropdownItem>
              <DropdownItem onClick={() => { close(); window.print(); }}>
                <Icon name="printer" size={14} /> Print
              </DropdownItem>
              {canDelete && selectedIds.length > 0 && (
                <DropdownItem onClick={() => { close(); handleBulkDelete(); }}>
                  <Icon name="trash-2" size={14} /> Delete ({selectedIds.length})
                </DropdownItem>
              )}
            </div>
          )}
        </Dropdown>
        <button
          type="button"
          className={`invoice-filter-btn${showFilters ? ' invoice-filter-btn--active' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Toggle filters"
        >
          <Icon name="sliders-horizontal" size={18} />
        </button>
      </div>

      {/* Inline Filter Panel */}
      {showFilters && (
        <div className="invoice-filter-panel">
          <div className="invoice-filter-row">
            <label>Sort</label>
            <select
              value={`${sortField}-${sortDir}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-');
                setSortField(f);
                setSortDir(d);
              }}
              className="form-input"
            >
              <option value="invoiceDate-desc">Date (newest)</option>
              <option value="invoiceDate-asc">Date (oldest)</option>
              <option value="amount-desc">Amount (high to low)</option>
              <option value="amount-asc">Amount (low to high)</option>
              <option value="billNo-asc">Bill # (A-Z)</option>
              <option value="billNo-desc">Bill # (Z-A)</option>
            </select>
          </div>
          <button type="button" className="invoice-btn invoice-btn--ghost" onClick={() => { setShowFilters(false); }}>
            <Icon name="x" size={14} /> Close
          </button>
        </div>
      )}

      {/* Table */}
      <div className="invoice-table-wrap">
        {loading ? (
          <div className="invoice-empty" style={{ padding: '60px 20px' }}>
            <div className="spinner" />
            <p>Loading {title.toLowerCase()}...</p>
          </div>
        ) : (
          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === pageRows.length && pageRows.length > 0} />
                </th>
                <th>
                  <div className="invoice-th-flex" style={{ cursor: 'pointer' }} onClick={() => toggleSort('amount')}>
                    Amount
                    <Icon name={sortField === 'amount' && sortDir === 'asc' ? 'chevron-up' : sortField === 'amount' && sortDir === 'desc' ? 'chevron-down' : 'chevrons-up-down'} size={14} />
                  </div>
                </th>
                <th>
                  <div className="invoice-th-flex">
                    Status
                  </div>
                </th>
                <th>
                  <div className="invoice-th-flex">
                    Mode
                  </div>
                </th>
                <th>
                  <div className="invoice-th-flex" style={{ cursor: 'pointer' }} onClick={() => toggleSort('billNo')}>
                    Bill #
                    <Icon name={sortField === 'billNo' && sortDir === 'asc' ? 'chevron-up' : sortField === 'billNo' && sortDir === 'desc' ? 'chevron-down' : 'chevrons-up-down'} size={14} />
                  </div>
                </th>
                <th>Customer</th>
                <th>
                  <div className="invoice-th-flex" style={{ cursor: 'pointer' }} onClick={() => toggleSort('invoiceDate')}>
                    Date <Icon name={sortField === 'invoiceDate' && sortDir === 'asc' ? 'chevron-up' : sortField === 'invoiceDate' && sortDir === 'desc' ? 'chevron-down' : 'chevrons-up-down'} size={14} />
                  </div>
                  <div className="invoice-th-sub">Created time</div>
                </th>
                <th aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr className="invoice-table__empty">
                  <td colSpan={8}>
                    <div className="invoice-empty">
                      <Icon name="search" size={22} />
                      <p>No {title.toLowerCase()} match your filters.</p>
                    </div>
                  </td>
                </tr>
              )}
              {pageRows.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ width: 36 }}>
                    <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => handleSelectOne(inv.id)} />
                  </td>
                  <td className="invoice-amount">{formatAmount(inv.amount)}</td>
                  <td>
                    <span className={`invoice-status invoice-status--${inv.status.toLowerCase()}`}>{inv.status}</span>
                  </td>
                  <td>
                    <div className="invoice-mode">
                      {inv.modes.map((m, i) => (
                        <span key={i} className="invoice-mode-group">
                          <span className={`invoice-status invoice-status--${m.kind}`}>{m.label}</span>
                          {m.plus && <span className="invoice-plus">{m.plus}</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="invoice-bill">{inv.billNo}</div>
                    <div className="invoice-bill-sub">{inv.createdBy}</div>
                  </td>
                  <td>
                    <div className="invoice-customer">{inv.customer}</div>
                    <div className="invoice-customer-sub">{inv.customerSub}</div>
                  </td>
                  <td>
                    <div className="invoice-date">{inv.dateMain}</div>
                    <div className="invoice-date-sub">{inv.dateSub}</div>
                  </td>
                  <td>
                    <div className="invoice-row-actions">
                      <button type="button" className="invoice-action invoice-action--view" title="View" onClick={() => handleView(inv.id)}>
                        <Icon name="eye" size={14} /> View
                      </button>
                      <button type="button" className="invoice-action invoice-action--send" title="Send" onClick={() => handleSend(inv)}>
                        <Icon name="send" size={14} /> Send
                      </button>
                      <Dropdown
                        trigger={
                          <button type="button" className="invoice-more" aria-label="More actions">
                            <Icon name="more-vertical" size={16} />
                          </button>
                        }
                      >
                        {(close) => (
                          <div style={{ minWidth: 160 }}>
                            <DropdownItem onClick={() => handleDownloadPdf(inv, close)}>
                              <Icon name="file-text" size={14} /> Download PDF
                            </DropdownItem>
                            <DropdownItem onClick={() => handlePrint(inv, close)}>
                              <Icon name="printer" size={14} /> Print
                            </DropdownItem>
                            <DropdownItem onClick={() => handleDuplicate(inv, close)}>
                              <Icon name="copy" size={14} /> Duplicate
                            </DropdownItem>
                            <DropdownItem onClick={() => handleSend(inv, close)}>
                              <Icon name="send" size={14} /> Send
                            </DropdownItem>
                            {canDelete && (
                              <DropdownItem onClick={() => handleDeleteOne(inv, close)}>
                                <Icon name="trash-2" size={14} /> Delete
                              </DropdownItem>
                            )}
                          </div>
                        )}
                      </Dropdown>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary + pagination */}
      <div className="invoice-summary-row">
        <div className="invoice-summary-pills">
          <div className="invoice-pill invoice-pill--total">
            <span className="invoice-pill__icon"><Icon name="wallet" size={17} /></span>
            <span className="invoice-pill__text">
              <span className="invoice-pill__label">Total</span>
              <span className="invoice-pill__amt">{formatAmount(totals.total)}</span>
            </span>
          </div>
          <div className="invoice-pill invoice-pill--paid">
            <span className="invoice-pill__icon"><Icon name="wallet" size={17} /></span>
            <span className="invoice-pill__text">
              <span className="invoice-pill__label">Paid</span>
              <span className="invoice-pill__amt">{formatAmount(totals.paid)}</span>
            </span>
          </div>
          <div className="invoice-pill invoice-pill--pending">
            <span className="invoice-pill__icon"><Icon name="loader-circle" size={17} /></span>
            <span className="invoice-pill__text">
              <span className="invoice-pill__label">Pending</span>
              <span className="invoice-pill__amt">{formatAmount(totals.pending)}</span>
            </span>
          </div>
          <div className="invoice-pill invoice-pill--total">
            <span className="invoice-pill__icon"><Icon name="users" size={17} /></span>
            <span className="invoice-pill__text">
              <span className="invoice-pill__label">Count</span>
              <span className="invoice-pill__amt">{filtered.length}</span>
            </span>
          </div>
        </div>
        <div className="invoice-pagination">
          <span>{safePage} / {totalPages}</span>
          <button
            type="button"
            className={`invoice-pg-btn ${safePage > 1 ? 'enabled' : ''}`}
            onClick={goPrev}
            disabled={safePage <= 1}
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <button
            type="button"
            className={`invoice-pg-btn ${safePage < totalPages ? 'enabled' : ''}`}
            onClick={goNext}
            disabled={safePage >= totalPages}
            aria-label="Next page"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>

      {/* Document Settings Panel */}
      <DocumentSettings open={docSettingsOpen} onClose={() => setDocSettingsOpen(false)} />
    </div>
  );
}