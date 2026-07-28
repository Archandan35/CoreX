import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { usePermission } from '../../identity/authorization/PermissionContext.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

const TABS = ['All', 'Pending', 'Paid', 'Cancelled', 'Drafts'];

const SEED_INVOICES = [
  {
    id: 'INV-157',
    amount: 180.0,
    status: 'Paid',
    modes: [{ label: 'Cash', kind: 'cash', plus: '+1' }],
    billNo: 'INV-157',
    createdBy: 'by Chandan',
    customer: 'SATYAM LIFESTYLE',
    customerSub: '+919668223676',
    dateMain: '21 Jul 2026',
    dateSub: 'Yesterday, 6:00 PM',
    sortIndex: 0,
  },
];

const BOTTOM_CARDS = [
  {
    icon: 'upload-cloud',
    title: 'Bulk Upload Invoices',
    desc: 'Upload invoices at once from Excel or CSV files.',
  },
  {
    icon: 'list-tree',
    title: 'Tally Integration',
    desc: 'Automatically sync your Swipe data with Tally.',
  },
  {
    icon: 'file-text',
    title: 'E-Way Bills',
    desc: 'Generate and manage e-way bills effortlessly.',
  },
];

function formatAmount(n) {
  return `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const VARIANT_TITLES = {
  invoices: 'Invoices',
  'credit-notes': 'Credit Notes',
  'e-invoices': 'E-Invoices',
  subscriptions: 'Subscriptions',
};

export default function Invoices({ variant = 'invoices' }) {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(PERMISSIONS.INVOICE_CREATE);

  const [activeTab, setActiveTab] = useState('All');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEED_INVOICES.filter((inv) => {
      const statusMatch =
        activeTab === 'All'
          ? true
          : activeTab === 'Drafts'
          ? inv.status === 'Draft'
          : inv.status === activeTab;
      const qMatch =
        !q ||
        inv.billNo.toLowerCase().includes(q) ||
        inv.customer.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q);
      return statusMatch && qMatch;
    });
  }, [activeTab, query]);

  const counts = useMemo(() => {
    const c = { All: SEED_INVOICES.length, Pending: 0, Paid: 0, Cancelled: 0, Drafts: 0 };
    SEED_INVOICES.forEach((inv) => {
      const key = inv.status === 'Draft' ? 'Drafts' : inv.status;
      if (c[key] !== undefined) c[key] += 1;
    });
    return c;
  }, []);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, i) => s + i.amount, 0);
    const paid = filtered.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
    const pending = filtered.filter((i) => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
    return { total, paid, pending };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const onCreateInvoice = () => navigate('/invoices/new');

  return (
    <div className="invoice-page">
      {/* Page header */}
      <div className="invoice-header">
        <h1 className="invoice-header__title">
          {VARIANT_TITLES[variant] || 'Invoices'}
          <span className="invoice-header__play-badge" aria-hidden="true">
            <Icon name="play" size={11} fill />
          </span>
        </h1>
        <div className="invoice-header__actions">
          <button type="button" className="invoice-btn invoice-btn--ghost">
            <Icon name="gear" size={17} /> Document Settings
          </button>
          {canCreate && variant === 'invoices' && (
            <button type="button" className="invoice-btn invoice-btn--primary" onClick={onCreateInvoice}>
              <Icon name="plus" size={17} /> Create Invoice
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
        <button type="button" className="invoice-btn invoice-btn--ghost invoice-btn--auto">
          <Icon name="calendar" size={16} /> This Year <Icon name="chevronDown" size={14} />
        </button>
        <button type="button" className="invoice-btn invoice-btn--ghost invoice-btn--auto">
          Actions <Icon name="chevronDown" size={14} />
        </button>
        <button type="button" className="invoice-filter-btn" aria-label="Filters">
          <Icon name="sliders-horizontal" size={18} />
        </button>
      </div>

      {/* Table */}
      <div className="invoice-table-wrap">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>
                <div className="invoice-th-flex">
                  Amount
                  <Icon name="chevrons-up-down" size={14} />
                  <Icon name="filter" size={14} />
                </div>
              </th>
              <th>
                <div className="invoice-th-flex">
                  Status
                  <Icon name="filter" size={14} />
                </div>
              </th>
              <th>
                <div className="invoice-th-flex">
                  Mode
                  <Icon name="filter" size={14} />
                </div>
              </th>
              <th>
                <div className="invoice-th-flex">
                  Bill #
                  <Icon name="chevrons-up-down" size={14} />
                  <Icon name="filter" size={14} />
                </div>
              </th>
              <th>Customer</th>
              <th>
                <div className="invoice-th-flex">Date <Icon name="chevrons-up-down" size={14} /></div>
                <div className="invoice-th-sub">Created time</div>
              </th>
              <th aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr className="invoice-table__empty">
                <td colSpan={7}>
                  <div className="invoice-empty">
                    <Icon name="search" size={22} />
                    <p>No invoices match your filters.</p>
                  </div>
                </td>
              </tr>
            )}
            {pageRows.map((inv) => (
              <tr key={inv.id}>
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
                    <button type="button" className="invoice-action invoice-action--view">
                      <Icon name="eye" size={14} /> View
                    </button>
                    <button type="button" className="invoice-action invoice-action--send">
                      <Icon name="send" size={14} /> Send
                    </button>
                    <button type="button" className="invoice-more" aria-label="More actions">
                      <Icon name="more-vertical" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* Bottom info cards */}
      <div className="invoice-bottom-cards">
        {BOTTOM_CARDS.map((card) => (
          <div className="invoice-info-card" key={card.title}>
            <div className="invoice-info-card__icon"><Icon name={card.icon} size={22} /></div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
            <button type="button" className="invoice-talk-btn">
              Talk to Specialist <Icon name="arrow-right" size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
