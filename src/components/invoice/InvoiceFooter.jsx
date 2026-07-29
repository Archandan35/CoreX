import { useState, useEffect } from 'react';
import Icon from '../ui/Icon.jsx';
import { invoiceService } from '../../services/invoice/index.js';

export default function InvoiceFooter() {
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    invoiceService.getCurrentCompany()
      .then((c) => { if (c?.name) setCompanyName(c.name); })
      .catch(() => {});
  }, []);

  return (
    <footer className="inv-footer">
      <div className="inv-footer-brand">
        <Icon name="bolt" size={18} /> {companyName || 'swipe'}
      </div>
      <div className="inv-footer-right">
        <span>&copy; {new Date().getFullYear()} NextSpeed Technologies Private Limited. All rights reserved.</span>
        <span className="inv-secure">
          <Icon name="shield-check" size={13} /> Data is secured via bank-grade security
        </span>
      </div>
    </footer>
  );
}
