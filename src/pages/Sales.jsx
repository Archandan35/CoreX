import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import { usePermission } from '../identity/authorization/PermissionContext.jsx';
import { PERMISSIONS } from '../identity/rbac/permissions.js';

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

const STATUS_TAB mating = {
  Paid: 'Paid',
  Pending: 'Pending',
  Cancelled: 'Cancelled',
  Drafts: 'Draft',
};

function formatAmount(n) {
  return `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Sales() {
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
    <div className="sales-page">
      {/* Page header */}
      <div className="sales-header">
        <h1 className="sales-header__title">
          Sales
          <span className="sales-header__play-badge" aria-hidden="true">
            <Icon name="play" size={11} fill />
          </span>
        </h1>
        <div className="sales-header__actions">
          <button type="button" className="sales-btn sales-btn--ghost">
            <Icon name="gear" size={17} /> Document Settings
          </button>
          {canCreate && (
            <button type="button" className="sales-btn sales-btn--primary" onClick={onCreateInvoice}>
              <Icon name="plus" size={17} /> Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sales-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`sales-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); setPage(1); }}
          >
            {tab}
            <span className="sales-tab__count">{counts[tab] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="sales-toolbar">
        <div className="sales-search">
          <Icon name="search" size={17} />
          <input
            type="text"
            placeholder="Search by transaction, customers, invoice etc..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            aria-label="Search invoices"
          />
        </div>
        <button type="button" className="sales-btn sales-btn--ghost sales-btn--auto">
          <Icon name="calendar" size={16} /> This Year <Icon name="chevron-down" size={14} />
        </button>
        <button type="button" className="sales-btn sales-btn--ghost sales-btn--auto">
          Actions <Icon name="chevron-down" size={14} />
        </button>
        <button type="button" className="sales-filter-btn" aria-label="Filters">
          <Icon name="sliders-horizontal" size={18} />
        </button>
      </div>

      {/* Table */}
      <div className="sales-table-wrap">
        <table className="sales-table">
          <thead>
            <tr>
              <th>
                <div className="sales-th-flex">
                  Amount
                  <Icon name="chevrons-up-down" size={14} />
                  <Icon name="filter" size={14} />
                </div>
              </th>
              <th>
                <div className="sales-th-flex">
                  Status
                  <Icon name="filter" size={14} />
                </div>
              </th>
              <th>
                <div className="sales-th-flex">
                  Mode
                  <Icon name="filter" size={14} />
                </div>
              </th>
              <th>
                <div className="sales-th-flex">
                  Bill #
                  <Icon name="chevrons-up-down" size={14} />
                  <Icon name="filter" size={14} />
                </div>
              </th>
              <th>Customer</th>
              <th>
                <div className="sales-th-flex">Date <Icon name="chevrons-up-down" size={14} /></div>
                <div className="sales-th-sub">Created time</div>
              </th>
              <th aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr className="sales-table__empty">
                <td colSpan={7}>
                  <div className="sales-empty">
                    <Icon name="search" size={22} />
                    <p>No invoices match your filters.</p>
                  </div>
                </td>
              </tr>
            )}
            {pageRows.map((inv) => (
              <tr key={inv.id}>
                <td className="sales-amount">{formatAmount(inv.amount)}</td>
                <td>
                  <span className={`sales-status sales-status--${inv.status.toLowerCase()}`}>{inv.status}</span>
                </td>
                <td>
                  <div className="sales-mode">
                    {inv.modes.map((m, i) => (
                      <span key={i} className="sales-mode-group">
                        <span className={`sales-status sales-status--${m.kind}`}>{m.label}</span>
                        {m.plus && <span className="sales-plus">{m.plus}</span>}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="sales-bill">{inv.billNo}</div>
                  <div className="sales-bill-sub">{inv.createdBy}</div>
                </td>
                <td>
                  <div className="sales-customer">{inv.customer}</div>
                  <div className="sales-customer-sub">{inv.customerSub}</div>
                </td>
                <td>
                  <div className="sales-date">{inv.dateMain}</div>
                  <div className="sales-date-sub">{inv.dateSub}</div>
                </td>
                <td>
                  <div className="sales-row-actions">
                    <button type="button" className="sales-action sales-action--view">
                      <Icon name="eye" size={14} /> View
                    </button>
                    <button type="button" className="sales-action sales-action--send">
                      <Icon name="send" size={14} /> Send
                    </button>
                    <button type="button" className="sales-more" aria-label="More actions">
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
      <div className="sales-summary-row">
        <div className="sales-summary-pills">
          <div className="sales-pill sales-pill--total">
            <span className="sales-pill__icon"><Icon name="wallet" size={17} /></span>
            <span className="sales-pill__text">
              <span className="sales-pill__label">Total</span>
              <span className="sales-pill__amt">{formatAmount(totals.total)}</span>
            </span>
          </div>
          <div className="sales-pill sales-pill--paid">
            <span className="sales-pill__icon"><Icon name="wallet" size={17} /></span>
            <span className="sales-pill__text">
              <span className="sales-pill__label">Paid</span>
              <span className="sales-pill__amt">{formatAmount(totals.paid)}</span>
            </span>
          </div>
          <div className="sales-pill sales-pill--pending">
            <span className="sales-pill__icon"><Icon name="loader-circle" size={17} /></span>
            <span className="sales-pill__text">
              <span className="sales-pill__label">Pending</span>
              <span className="sales-pill__amt">{formatAmount(totals.pending)}</span>
            </span>
          </div>
        </div>
        <div className="sales-pagination">
          <span>{safePage} / {totalPages}</span>
          <button
            type="button"
            className={`sales-pg-btn ${safePage > 1 ? 'enabled' : ''}`}
            onClick={goPrev}
            disabled={safePage <= 1}
            aria-label="Previous page"
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <button
            type="button"
            className={`sales-pg-btn ${safePage < totalPages ? 'enabled' : ''}`}
            onClick={goNext}
            disabled={safePage >= totalPages}
            aria-label="Next page"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>

      {/* Bottom info cards */}
      <div className="sales-bottom-cards">
        {BOTTOM_CARDS.map((card) => (
          <div className="sales-info-card" key={card.title}>
            <div className="sales-info-card__icon"><Icon name={card.icon} size={22} /></div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
            <button type="button" className="sales-talk-btn">
              Talk to Specialist <Icon name="arrow-right" size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
