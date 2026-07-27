/**
 * WizardShell
 * ------------
 * Reusable outer container for the Setup Wizard: the rounded, shadowed,
 * bordered white card that fills the viewport (minus margins) and arranges
 * its children as a vertical stack (header / body / footer).
 *
 * It renders the header and footer chrome automatically and exposes the
 * middle body region through `children` (which callers fill with the
 * 3-column layout: sidebar, main, right column).
 *
 * This is a pure presentation wrapper — all step/progress state is owned
 * by the parent and passed down to the header/footer as needed.
 */
import WizardHeader from './WizardHeader.jsx';
import WizardFooter from './WizardFooter.jsx';

export default function WizardShell({ children }) {
  return (
    <div className="ss-shell">
      <WizardHeader />
      {children}
      <WizardFooter />
    </div>
  );
}
