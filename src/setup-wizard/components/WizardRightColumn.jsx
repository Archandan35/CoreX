/**
 * WizardRightColumn
 * -----------------
 * The right rail of the Setup Wizard, composed of two reusable cards:
 *
 *  1. "Setup Progress" — the circular progress ring (WizardProgressRing),
 *     the big percentage, and a "X of N completed" caption.
 *  2. "Next step" preview — only when not on the final step; shows the
 *     upcoming step's number, title, description and a decorative arrow.
 *
 * Props:
 *  - step:  current step index
 *  - steps: full step array (used to compute total + next step)
 */
import Icon from '../../components/ui/Icon.jsx';
import WizardProgressRing from './WizardProgressRing.jsx';

export default function WizardRightColumn({ step, steps }) {
  const total = steps.length;
  const completed = step; // number of fully completed steps at this point
  const hasNext = step < total - 1;
  const next = hasNext ? steps[step + 1] : null;

  return (
    <aside className="ss-right-col" aria-label="Setup progress">
      <div className="ss-rc-card">
        <h3>Setup Progress</h3>
        <div className="ss-progress-wrap">
          <WizardProgressRing value={step} max={steps.length - 1} />
          <div className="ss-progress-caption">{completed} of {total} completed</div>
        </div>
      </div>

      {hasNext && (
        <div className="ss-rc-card">
          <div className="ss-next-head">
            <div className="ss-next-num">{step + 2}</div>
            <div className="ss-next-title">{next.label}</div>
          </div>
          <p className="ss-next-desc">{next.desc}</p>
          <div className="ss-illustration-box" aria-hidden="true">
            <Icon name="arrow-right" size={46} />
          </div>
        </div>
      )}
    </aside>
  );
}
