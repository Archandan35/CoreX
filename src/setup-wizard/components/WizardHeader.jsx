/**
 * WizardHeader
 * ------------
 * The top chrome of the Setup Wizard: a lavender gradient bar containing
 * the brand logo tile (database glyph), the wizard title and subtitle, and
 * the right-aligned actions (theme toggle + "Need Help?" pill).
 *
 * Reusable across every step — it has no dependencies on the current step
 * or validation state.
 */
import Icon from '../../components/ui/Icon.jsx';
import ThemeToggle from '../../components/ui/ThemeToggle.jsx';

export default function WizardHeader() {
  return (
    <header className="ss-header">
      <div className="ss-header-left">
        <div className="ss-logo" aria-hidden="true">
          <Icon name="database" size={26} />
        </div>
        <div className="ss-header-title">
          <h1>Setup Wizard</h1>
          <p>Guided setup for your application</p>
        </div>
      </div>
      <div className="ss-header-right">
        <ThemeToggle />
        <button className="ss-btn-help" type="button" aria-label="Need help with setup">
          <Icon name="info" size={16} />
          <span>Need Help?</span>
        </button>
      </div>
    </header>
  );
}
