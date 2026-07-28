import Icon from '../ui/Icon.jsx';

export default function InvoiceFooter() {
  return (
    <footer className="inv-footer">
      <div className="inv-footer-brand">
        <Icon name="bolt" size={18} /> swipe
      </div>
      <div className="inv-footer-right">
        <span>&copy; 2026 NextSpeed Technologies Private Limited. All rights reserved.</span>
        <span className="inv-secure">
          <Icon name="shield-check" size={13} /> Data is secured via bank-grade security
        </span>
      </div>
    </footer>
  );
}