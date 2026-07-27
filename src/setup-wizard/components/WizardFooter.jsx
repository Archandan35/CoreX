/**
 * WizardFooter
 * ------------
 * The bottom chrome of the Setup Wizard: a trust message on the left
 * (lock icon + encryption copy) and the version label on the right.
 *
 * Reusable across every step; stateless.
 */
import Icon from '../../components/ui/Icon.jsx';

export default function WizardFooter() {
  return (
    <footer className="ss-footer-bar">
      <div className="ss-foot-left">
        <Icon name="lock" size={14} />
        <span>Your data is safe with us. We use industry-standard encryption.</span>
      </div>
      <div className="ss-foot-right">Setup Wizard v1.0.0</div>
    </footer>
  );
}
