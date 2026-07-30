/** Sidebar: numbered step list with completed/current/pending visual states. */
import Icon from '../../components/ui/Icon.jsx';

export default function WizardSidebar({ steps, step, completedSteps, onGoTo }) {
  return (
    <aside className="ss-sidebar" aria-label="Setup steps">
      <ol className="ss-step-list">
        {steps.map((s, i) => {
          const isCompleted = completedSteps.has(i);
          const isActive = i === step;
          const isLocked = i > step;
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
