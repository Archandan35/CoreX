import Icon from '../ui/Icon.jsx';
import { APP_NAME } from '../../constants/index.js';

export default function InvoiceFooter() {
  return (
    <div className="inv-footer">
      <span className="inv-footer-brand">
        <Icon name="shield-check" size={14} strokeWidth={2} />
        {APP_NAME}
      </span>
      <span className="inv-footer-copyright">
        &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </span>
      <span className="inv-footer-security">
        <Icon name="lock" size={12} strokeWidth={2} />
        Secured with end-to-end encryption
      </span>
    </div>
  );
}