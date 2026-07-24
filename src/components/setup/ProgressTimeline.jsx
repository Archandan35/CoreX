import { memo } from 'react';
import Icon from '../Icon.jsx';

const ProgressTimeline = memo(function ProgressTimeline({ steps, stepsMap, currentStep, completedSteps }) {
  const currentIdx = steps.indexOf(currentStep);

  return (
    <div className="setup-timeline">
      <div className="setup-timeline__header">
        <div className="setup-timeline__icon">U</div>
        <span className="setup-timeline__title">Setup Wizard</span>
      </div>
      <nav className="setup-timeline__nav">
        {steps.map((key) => {
          const s = stepsMap[key];
          const idx = steps.indexOf(key);
          const isComplete = completedSteps.has(key);
          const isCurrent = key === currentStep;
          const isFuture = idx > currentIdx;
          return (
            <div
              key={key}
              className={`setup-timeline__item ${isCurrent ? 'active' : ''} ${isComplete ? 'past' : ''} ${isFuture ? 'future' : ''}`}
            >
              <span className="setup-timeline__dot">
                {isComplete ? <Icon name="check" size={10} /> : s.num}
              </span>
              <span className="setup-timeline__label">{s.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
});

export default ProgressTimeline;
