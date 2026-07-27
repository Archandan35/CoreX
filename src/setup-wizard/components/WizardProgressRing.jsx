/**
 * WizardProgressRing
 * ------------------
 * Reusable circular progress indicator. Renders an SVG ring whose colored
 * arc length is proportional to `value / max`, with the integer percentage
 * centered inside.
 *
 * Props:
 *  - value: current completed count (e.g. step index)
 *  - max:   total count (e.g. last step index)
 *  - size:  pixel diameter of the ring (default 150)
 *
 * The arc is drawn by animating strokeDashoffset from full circumference
 * down to the fraction completed.
 */
import { useMemo } from 'react';

const TRACK_COLOR = '#E7E9EE';
const STROKE = 10;

export default function WizardProgressRing({ value = 0, max = 1, size = 150 }) {
  const radius = (size - STROKE * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const { offset, pct } = useMemo(() => {
    const fraction = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
    return {
      offset: circumference - fraction * circumference,
      pct: Math.round(fraction * 100),
    };
  }, [value, max, circumference]);

  return (
    <div className="ss-progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`Setup ${pct}% complete`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={TRACK_COLOR} strokeWidth={STROKE} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="var(--primary)" strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div className="ss-pct">{pct}%</div>
    </div>
  );
}
