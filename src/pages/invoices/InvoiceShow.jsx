import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceService } from '../../services/invoice/index.js';
import Icon from '../../components/ui/Icon.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import PermissionGate from '../../components/ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

export default function InvoiceShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    invoiceService
      .getInvoice(id)
      .then(setInvoice)
      .catch((err) => setError(err.message || 'Failed to load invoice.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;
  if (error)
    return <div className="page"><div className="alert alert-danger"><Icon name="alert" size={16} />{error}</div></div>;
  if (!invoice) return null;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Invoice {invoice.id}</h1>
        <div className="page__actions">
          <PermissionGate permission={PERMISSIONS.INVOICE_UPDATE}>
            <Button icon="edit" onClick={() => navigate(`/invoices/${id}/edit`)}>
              Edit
            </Button>
          </PermissionGate>
        </div>
      </div>
      <Card>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-item__label">Date</span>
            <span className="detail-item__value">{invoice.invoiceDate}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">Total</span>
            <span className="detail-item__value">{Number(invoice.grandTotal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">Status</span>
            <span className="detail-item__value">{invoice.status}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
