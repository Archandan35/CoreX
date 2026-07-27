/**
 * WizardSidebar
 * -------------
 * The left navigation rail: an ordered list of steps, each rendered as a
 * numbered circle (or a check once completed) plus its title and short
 * description. A dashed vertical connector links adjacent circles.
 *
 * Visual states per circle:
 *  - completed: primary fill, white check
 *  - current  : primary fill, white number, row highlighted
 *  - pending  : white fill, gray border, gray number
 *
 * Steps beyond `maxAccessible + 1` are locked (faded, not clickable).
 *
 * Props:
 *  - steps:          [{ id, label, desc, icon }]
 *  - step:           current step index
 *  - completedSteps: Set<number> of completed step indices
 *  - maxAccessible:  highest unlocked step index
 *  - onGoTo:         (index) => void
 */
import Icon from '../../components/ui/Icon.jsx';

export default function WizardSidebar({ steps, step, completedSteps, maxAccessible, onGoTo }) {
  return (
    <aside className="ss-sidebar" aria-label="Setup steps">
      <ol className="ss-step-list">
        {steps.map((s, i) => {
          const isCompleted = completedSteps.has(i);
          const isActive = i === step;
          const isLocked = i > maxAccessible + 1;
          return (
            <li
              key={s.id}
              className={`ss-step-row${isActive ? ' ss-step-active' : ''}`}
              style={{ opacity: isLocked ? 0.45 : 1 }}
            >
              <span className="ss-connector" aria-hidden="true" />
              <button
                type="button"
                className={`ss-num-circle${isCompleted ? ' ss-done' : ''}${isActive ? ' ss-current' : ''}`}
                onClick={() => onGoTo(i)}
                disabled={isLocked}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${s.label}${isCompleted ? ' (completed)' : ''}`}
                style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
              >
                {isCompleted ? <Icon name="check" size={14} /> : i + 1}
              </button>
              <div className="ss-step-text">
                <div className="ss-step-title">{s.label}</div>
                <div className="ss-step-desc">{s.desc}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
