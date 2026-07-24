import { memo } from 'react';

const ColorSwatches = memo(function ColorSwatches({ colors = [], selected, onChange, size = 32 }) {
  return (
    <div className="color-swatches">
      {colors.map((color) => (
        <button
          key={color}
          className={`color-swatch ${selected === color ? 'active' : ''}`}
          style={{ backgroundColor: color, width: size, height: size }}
          onClick={() => onChange?.(color)}
          title={color}
        />
      ))}
    </div>
  );
});

export default ColorSwatches;
